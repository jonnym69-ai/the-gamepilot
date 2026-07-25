import { RecapStoryService } from './RecapStoryService';

describe('RecapStoryService', () => {
  const buildWeeklySnapshot = (overrides = {}) => ({
    playtimeMinutes: 720,
    sessions: 8,
    activeDays: 5,
    uniqueGames: 3,
    rangeLabel: 'Week of Jun 15',
    topGames: [
      {
        name: 'Elden Ring',
        totalPlaytime: 600,
        sessions: 5,
        activeDays: 4,
        userRating: 10
      },
      {
        name: 'Stardew Valley',
        totalPlaytime: 90,
        sessions: 2,
        activeDays: 1,
        userRating: 9
      }
    ],
    moodCounts: { Competitive: 5, Focused: 2 },
    genreCounts: { RPG: 5, Simulation: 2 },
    longestSessionMinutes: 180,
    avgSessionMinutes: 90,
    ...overrides
  });

  test('builds weekly stories with grind highlight', () => {
    const result = RecapStoryService.buildWeeklyStories(buildWeeklySnapshot(), 'Pilot');
    expect(result.hasData).toBe(true);
    expect(result.stories.some((story) => story.includes('Elden Ring'))).toBe(true);
    expect(result.stories.some((story) => story.includes('Spent the week'))).toBe(true);
  });

  test('includes mood and genre stories', () => {
    const result = RecapStoryService.buildWeeklyStories(buildWeeklySnapshot(), 'Pilot');
    expect(result.stories.some((story) => story.includes('Competitive'))).toBe(true);
    expect(result.stories.some((story) => story.includes('RPG'))).toBe(true);
  });

  test('caps stories at 5', () => {
    const result = RecapStoryService.buildWeeklyStories(buildWeeklySnapshot(), 'Pilot');
    expect(result.stories.length).toBeLessThanOrEqual(5);
  });

  test('handles empty period gracefully', () => {
    const result = RecapStoryService.buildWeeklyStories({}, 'Pilot');
    expect(result.hasData).toBe(false);
    expect(result.stories.length).toBe(1);
    expect(result.stories[0]).toContain('No playtime tracked');
  });

  test('builds monthly stories with higher threshold', () => {
    const snapshot = buildWeeklySnapshot({
      playtimeMinutes: 1200,
      topGames: [{ name: 'Baldur\'s Gate 3', totalPlaytime: 960, sessions: 6, activeDays: 5 }]
    });
    const result = RecapStoryService.buildMonthlyStories(snapshot, 'Pilot');
    expect(result.hasData).toBe(true);
    expect(result.stories.some((story) => story.includes('Baldur\'s Gate 3'))).toBe(true);
  });

  test('builds share text', () => {
    const text = RecapStoryService.buildShareText(buildWeeklySnapshot(), 'weekly', 'Pilot');
    expect(text).toContain('Pilot');
    expect(text).toContain('This Week\'s GamePilot Recap');
    expect(text).toContain('Generated locally by GamePilot');
  });

  test('generates marathon story when top game claims 40% or more', () => {
    const snapshot = buildWeeklySnapshot({
      playtimeMinutes: 1000,
      topGames: [{ name: 'Marathon Game', totalPlaytime: 500, sessions: 3, activeDays: 2 }]
    });
    const result = RecapStoryService.buildWeeklyStories(snapshot, 'Pilot');
    expect(result.stories.some((story) => story.includes('claimed 50%'))).toBe(true);
  });

  test('generates consistency story for multi-day game', () => {
    const result = RecapStoryService.buildWeeklyStories(buildWeeklySnapshot(), 'Pilot');
    expect(result.stories.some((story) => story.includes('Most consistent'))).toBe(true);
  });
});
