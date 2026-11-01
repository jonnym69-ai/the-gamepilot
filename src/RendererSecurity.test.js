import path from 'path';
import { pathToFileURL } from 'url';

const { isTrustedRendererUrl, protectWindow, createTrustedIpc } = require('../electron/rendererSecurity');

const INDEX_URL = pathToFileURL(path.join(__dirname, '..', 'dist', 'renderer', 'index.html')).href;
const SCRIPT_URL = ['java', 'script:alert(1)'].join('');

const makeWebContents = (url = INDEX_URL) => {
  const frame = { url };
  const webContents = {
    mainFrame: frame,
    handlers: {},
    openHandler: null,
    setWindowOpenHandler(fn) {
      this.openHandler = fn;
    },
    on(event, fn) {
      (this.handlers[event] = this.handlers[event] || []).push(fn);
    },
    emit(event, ...args) {
      (this.handlers[event] || []).forEach((fn) => fn(...args));
    },
  };
  return webContents;
};

const makeWindow = (webContents) => ({ webContents, isDestroyed: () => false });

const eventFor = (webContents, frame = webContents.mainFrame) => ({ sender: webContents, senderFrame: frame });

describe('isTrustedRendererUrl', () => {
  const env = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = env;
  });

  test('accepts the packaged index URL, including hash routes', () => {
    expect(isTrustedRendererUrl(INDEX_URL)).toBe(true);
    expect(isTrustedRendererUrl(`${INDEX_URL}#/gamebar`)).toBe(true);
  });

  test('rejects other file paths and remote origins', () => {
    const otherFile = pathToFileURL(path.join(__dirname, '..', 'dist', 'renderer', 'other.html')).href;
    expect(isTrustedRendererUrl(otherFile)).toBe(false);
    expect(isTrustedRendererUrl('file:///C:/Windows/System32/evil.html')).toBe(false);
    expect(isTrustedRendererUrl('https://attacker.example')).toBe(false);
    expect(isTrustedRendererUrl('file://attacker@evil.example/x')).toBe(false);
    expect(isTrustedRendererUrl(SCRIPT_URL)).toBe(false);
    expect(isTrustedRendererUrl('not-a-url')).toBe(false);
  });

  test('in development only the exact dev origin is trusted', () => {
    process.env.NODE_ENV = 'development';
    expect(isTrustedRendererUrl('http://localhost:3000')).toBe(true);
    expect(isTrustedRendererUrl('http://localhost:3000/library')).toBe(true);
    expect(isTrustedRendererUrl('http://localhost:3000.evil.example')).toBe(false);
    expect(isTrustedRendererUrl('http://localhost:3001')).toBe(false);
    expect(isTrustedRendererUrl(INDEX_URL)).toBe(false);
  });
});

describe('createTrustedIpc', () => {
  const buildIpc = () => {
    const handlers = {};
    const ipcMain = {
      handle: jest.fn((channel, handler) => {
        handlers[channel] = handler;
      }),
      on: jest.fn((channel, handler) => {
        handlers[channel] = handler;
      }),
    };
    return { ipcMain, handlers };
  };

  test('accepts invokes from the trusted main and overlay windows', async () => {
    const { ipcMain, handlers } = buildIpc();
    const mainContents = makeWebContents();
    const overlayContents = makeWebContents();
    const windows = [makeWindow(mainContents), makeWindow(overlayContents)];
    const guarded = createTrustedIpc(ipcMain, () => windows);
    guarded.handle('channel', async (_event, value) => `ok:${value}`);
    await expect(handlers.channel(eventFor(mainContents), 1)).resolves.toBe('ok:1');
    await expect(handlers.channel(eventFor(overlayContents), 2)).resolves.toBe('ok:2');
  });

  test('rejects foreign webContents, child frames and changed URLs', async () => {
    const { ipcMain, handlers } = buildIpc();
    const trustedContents = makeWebContents();
    const foreignContents = makeWebContents();
    const guarded = createTrustedIpc(ipcMain, () => [makeWindow(trustedContents)]);
    guarded.handle('channel', async () => 'should-not-run');

    await expect(handlers.channel(eventFor(foreignContents))).rejects.toThrow('Untrusted IPC sender');
    // Child frame: senderFrame is not the sender's mainFrame.
    await expect(handlers.channel(eventFor(trustedContents, { url: INDEX_URL }))).rejects.toThrow(
      'Untrusted IPC sender'
    );
    // Same window, but the frame navigated somewhere untrusted.
    trustedContents.mainFrame.url = 'https://attacker.example';
    await expect(handlers.channel(eventFor(trustedContents))).rejects.toThrow('Untrusted IPC sender');
  });

  test('silently drops .on messages from untrusted senders', () => {
    const { ipcMain, handlers } = buildIpc();
    const trustedContents = makeWebContents();
    const foreignContents = makeWebContents();
    const spy = jest.fn();
    const guarded = createTrustedIpc(ipcMain, () => [makeWindow(trustedContents)]);
    guarded.on('channel', spy);
    handlers.channel(eventFor(foreignContents), 'x');
    expect(spy).not.toHaveBeenCalled();
    handlers.channel(eventFor(trustedContents), 'x');
    expect(spy).toHaveBeenCalledWith(expect.anything(), 'x');
  });
});

describe('protectWindow', () => {
  test('blocks navigation to untrusted URLs and webview attach', () => {
    const webContents = makeWebContents();
    const win = makeWindow(webContents);
    protectWindow(win, { openExternal: jest.fn() });

    const nav = { preventDefault: jest.fn() };
    webContents.emit('will-navigate', nav, 'https://attacker.example');
    expect(nav.preventDefault).toHaveBeenCalled();

    const ok = { preventDefault: jest.fn() };
    webContents.emit('will-navigate', ok, INDEX_URL);
    expect(ok.preventDefault).not.toHaveBeenCalled();

    const redirect = { preventDefault: jest.fn() };
    webContents.emit('will-redirect', redirect, 'https://attacker.example');
    expect(redirect.preventDefault).toHaveBeenCalled();

    const attach = { preventDefault: jest.fn() };
    webContents.emit('will-attach-webview', attach);
    expect(attach.preventDefault).toHaveBeenCalled();
  });

  test('popups are denied; only http(s) opens externally', () => {
    const webContents = makeWebContents();
    const win = makeWindow(webContents);
    const shell = { openExternal: jest.fn(() => Promise.resolve()) };
    protectWindow(win, shell);

    expect(webContents.openHandler({ url: 'https://example.com' })).toEqual({ action: 'deny' });
    expect(shell.openExternal).toHaveBeenCalledWith('https://example.com/');

    shell.openExternal.mockClear();
    expect(webContents.openHandler({ url: 'file:///etc/passwd' })).toEqual({ action: 'deny' });
    expect(webContents.openHandler({ url: SCRIPT_URL })).toEqual({ action: 'deny' });
    expect(webContents.openHandler({ url: 'not a url' })).toEqual({ action: 'deny' });
    expect(shell.openExternal).not.toHaveBeenCalled();
  });
});
