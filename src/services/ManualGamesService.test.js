import ManualGamesService, { deriveGameName, MANUAL_GAMES_CHANGED_EVENT } from './ManualGamesService';
import StorageService from './StorageService';

const EXE = 'C:\\Games\\DRM Free\\cool_game-v2.exe';

beforeEach(() => {
  localStorage.clear();
});

describe('deriveGameName', () => {
  test('strips the extension, replaces separators, and title-cases', () => {
    expect(deriveGameName(EXE)).toBe('Cool Game V2');
    expect(deriveGameName('C:\\Games\\hades.exe')).toBe('Hades');
    expect(deriveGameName('/home/user/games/super-meat-boy')).toBe('Super Meat Boy');
    expect(deriveGameName('D:\\CS2.exe')).toBe('CS2');
    expect(deriveGameName('C:\\Games\\My.Game.Name.lnk')).toBe('My Game Name');
  });
});

describe('ManualGamesService', () => {
  test('add persists a manual entry with the expected shape', () => {
    const entry = ManualGamesService.add({ exePath: EXE });

    expect(entry).toMatchObject({
      name: 'Cool Game V2',
      exePath: EXE,
      platform: 'Manual',
      playtimeMinutes: 0,
      source: 'manual',
    });
    expect(entry.id).toMatch(/^manual-cool-game-v2-\d+$/);
    expect(typeof entry.addedAt).toBe('number');

    const stored = StorageService.get('manualGamesV1', []);
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(entry.id);
  });

  test('list and getEntryById read back entries; remove deletes them', () => {
    const first = ManualGamesService.add({ exePath: EXE });
    const second = ManualGamesService.add({ exePath: 'C:\\Games\\other-thing.exe' });

    expect(ManualGamesService.list().map((entry) => entry.id)).toEqual([first.id, second.id]);
    expect(ManualGamesService.getEntryById(second.id)?.name).toBe('Other Thing');

    expect(ManualGamesService.remove(first.id)).toBe(true);
    expect(ManualGamesService.list().map((entry) => entry.id)).toEqual([second.id]);
    expect(ManualGamesService.getEntryById(first.id)).toBeNull();
  });

  test('adding the same exePath twice returns the existing entry', () => {
    const first = ManualGamesService.add({ exePath: EXE });
    const dupe = ManualGamesService.add({ exePath: EXE });

    expect(dupe.id).toBe(first.id);
    expect(ManualGamesService.list()).toHaveLength(1);
  });

  test('add rejects launcher-like names that the library would drop anyway', () => {
    expect(ManualGamesService.add({ exePath: 'C:\\Apps\\Battle.net.exe' })).toBeNull();
    expect(ManualGamesService.list()).toHaveLength(0);
  });

  test('add/remove dispatch the manual-games-changed event', () => {
    const listener = jest.fn();
    window.addEventListener(MANUAL_GAMES_CHANGED_EVENT, listener);
    const entry = ManualGamesService.add({ exePath: EXE });
    expect(listener).toHaveBeenCalledTimes(1);
    ManualGamesService.remove(entry.id);
    expect(listener).toHaveBeenCalledTimes(2);
    window.removeEventListener(MANUAL_GAMES_CHANGED_EVENT, listener);
  });

  test('mergeIntoLibrary appends manual games with launch fields and preserves them across merges', () => {
    const entry = ManualGamesService.add({ exePath: EXE });
    const library = [{ name: 'Hades', platform: 'Steam', appid: 1145360 }];

    const merged = ManualGamesService.mergeIntoLibrary(library);
    const manual = merged.find((game) => game.source === 'manual');

    expect(merged).toHaveLength(2);
    expect(manual).toMatchObject({
      name: 'Cool Game V2',
      platform: 'Manual',
      source: 'manual',
      manualId: entry.id,
      exePath: EXE,
      executablePath: EXE,
      installDir: 'C:\\Games\\DRM Free',
      launch_count: 0,
      last_played: null,
    });

    // A second merge must not duplicate or reset the library copy (playtime
    // tracked onto the library entry survives).
    const withPlaytime = merged.map((game) => (game.source === 'manual' ? { ...game, time_played: 90 } : game));
    const remerged = ManualGamesService.mergeIntoLibrary(withPlaytime);
    expect(remerged).toHaveLength(2);
    expect(remerged.find((game) => game.source === 'manual').time_played).toBe(90);
  });

  test('mergeIntoLibrary skips names already owned and drops records removed from the store', () => {
    const entry = ManualGamesService.add({ exePath: EXE });
    // Same canonical name as an existing Steam entry — owned entry wins.
    ManualGamesService.add({ exePath: 'C:\\Games\\hades-drm.exe' });
    const hadesEntry = ManualGamesService.list().find((candidate) => candidate.id !== entry.id);

    const library = [{ name: 'Hades DRM', platform: 'Steam', appid: 1 }];
    const merged = ManualGamesService.mergeIntoLibrary(library);
    expect(merged).toHaveLength(2); // hades-drm skipped by canonical-name match
    expect(merged.some((game) => game.manualId === entry.id)).toBe(true);
    expect(merged.some((game) => game.manualId === hadesEntry.id)).toBe(false);

    // Removing the manual record removes it from the merged library.
    ManualGamesService.remove(entry.id);
    const afterRemoval = ManualGamesService.mergeIntoLibrary(merged);
    expect(afterRemoval.some((game) => game.source === 'manual')).toBe(false);
  });

  test('mergeIntoLibrary tolerates a manual-only library', () => {
    ManualGamesService.add({ exePath: EXE });
    const merged = ManualGamesService.mergeIntoLibrary([]);
    expect(merged).toHaveLength(1);
    expect(merged[0].source).toBe('manual');
  });
});
