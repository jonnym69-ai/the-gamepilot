import BuyRecommendationService from './BuyRecommendationService';
import StorageService from './StorageService';
import { GamingIdentity } from '../GamingIdentity';
import { UserBehaviorProfile } from './UserBehaviorProfile';
import { GameRatingService } from './GameRatingService';
import { GamingPersonaService } from './GamingPersonaService';
import { RecommendationEngine } from './RecommendationEngine';

jest.mock('./RecommendationWeights', () => ({
  getFamiliarityBias: jest.fn(() => null),
}));

const playedLibrary = [
  { name: 'Project Zomboid', appid: 108600, genres: ['Survival', 'Horror'], time_played: 1200 },
  { name: 'Valheim', appid: 892970, genres: ['Survival', 'Crafting'], time_played: 600 },
  { name: 'Stardew Valley', appid: 413150, genres: ['Cozy', 'Farming'], time_played: 300 },
];

const unplayedLibrary = [
  { name: 'Dusty Shelf', appid: 111, genres: ['Survival', 'Crafting', 'Building'], time_played: 0 },
  { name: 'Old Horror', appid: 222, genres: ['Horror'], time_played: 0 },
];

const library = [...playedLibrary, ...unplayedLibrary];

const item = (name, overrides = {}) => ({
  name,
  appid: `wl-${name}`,
  platform: 'Wishlist',
  genres: [],
  ...overrides,
});

beforeEach(() => {
  jest
    .spyOn(StorageService, 'getString')
    .mockImplementation((key) => (key === 'buyRecommendationsEnabled' ? 'true' : null));
  jest.spyOn(StorageService, 'get').mockImplementation((key, fallback) => fallback ?? []);
  jest.spyOn(GamingIdentity, 'getProfile').mockReturnValue({
    signatureGames: [
      { name: 'Project Zomboid', genres: ['Survival', 'Horror'] },
      { name: 'Valheim', genres: ['Survival', 'Crafting'] },
    ],
    tasteClusters: [{ label: 'Survival Sandbox', gameNames: ['Project Zomboid', 'Valheim'] }],
    gamingPersona: { primaryPersona: null },
  });
  jest.spyOn(GamingIdentity, 'getFamiliarityProfiles').mockReturnValue({
    familiarGenres: ['Farming'],
    freshGenres: [],
  });
  jest.spyOn(UserBehaviorProfile, 'getProfile').mockReturnValue({ genrePreferences: {} });
  jest.spyOn(GameRatingService, 'getAllRatings').mockReturnValue({});
  jest.spyOn(GamingPersonaService, 'getPublicIdentity').mockReturnValue({ affinityGenres: [] });
  jest.spyOn(GamingPersonaService, 'getAffinityGenres').mockReturnValue([]);
  jest.spyOn(RecommendationEngine, 'getCurrentPlayFocus').mockReturnValue(null);
  jest
    .spyOn(RecommendationEngine, 'buildRecommendationEntry')
    .mockImplementation((game, type, mood, genre, availableMinutes, metadata) => ({
      id: String(game.appid || game.name),
      game,
      genre,
      explanation: {},
      meta: metadata,
    }));
});

afterEach(() => jest.restoreAllMocks());

test('cluster + signature-genre makes a strong pick; familiarity alone stays weak', () => {
  const wishlist = [item('Rust', { genres: ['Survival', 'Crafting'] }), item('Farm Game', { genres: ['Farming'] })];
  const snapshot = BuyRecommendationService.getSnapshot(library, wishlist, { familiarityBias: 'familiar' });

  const rust = snapshot.allEntries.find((entry) => entry.game.name === 'Rust');
  expect(rust.meta.evidence).toEqual(expect.arrayContaining(['cluster', 'signature-genre', 'top-genre']));
  expect(rust.meta.conviction).toBe('strong');

  const farm = snapshot.allEntries.find((entry) => entry.game.name === 'Farm Game');
  expect(farm.meta.conviction).toBe('weak');
  expect(farm.meta.evidence).toHaveLength(0);
  expect(snapshot.strongCount).toBe(1);
});

test('strong picks sort before weak picks even when the weak score is higher', () => {
  const wishlist = [
    // Weak but heavily scored: familiarity + a single price alert.
    item('Farm Game', {
      genres: ['Farming'],
      currentPrice: { price: 10, priceFormatted: '$10.00' },
      threshold: 15,
    }),
    item('Rust', { genres: ['Survival', 'Crafting'] }),
  ];
  const snapshot = BuyRecommendationService.getSnapshot(library, wishlist, { familiarityBias: 'familiar' });

  const rust = snapshot.entries.find((entry) => entry.game.name === 'Rust');
  const farm = snapshot.entries.find((entry) => entry.game.name === 'Farm Game');
  expect(farm.meta.buyScore).toBeGreaterThan(rust.meta.buyScore);
  expect(snapshot.entries.indexOf(rust)).toBeLessThan(snapshot.entries.indexOf(farm));
  expect(snapshot.entries[0].meta.conviction).toBe('strong');
});

test('no strong picks + unplayed owned genre match produces a backlog fallback', () => {
  const wishlist = [item('Farm Game', { genres: ['Farming'] })];
  const snapshot = BuyRecommendationService.getSnapshot(library, wishlist, { familiarityBias: 'familiar' });

  expect(snapshot.strongCount).toBe(0);
  expect(snapshot.message).toMatch(/might not be ready to buy/);
  expect(snapshot.backlogFallback).not.toBeNull();
  // Dusty Shelf shares Survival + Crafting; Old Horror shares only Horror.
  expect(snapshot.backlogFallback.game.name).toBe('Dusty Shelf');
  expect(snapshot.backlogFallback.sharedGenres).toEqual(expect.arrayContaining(['Survival', 'Crafting']));
  expect(snapshot.backlogFallback.reason).toMatch(/Unplayed/);
});

test('ownedAlternative picks the unplayed owned game with the most shared genres, else null', () => {
  const wishlist = [item('New Survival', { genres: ['Survival', 'Crafting'] })];
  const snapshot = BuyRecommendationService.getSnapshot(library, wishlist, { familiarityBias: null });

  const entry = snapshot.allEntries[0];
  expect(entry.meta.ownedAlternative).not.toBeNull();
  expect(entry.meta.ownedAlternative.name).toBe('Dusty Shelf');
  expect(entry.meta.ownedAlternative.sharedGenres).toEqual(expect.arrayContaining(['Survival', 'Crafting']));

  // With the only overlapping owned games played, there is no alternative.
  const playedOnly = [
    ...playedLibrary,
    { name: 'Dusty Shelf', appid: 111, genres: ['Survival', 'Crafting'], time_played: 600 },
  ];
  const snapshotPlayed = BuyRecommendationService.getSnapshot(playedOnly, wishlist, { familiarityBias: null });
  expect(snapshotPlayed.allEntries[0].meta.ownedAlternative).toBeNull();
});

test('no percentage string appears in reasons, primaryReason, or summary', () => {
  const wishlist = [item('Rust', { genres: ['Survival', 'Crafting'] }), item('Farm Game', { genres: ['Farming'] })];
  const snapshot = BuyRecommendationService.getSnapshot(library, wishlist, { familiarityBias: 'familiar' });

  snapshot.allEntries.forEach((entry) => {
    const copy = [entry.meta.primaryReason, ...(entry.meta.buyReasons || []), entry.explanation?.summary || ''].join(
      '\n'
    );
    expect(copy).not.toMatch(/%/);
    expect(copy).not.toMatch(/confident match/i);
  });
});

test('a price under the alert threshold is the primaryReason ahead of the cluster fit', () => {
  const wishlist = [
    item('Cheap Survival', {
      genres: ['Survival'],
      currentPrice: { price: 9.99, priceFormatted: '$9.99' },
      threshold: 15,
    }),
  ];
  const snapshot = BuyRecommendationService.getSnapshot(library, wishlist, { familiarityBias: null });

  const entry = snapshot.allEntries[0];
  expect(entry.meta.evidence).toEqual(expect.arrayContaining(['price-alert', 'cluster']));
  expect(entry.meta.primaryReason).toMatch(/^\$9\.99|It's \$9\.99/);
  expect(entry.meta.primaryReason).toMatch(/below your \$15\.00 alert/);
});
