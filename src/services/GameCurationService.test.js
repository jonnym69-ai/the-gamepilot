import { GameCurationService } from './GameCurationService';

const { setMetadataOverride, getMetadataOverride, clearMetadataOverride, enrichGame } = GameCurationService;

beforeEach(() => {
  localStorage.clear();
});

describe('metadataOverridesV1', () => {
  test('setMetadataOverride merges patches and reads back', () => {
    setMetadataOverride('Hades', { sortName: 'Hades (2018)', genres: ['Action', 'Roguelike'] });
    expect(getMetadataOverride('Hades')).toEqual({ sortName: 'Hades (2018)', genres: ['Action', 'Roguelike'] });

    setMetadataOverride('Hades', { developer: 'Supergiant Games' });
    expect(getMetadataOverride('Hades')).toEqual({
      sortName: 'Hades (2018)',
      genres: ['Action', 'Roguelike'],
      developer: 'Supergiant Games',
    });
  });

  test('empty strings/arrays delete the field; a fully emptied override deletes the key', () => {
    setMetadataOverride('Hades', { sortName: 'Hades (2018)', genres: ['Action'] });
    setMetadataOverride('Hades', { sortName: '' });
    expect(getMetadataOverride('Hades')).toEqual({ genres: ['Action'] });

    setMetadataOverride('Hades', { genres: [] });
    expect(getMetadataOverride('Hades')).toBeNull();
    expect(localStorage.getItem('gamepilot-metadataOverridesV1')).toBe('{}');
  });

  test('clearMetadataOverride removes the entry and ignores unknown keys', () => {
    setMetadataOverride('Hades', { sortName: 'Hades (2018)' });
    clearMetadataOverride('Hades');
    expect(getMetadataOverride('Hades')).toBeNull();
    clearMetadataOverride('Never Set'); // no throw
  });

  test('unknown fields are ignored and releaseYear is validated', () => {
    setMetadataOverride('Hades', { bogus: 'x', releaseYear: 1800 });
    expect(getMetadataOverride('Hades')).toBeNull();

    const maxYear = new Date().getFullYear() + 2;
    setMetadataOverride('Hades', { releaseYear: 1999 });
    setMetadataOverride('Hades', { releaseYear: maxYear + 1 });
    expect(getMetadataOverride('Hades')).toEqual({ releaseYear: 1999 });
  });

  test('genre/tag lists are trimmed and deduped', () => {
    setMetadataOverride('Hades', { genres: [' RPG ', 'RPG', 'Action'], tags: [' cozy ', 'cozy'] });
    expect(getMetadataOverride('Hades')).toEqual({ genres: ['RPG', 'Action'], tags: ['cozy'] });
  });
});

describe('enrichGame metadata application', () => {
  test('applies override fields and snapshots scanned values', () => {
    setMetadataOverride('Witcher', {
      sortName: 'Witcher 3, The',
      genres: ['Adventure'],
      tags: ['story-rich'],
      releaseYear: 2016,
      developer: 'New Dev',
      publisher: 'New Pub',
    });
    const enriched = enrichGame({
      name: 'Witcher',
      genres: ['RPG'],
      releaseYear: 2015,
      developer: 'CDPR',
      publisher: 'CDP',
    });

    expect(enriched.sortName).toBe('Witcher 3, The');
    expect(enriched.genres).toEqual(['Adventure']);
    expect(enriched.genresOverridden).toBe(true);
    expect(enriched.userTags).toEqual(['story-rich']);
    expect(enriched.releaseYear).toBe(2016);
    expect(enriched.developer).toBe('New Dev');
    expect(enriched.publisher).toBe('New Pub');
    expect(enriched.scanned).toEqual({
      genres: ['RPG'],
      releaseYear: 2015,
      developer: 'CDPR',
      publisher: 'CDP',
    });
  });

  test('re-enriching an enriched game keeps the original scanned snapshot', () => {
    setMetadataOverride('Witcher', { genres: ['Adventure'] });
    const once = enrichGame({ name: 'Witcher', genres: ['RPG'] });
    const twice = enrichGame(once);

    expect(twice.genres).toEqual(['Adventure']);
    expect(twice.scanned.genres).toEqual(['RPG']);
  });

  test('no override → scanned untouched and genres pass through', () => {
    const enriched = enrichGame({ name: 'Witcher', genres: ['RPG'], releaseYear: 2015 });
    expect(enriched.scanned).toBeUndefined();
    expect(enriched.genres).toEqual(['RPG']);
    expect(enriched.genresOverridden).toBeUndefined();
  });

  test('clearing the override reverts enrichment', () => {
    setMetadataOverride('Witcher', { genres: ['Adventure'] });
    clearMetadataOverride('Witcher');
    const enriched = enrichGame({ name: 'Witcher', genres: ['RPG'] });
    expect(enriched.genres).toEqual(['RPG']);
    expect(enriched.scanned).toBeUndefined();
  });
});
