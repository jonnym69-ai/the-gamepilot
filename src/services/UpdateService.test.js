import UpdateService from './UpdateService';

describe('UpdateService', () => {
  afterEach(() => {
    delete window.electronAPI;
    jest.clearAllMocks();
  });

  test('degrades gracefully when the Electron bridge is absent', async () => {
    expect(UpdateService.isSupported()).toBe(false);
    await expect(UpdateService.check()).resolves.toMatchObject({ ok: false, reason: 'unavailable' });
    await expect(UpdateService.download()).resolves.toMatchObject({ ok: false, reason: 'unavailable' });
    await expect(UpdateService.install()).resolves.toMatchObject({ ok: false, reason: 'unavailable' });
    await expect(UpdateService.getState()).resolves.toMatchObject({ ok: false, status: 'idle' });
    expect(UpdateService.onStatus(() => {})).toBeInstanceOf(Function);
  });

  test('check forwards to the bridge', async () => {
    window.electronAPI = {
      updaterCheck: jest.fn().mockResolvedValue({ ok: true, status: 'available', version: '2.0.0' }),
    };

    await expect(UpdateService.check()).resolves.toEqual({ ok: true, status: 'available', version: '2.0.0' });
    expect(window.electronAPI.updaterCheck).toHaveBeenCalledTimes(1);
  });

  test('bridge rejections become error results instead of throwing', async () => {
    window.electronAPI = {
      updaterCheck: jest.fn().mockRejectedValue(new Error('ipc down')),
      updaterGetState: jest.fn().mockRejectedValue(new Error('ipc down')),
    };

    await expect(UpdateService.check()).resolves.toMatchObject({ ok: false, status: 'error', error: 'ipc down' });
    await expect(UpdateService.getState()).resolves.toMatchObject({ ok: false, status: 'error' });
  });

  test('onStatus forwards pushed events and returns an unsubscribe', () => {
    const unsubscribe = jest.fn();
    window.electronAPI = { onUpdaterStatus: jest.fn().mockReturnValue(unsubscribe) };
    const callback = jest.fn();

    const off = UpdateService.onStatus(callback);

    expect(window.electronAPI.onUpdaterStatus).toHaveBeenCalledWith(callback);
    off();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
