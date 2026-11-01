import OwnedEnrichmentService from './OwnedEnrichmentService';
import StorageService from './StorageService';

beforeEach(() => {
  localStorage.clear();
});

const owned = (name, source, extra = {}) => ({ name, source, ...extra });

test('matchKeyFor folds editions, articles and punctuation into one key', () => {
  const { matchKeyFor } = OwnedEnrichmentService;
  expect(matchKeyFor('Dishonored: Definitive Edition')).toBe(matchKeyFor('Dishonored'));
  expect(matchKeyFor('The Warriors')).toBe(matchKeyFor('Warriors, The'));
  expect(matchKeyFor('Fallout 3: Game of the Year Edition')).toBe(matchKeyFor('Fallout 3'));
  expect(matchKeyFor('Warcraft® III: Reforged')).toBe(matchKeyFor('Warcraft III Reforged'));
  expect(matchKeyFor('')).toBe('');
  expect(matchKeyFor(null)).toBe('');
});

test('exactTitleKey ignores trademark marks and keeps real characters', () => {
  const { exactTitleKey } = OwnedEnrichmentService;
  expect(exactTitleKey('Warcraft™ III')).toBe(exactTitleKey('Warcraft III'));
  expect(exactTitleKey('猫')).not.toBe(exactTitleKey('犬'));
  expect(exactTitleKey('猫')).toBeTruthy();
});

test('unicode titles that differ in meaning do not match', () => {
  const games = OwnedEnrichmentService.enrichGames([
    owned('猫', 'steam', { appid: 1 }),
    owned('犬', 'epic', { appName: 'x' }),
  ]);
  expect(games[0].alsoOwnedOn).toEqual([]);
  expect(games[0].relatedOwnedOn).toEqual([]);
});

test('matchKeyFor keeps sequels and subtitles distinct', () => {
  const { matchKeyFor } = OwnedEnrichmentService;
  expect(matchKeyFor('Dishonored 2')).not.toBe(matchKeyFor('Dishonored'));
  expect(matchKeyFor('Portal')).not.toBe(matchKeyFor('Portal 2'));
});

test('enrichGames flags exact-title duplicates and possible editions separately', () => {
  const games = enrichFixtures();
  const dishonored = games.find((g) => g.name === 'Dishonored');
  expect(dishonored.alsoOwnedOn).toEqual([]);
  expect(dishonored.relatedOwnedOn).toEqual(['Epic']);
  const dishonoredDef = games.find((g) => g.name === 'Dishonored: Definitive Edition');
  expect(dishonoredDef.alsoOwnedOn).toEqual([]);
  expect(dishonoredDef.relatedOwnedOn).toEqual(['Steam']);
  const solo = games.find((g) => g.name === 'TerraScape');
  expect(solo.alsoOwnedOn).toEqual([]);
  expect(solo.relatedOwnedOn).toEqual([]);
});

test('identical titles differing only in punctuation or articles still match exactly', () => {
  const games = OwnedEnrichmentService.enrichGames([
    owned('The Warriors', 'steam', { appid: 1 }),
    owned('Warriors, The', 'gog', { gogProductId: 'g' }),
    owned('Pen & Paper', 'epic', { appName: 'pp' }),
    owned('Pen and Paper', 'steam', { appid: 2 }),
  ]);
  expect(games[0].alsoOwnedOn).toEqual(['GOG']);
  expect(games[1].alsoOwnedOn).toEqual(['Steam']);
  expect(games[2].alsoOwnedOn).toEqual(['Steam']);
  expect(games[3].alsoOwnedOn).toEqual(['Epic']);
  games.forEach((g) => expect(g.relatedOwnedOn).toEqual([]));
});

test('sequels, VR, remasters and collections are never the same title', () => {
  const games = OwnedEnrichmentService.enrichGames([
    owned('Portal', 'steam', { appid: 1 }),
    owned('Portal 2', 'epic', { appName: 'p2' }),
    owned('Skyrim', 'steam', { appid: 2 }),
    owned('Skyrim VR', 'gog', { gogProductId: 'g1' }),
    owned('Doom', 'steam', { appid: 3 }),
    owned('Doom Remastered', 'epic', { appName: 'dr' }),
  ]);
  const byName = Object.fromEntries(games.map((g) => [g.name, g]));
  expect(byName['Portal'].alsoOwnedOn).toEqual([]);
  expect(byName['Portal'].relatedOwnedOn).toEqual([]);
  expect(byName['Portal 2'].alsoOwnedOn).toEqual([]);
  expect(byName['Portal 2'].relatedOwnedOn).toEqual([]);
  expect(byName['Skyrim'].alsoOwnedOn).toEqual([]);
  expect(byName['Skyrim'].relatedOwnedOn).toEqual(['GOG']);
  expect(byName['Doom'].alsoOwnedOn).toEqual([]);
  expect(byName['Doom'].relatedOwnedOn).toEqual(['Epic']);
});

test('titles that normalize to an empty exact key cannot match each other', () => {
  const games = OwnedEnrichmentService.enrichGames([
    owned('★', 'steam', { appid: 1 }),
    owned('☆', 'epic', { appName: 'x' }),
  ]);
  expect(games[0].alsoOwnedOn).toEqual([]);
  expect(games[0].relatedOwnedOn).toEqual([]);
});

const enrichFixtures = () =>
  OwnedEnrichmentService.enrichGames([
    owned('Dishonored', 'steam', { appid: 1, playtimeForever: 300 }),
    owned('Dishonored: Definitive Edition', 'epic', { appName: 'dishdef' }),
    owned('TerraScape', 'gog', { gogProductId: 'g1' }),
  ]);

test('recordSeenGiveaways then enrichGames tags freebies by title', () => {
  OwnedEnrichmentService.recordSeenGiveaways([
    { title: 'TerraScape', platform: 'Epic Games Store', source: 'Epic', endDate: '2026-10-30T00:00:00Z' },
  ]);
  const games = OwnedEnrichmentService.enrichGames([owned('TerraScape', 'epic', { appName: 'terra' })]);
  expect(games[0].freebie).toMatchObject({ platform: 'Epic Games Store' });
  expect(games[0].probableFreebie).toBe(false);
});

test('giveaway memory normalizes platforms for display', () => {
  OwnedEnrichmentService.recordSeenGiveaways([
    { title: 'Quiet Meadow', platform: 'PC, Itch.io, DRM-Free', source: 'GamerPower' },
  ]);
  const games = OwnedEnrichmentService.enrichGames([owned('Quiet Meadow', 'itch', { itchId: 'i1' })]);
  expect(games[0].freebie?.platform).toBe('Itch.io');
});

test('probableFreebie is never inferred — being unplayed on Epic proves nothing', () => {
  const games = OwnedEnrichmentService.enrichGames([
    owned('Some Epic Claim', 'epic', { appName: 'claim', playtimeForever: 0 }),
    owned('Played Epic Game', 'epic', { appName: 'played', playtimeForever: 600 }),
    owned('Some Steam Game', 'steam', { appid: 9, playtimeForever: 0 }),
  ]);
  expect(games[0].probableFreebie).toBe(false);
  expect(games[1].probableFreebie).toBe(false);
  expect(games[2].probableFreebie).toBe(false);
});

test('a remembered giveaway for a different edition does not tag the owned title', () => {
  OwnedEnrichmentService.recordSeenGiveaways([
    { title: 'Dishonored: Definitive Edition', platform: 'Epic Games Store', source: 'Epic' },
  ]);
  const games = OwnedEnrichmentService.enrichGames([
    owned('Dishonored', 'steam', { appid: 1 }),
    owned('Dishonored: Definitive Edition', 'epic', { appName: 'd' }),
  ]);
  expect(games[0].freebie).toBeNull();
  expect(games[1].freebie).toMatchObject({ platform: 'Epic Games Store' });
});

test('a different-edition offer does not rewrite a remembered platform', () => {
  OwnedEnrichmentService.recordSeenGiveaways([{ title: 'Skyrim', platform: 'Epic Games Store', source: 'Epic' }]);
  OwnedEnrichmentService.recordSeenGiveaways([{ title: 'Skyrim VR', platform: 'GOG', source: 'GOG' }]);
  const games = OwnedEnrichmentService.enrichGames([owned('Skyrim', 'steam', { appid: 1 })]);
  expect(games[0].freebie).toMatchObject({ platform: 'Epic Games Store' });
});

test('duplicate detection is symmetric and dedupes source labels', () => {
  const games = OwnedEnrichmentService.enrichGames([
    owned('Game', 'epic', { appName: 'a' }),
    owned('Game', 'epic', { appName: 'b' }),
    owned('Game', 'gog', { gogProductId: 'c' }),
  ]);
  expect(games[0].alsoOwnedOn).toEqual(['GOG']);
  expect(games[2].alsoOwnedOn).toEqual(['Epic']);
});

test('enrichGames returns empty for empty input and tolerates junk', () => {
  expect(OwnedEnrichmentService.enrichGames([])).toEqual([]);
  const out = OwnedEnrichmentService.enrichGames([owned(null, 'epic'), owned('Fine', 'steam')]);
  expect(out[1].alsoOwnedOn).toEqual([]);
});

test('memory write stores under the persistent key', () => {
  OwnedEnrichmentService.recordSeenGiveaways([{ title: 'Kept Game', source: 'Epic' }]);
  const stored = StorageService.get('freebieMemoryV1', {});
  expect(stored['kept game']?.title).toBe('Kept Game');
});
