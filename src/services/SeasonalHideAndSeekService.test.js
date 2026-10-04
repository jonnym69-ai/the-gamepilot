import { AchievementTracker } from '../AchievementSystem';
import { SeasonalHideAndSeekService } from './SeasonalHideAndSeekService';

jest.mock('../AchievementSystem', () => ({
  AchievementTracker: { grantXP: jest.fn() },
}));

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date(2026, 9, 15)); // mid-October
});

afterEach(() => {
  jest.useRealTimers();
});

test('pumpkin hunt is active in October and findItem persists progress', () => {
  expect(SeasonalHideAndSeekService.getActiveEvent()?.id).toBe('halloween');

  const result = SeasonalHideAndSeekService.findItem('halloween', 'halloween-item-0');
  expect(result.alreadyFound).toBe(false);
  expect(result.found).toContain('halloween-item-0');

  const progress = SeasonalHideAndSeekService.getProgress('halloween');
  expect(progress.found).toHaveLength(1);
  expect(progress.progressPercent).toBe(20);
});

test('finding the same item twice does not double-count it', () => {
  SeasonalHideAndSeekService.findItem('halloween', 'halloween-item-0');
  const again = SeasonalHideAndSeekService.findItem('halloween', 'halloween-item-0');
  expect(again.alreadyFound).toBe(true);
  expect(SeasonalHideAndSeekService.getProgress('halloween').found).toHaveLength(1);
});

test('completing the hunt grants the XP reward exactly once', () => {
  for (let i = 0; i < 5; i += 1) {
    SeasonalHideAndSeekService.findItem('halloween', `halloween-item-${i}`);
  }

  expect(AchievementTracker.grantXP).toHaveBeenCalledTimes(1);
  expect(AchievementTracker.grantXP).toHaveBeenCalledWith(
    'seasonal_hide_seek',
    500,
    expect.objectContaining({ eventId: 'halloween', reward: 'Pumpkin King' })
  );
  expect(SeasonalHideAndSeekService.getProgress('halloween').completed).toBe(true);
});

test('finds from a previous year reset instead of counting toward the new event', () => {
  for (let i = 0; i < 5; i += 1) {
    SeasonalHideAndSeekService.findItem('halloween', `halloween-item-${i}`);
  }
  jest.clearAllMocks();
  jest.setSystemTime(new Date(2027, 9, 15));

  const progress = SeasonalHideAndSeekService.getProgress('halloween');
  expect(progress.found).toHaveLength(0);
  expect(progress.completed).toBe(false);
});
