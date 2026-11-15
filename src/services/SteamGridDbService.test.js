import SteamGridDbService from './SteamGridDbService';

beforeEach(() => {
  window.electronAPI = { sgdbArt: jest.fn() };
});

afterEach(() => {
  delete window.electronAPI;
});

test('returns artwork items when the request succeeds', async () => {
  window.electronAPI.sgdbArt.mockResolvedValue({ ok: true, items: [{ id: 1, url: 'cover.jpg' }] });
  await expect(SteamGridDbService.getArt(10)).resolves.toEqual([{ id: 1, url: 'cover.jpg' }]);
});

test('surfaces an unavailable response instead of reporting no artwork', async () => {
  window.electronAPI.sgdbArt.mockResolvedValue({ ok: false, error: 'sgdb-unavailable', items: [] });
  await expect(SteamGridDbService.getArt(10)).rejects.toThrow('sgdb-unavailable');
});

test('keeps invalid-key failures distinct', async () => {
  window.electronAPI.sgdbArt.mockResolvedValue({ ok: false, error: 'invalid-key', items: [] });
  await expect(SteamGridDbService.getArt(10)).rejects.toThrow('invalid-key');
});
