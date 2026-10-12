jest.mock('electron', () => ({ shell: { openExternal: jest.fn() } }), { virtual: true });

const { shell } = require('electron');
const { registerIpcHandlers } = require('../../electron/misc');
let handlers;

beforeEach(() => {
  jest.clearAllMocks();
  handlers = {};
  registerIpcHandlers(
    {
      handle: (name, callback) => {
        handlers[name] = callback;
      },
    },
    { getMainWindow: jest.fn() }
  );
  shell.openExternal.mockResolvedValue(undefined);
});

test('opens only the game library navigation URI', async () => {
  expect(await handlers['open-steam-library']({}, '108600')).toBe(true);
  expect(shell.openExternal).toHaveBeenCalledWith('steam://nav/games/details/108600');
});

test.each(['', '0', '-1', '4294967296', '108600?launch=true', 'steam://run/108600', 108600, null, {}])(
  'rejects invalid app ID %p',
  async (id) => {
    expect(await handlers['open-steam-library']({}, id)).toBe(false);
    expect(shell.openExternal).not.toHaveBeenCalled();
  }
);

test('reports a missing protocol handler without throwing', async () => {
  shell.openExternal.mockRejectedValue(new Error('No Steam client'));
  expect(await handlers['open-steam-library']({}, '108600')).toBe(false);
});
