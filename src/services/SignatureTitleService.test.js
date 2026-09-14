// SignatureTitleService.test.js
import SignatureTitleService from './SignatureTitleService';
import StorageService from './StorageService';

jest.mock('./StorageService', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      _store: store,
      get: jest.fn((key, def) => (store.has(key) ? store.get(key) : def)),
      set: jest.fn((key, value) => {
        store.set(key, value);
        return true;
      }),
      remove: jest.fn((key) => {
        store.delete(key);
        return true;
      }),
    },
  };
});

const hours = (h) => h * 60;

beforeEach(() => {
  StorageService._store.clear();
});

describe('SignatureTitleService', () => {
  test('unlocks a curated title when a matching game passes the threshold', () => {
    const titles = SignatureTitleService.getSignatureTitles([{ name: 'Project Zomboid', time_played: hours(40) }]);
    const zomboid = titles.find((t) => t.id === 'sig_zomboid_survivor');
    expect(zomboid.unlocked).toBe(true);
    expect(zomboid.gameName).toBe('Project Zomboid');
  });

  test('keeps a curated title locked below the threshold with a progress hint', () => {
    const titles = SignatureTitleService.getSignatureTitles([{ name: 'Project Zomboid', time_played: hours(10) }]);
    const zomboid = titles.find((t) => t.id === 'sig_zomboid_survivor');
    expect(zomboid.unlocked).toBe(false);
    expect(zomboid.progressPercent).toBe(40);
    expect(zomboid.unlockHint).toContain('Project Zomboid');
  });

  test('combines minutes across a matched series', () => {
    const titles = SignatureTitleService.getSignatureTitles([
      { name: 'Elden Ring', time_played: hours(15) },
      { name: 'Dark Souls III', time_played: hours(15) },
    ]);
    const souls = titles.find((t) => t.id === 'sig_let_me_solo_her');
    expect(souls.unlocked).toBe(true);
    expect(souls.earnedMinutes).toBe(hours(30));
  });

  test('generates devotion titles for uncurated games with deep play', () => {
    const titles = SignatureTitleService.getSignatureTitles([{ name: 'Obscure Indie Gem', time_played: hours(60) }]);
    const devotee = titles.find((t) => t.name === 'Obscure Indie Gem Devotee');
    expect(devotee).toBeDefined();
    expect(devotee.unlocked).toBe(true);
    expect(devotee.signature).toBe(true);
  });

  test('generated legend tier outranks devotee at 150h+', () => {
    const titles = SignatureTitleService.getSignatureTitles([{ name: 'Obscure Indie Gem', time_played: hours(200) }]);
    expect(titles.find((t) => t.name === 'Obscure Indie Gem Legend')).toBeDefined();
    expect(titles.find((t) => t.name === 'Obscure Indie Gem Devotee')).toBeUndefined();
  });

  test('does not generate devotion titles for games covered by a curated title', () => {
    const titles = SignatureTitleService.getSignatureTitles([{ name: 'Project Zomboid', time_played: hours(200) }]);
    expect(titles.filter((t) => /Zomboid/.test(t.name))).toHaveLength(1);
  });

  test('reads the library from storage when none is passed', () => {
    StorageService.set('library', [{ name: 'Stardew Valley', time_played: hours(80) }]);
    const titles = SignatureTitleService.getSignatureTitles();
    expect(titles.find((t) => t.id === 'sig_valley_farmer').unlocked).toBe(true);
  });

  test('sorts unlocked titles first, then closest to unlocking', () => {
    const titles = SignatureTitleService.getSignatureTitles([
      { name: 'Project Zomboid', time_played: hours(40) },
      { name: 'Stardew Valley', time_played: hours(24) },
      { name: 'Hollow Knight', time_played: hours(2) },
    ]);
    const firstLocked = titles.findIndex((t) => !t.unlocked);
    expect(titles.findIndex((t) => t.id === 'sig_zomboid_survivor')).toBeLessThan(firstLocked);
    const locked = titles.filter((t) => !t.unlocked);
    expect(locked[0].id).toBe('sig_valley_farmer');
  });

  test('getTitleForGame returns the earned title for a game', () => {
    const library = [{ name: 'Hades', time_played: hours(90) }];
    expect(SignatureTitleService.getTitleForGame('Hades', library)?.name).toBe('Death Defier');
    expect(SignatureTitleService.getTitleForGame('Not Played', library)).toBeNull();
  });
});
