const path = require('path');
const { pathToFileURL } = require('url');

const rendererFile = pathToFileURL(path.join(__dirname, '..', 'dist', 'renderer', 'index.html'));

function isTrustedRendererUrl(value) {
  try {
    const url = new URL(value);
    if (url.username || url.password) return false;
    if (process.env.NODE_ENV === 'development') return url.origin === 'http://localhost:3000';
    return url.protocol === 'file:' && url.host === rendererFile.host && url.pathname === rendererFile.pathname;
  } catch {
    return false;
  }
}

function protectWindow(window, shell) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (['https:', 'http:'].includes(parsed.protocol)) shell.openExternal(parsed.href).catch(() => {});
    } catch {}
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (!isTrustedRendererUrl(url)) event.preventDefault();
  });
  window.webContents.on('will-redirect', (event, url) => {
    if (!isTrustedRendererUrl(url)) event.preventDefault();
  });
  window.webContents.on('will-attach-webview', (event) => event.preventDefault());
}

function createTrustedIpc(ipcMain, getWindows) {
  const trusted = (event) => {
    try {
      return (
        getWindows().some((win) => win && !win.isDestroyed() && win.webContents === event.sender) &&
        event.senderFrame === event.sender.mainFrame &&
        isTrustedRendererUrl(event.senderFrame.url)
      );
    } catch {
      return false;
    }
  };
  return {
    handle(channel, handler) {
      return ipcMain.handle(channel, async (event, ...args) => {
        if (!trusted(event)) throw new Error('Untrusted IPC sender');
        return handler(event, ...args);
      });
    },
    on(channel, handler) {
      return ipcMain.on(channel, (event, ...args) => {
        if (trusted(event)) return handler(event, ...args);
      });
    },
  };
}

module.exports = { isTrustedRendererUrl, protectWindow, createTrustedIpc };
