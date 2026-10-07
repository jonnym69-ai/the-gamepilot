import IgdbArtworkService from './IgdbArtworkService';

jest.mock('./GameArtworkService', () => ({
  hasMissingCoverArt: jest.fn((game) => !game.coverImage && !game.appid),
}));

const makeGame = (overrides = {}) => ({ name: 'Test Game', platform: 'Epic', ...overrides });

const igdbGame = {
  id: 17000,
  name: 'Stardew Valley',
  cover: { card: 'https://images.igdb.com/igdb/image/upload/t_cover_big/x.jpg' },
  gameModes: ['Single player'],
  genres: ['Farming'],
  releaseDate: 1456358400000,
  summary: 'A farming sim.',
};

beforeEach(() => {
  localStorage.clear();
  window.electronAPI = { igdbLookup: jest.fn() };
});

afterEach(() => {
  delete window.electronAPI;
});

describe('IgdbArtworkService', () => {
  it('is disabled by default', () => {
    expect(IgdbArtworkService.isEnabled()).toBe(false);
  });

  it('does nothing when disabled', async () => {
    const library = [makeGame()];
    const result = await IgdbArtworkService.enrichLibraryCovers(library);
    expect(result).toBeNull();
    expect(window.electronAPI.igdbLookup).not.toHaveBeenCalled();
  });

  it('fills coverImage on games missing artwork', async () => {
    IgdbArtworkService.setEnabled(true);
    window.electronAPI.igdbLookup.mockResolvedValue({ ok: true, game: igdbGame });

    const library = [makeGame({ name: 'Stardew Valley' })];
    const result = await IgdbArtworkService.enrichLibraryCovers(library);

    expect(result).not.toBeNull();
    expect(result[0].coverImage).toBe(igdbGame.cover.card);
    expect(result[0].igdbId).toBe(17000);
  });

  it('skips games that already resolve artwork', async () => {
    IgdbArtworkService.setEnabled(true);
    const library = [makeGame({ appid: '413150' }), makeGame({ coverImage: 'x.png' })];
    const result = await IgdbArtworkService.enrichLibraryCovers(library);
    expect(result).toBeNull();
    expect(window.electronAPI.igdbLookup).not.toHaveBeenCalled();
  });

  it('never overwrites a custom cover override', async () => {
    IgdbArtworkService.setEnabled(true);
    const library = [makeGame({ coverArtOverride: 'data:image/png;base64,custom' })];
    const result = await IgdbArtworkService.enrichLibraryCovers(library);
    expect(result).toBeNull();
    expect(window.electronAPI.igdbLookup).not.toHaveBeenCalled();
  });

  it('caches misses so they do not re-query', async () => {
    IgdbArtworkService.setEnabled(true);
    window.electronAPI.igdbLookup.mockResolvedValue({ ok: true, game: null });

    const library = [makeGame({ name: 'Obscure Game Nobody Has' })];
    await IgdbArtworkService.enrichLibraryCovers(library);
    const second = await IgdbArtworkService.enrichLibraryCovers(library);

    expect(window.electronAPI.igdbLookup).toHaveBeenCalledTimes(1);
    expect(second).toBeNull();
  });

  it('applies cached covers without a network call', async () => {
    IgdbArtworkService.setEnabled(true);
    window.electronAPI.igdbLookup.mockResolvedValue({ ok: true, game: igdbGame });

    await IgdbArtworkService.enrichLibraryCovers([makeGame({ name: 'Stardew Valley' })]);

    // Fresh library object — same name — should hit the persisted cache
    const freshLibrary = [makeGame({ name: 'Stardew Valley' })];
    const result = await IgdbArtworkService.enrichLibraryCovers(freshLibrary);
    expect(window.electronAPI.igdbLookup).toHaveBeenCalledTimes(1);
    expect(result[0].coverImage).toBe(igdbGame.cover.card);
  });

  it('returns null when the bridge is missing', async () => {
    IgdbArtworkService.setEnabled(true);
    delete window.electronAPI;
    const result = await IgdbArtworkService.lookup('Anything');
    expect(result.found).toBe(false);
  });
});
