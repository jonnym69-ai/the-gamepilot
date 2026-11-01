import RecommendationPreferenceService, {
  CHANGE_EVENT,
  RECOMMENDATION_REASONS,
} from './RecommendationPreferenceService';
import StorageService from './StorageService';

beforeEach(() => localStorage.clear());

test('saves and reads a preference by normalized title', () => {
  expect(RecommendationPreferenceService.setPreference('  The WITCHER 3 ', 'technical')).toBe(true);
  expect(RecommendationPreferenceService.getPreference('the witcher 3')).toEqual({
    name: 'the witcher 3',
    reason: 'technical',
  });
  expect(RecommendationPreferenceService.isSetAside('THE WITCHER 3')).toBe(true);
});

test('rejects empty names and non-string input', () => {
  expect(RecommendationPreferenceService.setPreference('', 'technical')).toBe(false);
  expect(RecommendationPreferenceService.setPreference('   ', 'technical')).toBe(false);
  expect(RecommendationPreferenceService.setPreference(null, 'technical')).toBe(false);
  expect(RecommendationPreferenceService.setPreference(undefined, 'technical')).toBe(false);
  expect(RecommendationPreferenceService.getPreference('')).toBeNull();
  expect(RecommendationPreferenceService.isSetAside(123)).toBe(false);
});

test('rejects reasons outside the frozen list', () => {
  expect(RecommendationPreferenceService.setPreference('Game', 'hate-it')).toBe(false);
  expect(RecommendationPreferenceService.setPreference('Game', '__proto__')).toBe(false);
  expect(RecommendationPreferenceService.isSetAside('Game')).toBe(false);
  expect(RECOMMENDATION_REASONS).toHaveLength(4);
});

test('exact title scoping keeps editions distinct', () => {
  RecommendationPreferenceService.setPreference('Skyrim', 'refresher');
  expect(RecommendationPreferenceService.isSetAside('Skyrim')).toBe(true);
  expect(RecommendationPreferenceService.isSetAside('Skyrim Special Edition')).toBe(false);
  expect(RecommendationPreferenceService.isSetAside('Skyrim VR')).toBe(false);
});

test('replacing and clearing a preference', () => {
  RecommendationPreferenceService.setPreference('Game', 'waiting-friends');
  RecommendationPreferenceService.setPreference('Game', 'refresher');
  expect(RecommendationPreferenceService.getPreference('Game').reason).toBe('refresher');
  expect(RecommendationPreferenceService.setPreference('Game', '')).toBe(true);
  expect(RecommendationPreferenceService.getPreference('Game')).toBeNull();
  expect(RecommendationPreferenceService.isSetAside('Game')).toBe(false);
});

test('a successful save emits the change event exactly once', () => {
  const listener = jest.fn();
  window.addEventListener(CHANGE_EVENT, listener);
  RecommendationPreferenceService.setPreference('Game', 'not-for-me');
  expect(listener).toHaveBeenCalledTimes(1);
  window.removeEventListener(CHANGE_EVENT, listener);
});

test('a failed save emits no event and returns false', () => {
  const listener = jest.fn();
  window.addEventListener(CHANGE_EVENT, listener);
  jest.spyOn(StorageService, 'set').mockReturnValue(false);
  expect(RecommendationPreferenceService.setPreference('Game', 'technical')).toBe(false);
  expect(listener).not.toHaveBeenCalled();
  window.removeEventListener(CHANGE_EVENT, listener);
  jest.restoreAllMocks();
});

test('invalid stored records are ignored, not trusted', () => {
  StorageService.set('recommendationPreferencesV1', [
    { name: 'ok', reason: 'technical' },
    { name: '', reason: 'technical' },
    { name: 'bad', reason: 'malicious' },
    'not-an-object',
    null,
  ]);
  expect(RecommendationPreferenceService.isSetAside('ok')).toBe(true);
  expect(RecommendationPreferenceService.isSetAside('bad')).toBe(false);
  expect(RecommendationPreferenceService.hasPreferences()).toBe(true);
});
