import { buildRecentActivityBreakdown, formatDuration } from './RecentActivityAggregator';
import { PlaytimeAutoLogger } from './PlaytimeAutoLogger';

jest.mock('./PlaytimeAutoLogger', () => ({
  PlaytimeAutoLogger: {
    getSessionHistory: jest.fn(),
  },
}));

describe('RecentActivityAggregator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const now = new Date();
  const daysAgo = (n) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    d.setHours(20, 0, 0, 0);
    return d.toISOString();
  };
  const daysAgoStart = (n) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    d.setHours(10, 0, 0, 0); // Morning
    return d.toISOString();
  };

  const makeSession = (overrides = {}) => ({
    sessionId: `s-${Math.random().toString(36).slice(2)}`,
    gameName: 'Test Game',
    gameId: 'test-game',
    playtimeMinutes: 60,
    timestamp: daysAgo(0),
    ...overrides,
  });

  describe('formatDuration', () => {
    test('formats zero minutes', () => {
      expect(formatDuration(0)).toBe('0m');
    });

    test('formats minutes only', () => {
      expect(formatDuration(25)).toBe('25m');
    });

    test('formats hours only', () => {
      expect(formatDuration(120)).toBe('2h');
    });

    test('formats hours and minutes', () => {
      expect(formatDuration(90)).toBe('1h 30m');
    });

    test('handles negative values', () => {
      expect(formatDuration(-10)).toBe('0m');
    });
  });

  describe('buildRecentActivityBreakdown', () => {
    test('totals only include the calendar days displayed in the chart', () => {
      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
        makeSession({ timestamp: daysAgo(6), playtimeMinutes: 60 }),
        makeSession({ timestamp: daysAgo(7), playtimeMinutes: 120 }),
        makeSession({ timestamp: daysAgo(-1), playtimeMinutes: 240 }),
      ]);
      const result = buildRecentActivityBreakdown(7);
      expect(result.overview.totalPlaytimeMinutes).toBe(60);
      expect(result.dailyTimeline.reduce((sum, day) => sum + day.totalMinutes, 0)).toBe(60);
    });
    test('returns empty breakdown when no sessions exist', () => {
      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([]);
      const result = buildRecentActivityBreakdown(7);
      expect(result.hasData).toBe(false);
      expect(result.overview.totalSessions).toBe(0);
      expect(result.overview.totalPlaytimeMinutes).toBe(0);
      expect(result.overview.topGame).toBeNull();
      expect(result.overview.busiestDay).not.toBeNull(); // Returns the first day with 0
      expect(result.overview.busiestDay.totalMinutes).toBe(0);
    });

    test('filters sessions to the last X days', () => {
      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
        makeSession({ sessionId: 'recent', gameName: 'Recent', playtimeMinutes: 30, timestamp: daysAgo(1) }),
        makeSession({ sessionId: 'old', gameName: 'Old', playtimeMinutes: 300, timestamp: daysAgo(20) }),
      ]);
      const result = buildRecentActivityBreakdown(7);
      expect(result.overview.totalSessions).toBe(1);
      expect(result.overview.totalPlaytimeMinutes).toBe(30);
      expect(result.perGameBreakdown).toHaveLength(1);
      expect(result.perGameBreakdown[0].name).toBe('Recent');
    });

    test('deduplicates sessions by sessionId', () => {
      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
        makeSession({ sessionId: 'dup-1', gameName: 'Game A', playtimeMinutes: 60, timestamp: daysAgo(1) }),
        makeSession({ sessionId: 'dup-1', gameName: 'Game A', playtimeMinutes: 60, timestamp: daysAgo(1) }),
      ]);
      const result = buildRecentActivityBreakdown(7);
      expect(result.overview.totalSessions).toBe(1);
      expect(result.overview.totalPlaytimeMinutes).toBe(60);
    });

    test('handles legacy field aliases (playtime, duration, minutes)', () => {
      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
        makeSession({ sessionId: 's1', playtimeMinutes: undefined, playtime: 45, timestamp: daysAgo(0) }),
        makeSession({ sessionId: 's2', playtimeMinutes: undefined, duration: 30, timestamp: daysAgo(0) }),
        makeSession({ sessionId: 's3', playtimeMinutes: undefined, minutes: 15, timestamp: daysAgo(0) }),
      ]);
      const result = buildRecentActivityBreakdown(7);
      expect(result.overview.totalPlaytimeMinutes).toBe(90);
    });

    test('handles legacy timestamp aliases (endTime, ended_at, startTime, date)', () => {
      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
        makeSession({ sessionId: 's1', timestamp: undefined, endTime: daysAgo(1), playtimeMinutes: 30 }),
        makeSession({ sessionId: 's2', timestamp: undefined, ended_at: daysAgo(2), playtimeMinutes: 20 }),
      ]);
      const result = buildRecentActivityBreakdown(7);
      expect(result.overview.totalSessions).toBe(2);
    });

    test('computes overview stats correctly', () => {
      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
        makeSession({ sessionId: 's1', gameName: 'Game A', playtimeMinutes: 60, timestamp: daysAgo(0) }),
        makeSession({ sessionId: 's2', gameName: 'Game B', playtimeMinutes: 120, timestamp: daysAgo(1) }),
        makeSession({ sessionId: 's3', gameName: 'Game A', playtimeMinutes: 30, timestamp: daysAgo(2) }),
      ]);
      const result = buildRecentActivityBreakdown(7);
      expect(result.overview.totalPlaytimeMinutes).toBe(210);
      expect(result.overview.totalSessions).toBe(3);
      expect(result.overview.avgSessionMinutes).toBe(70);
      expect(result.overview.uniqueGames).toBe(2);
      expect(result.overview.topGame.name).toBe('Game B');
      expect(result.overview.topGame.totalMinutes).toBe(120);
    });

    test('builds per-game breakdown sorted by total minutes', () => {
      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
        makeSession({ sessionId: 's1', gameName: 'Low', playtimeMinutes: 10, timestamp: daysAgo(0) }),
        makeSession({ sessionId: 's2', gameName: 'High', playtimeMinutes: 200, timestamp: daysAgo(1) }),
        makeSession({ sessionId: 's3', gameName: 'Mid', playtimeMinutes: 50, timestamp: daysAgo(2) }),
      ]);
      const result = buildRecentActivityBreakdown(7);
      expect(result.perGameBreakdown[0].name).toBe('High');
      expect(result.perGameBreakdown[1].name).toBe('Mid');
      expect(result.perGameBreakdown[2].name).toBe('Low');
      expect(result.perGameBreakdown[0].avgSessionMinutes).toBe(200);
    });

    test('builds daily timeline with all days in range', () => {
      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
        makeSession({ sessionId: 's1', playtimeMinutes: 60, timestamp: daysAgo(0) }),
      ]);
      const result = buildRecentActivityBreakdown(7);
      expect(result.dailyTimeline).toHaveLength(7);
      expect(result.dailyTimeline[6].totalMinutes).toBe(60); // Today (last in array)
      expect(result.dailyTimeline[0].totalMinutes).toBe(0); // 6 days ago
    });

    test('aggregates genre counts by playtime', () => {
      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
        makeSession({
          sessionId: 's1',
          gameName: 'A',
          playtimeMinutes: 60,
          genres: ['RPG', 'Action'],
          timestamp: daysAgo(0),
        }),
        makeSession({ sessionId: 's2', gameName: 'B', playtimeMinutes: 30, genres: ['RPG'], timestamp: daysAgo(1) }),
      ]);
      const result = buildRecentActivityBreakdown(7);
      expect(result.genreCounts['RPG']).toBe(90);
      expect(result.genreCounts['Action']).toBe(60);
    });

    test('aggregates platform counts by playtime', () => {
      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
        makeSession({ sessionId: 's1', platform: 'Steam', playtimeMinutes: 60, timestamp: daysAgo(0) }),
        makeSession({ sessionId: 's2', platform: 'Epic', playtimeMinutes: 30, timestamp: daysAgo(1) }),
      ]);
      const result = buildRecentActivityBreakdown(7);
      expect(result.platformCounts['Steam']).toBe(60);
      expect(result.platformCounts['Epic']).toBe(30);
    });

    test('aggregates mood counts by playtime', () => {
      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
        makeSession({ sessionId: 's1', mood: 'Relaxed', playtimeMinutes: 60, timestamp: daysAgo(0) }),
        makeSession({ sessionId: 's2', mood: 'Focused', playtimeMinutes: 30, timestamp: daysAgo(1) }),
      ]);
      const result = buildRecentActivityBreakdown(7);
      expect(result.moodCounts['Relaxed']).toBe(60);
      expect(result.moodCounts['Focused']).toBe(30);
    });

    test('categorizes time of day from session start time', () => {
      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
        makeSession({ sessionId: 's1', startTime: daysAgoStart(0), playtimeMinutes: 60, timestamp: daysAgo(0) }),
        makeSession({ sessionId: 's2', startTime: daysAgo(1), playtimeMinutes: 30, timestamp: daysAgo(1) }),
      ]);
      const result = buildRecentActivityBreakdown(7);
      // daysAgoStart is 10:00 = Morning, daysAgo is 20:00 = Evening
      expect(result.timeOfDayCounts['Morning (6–12)']).toBe(60);
      expect(result.timeOfDayCounts['Evening (18–24)']).toBe(30);
    });

    test('categorizes session lengths into buckets', () => {
      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
        makeSession({ sessionId: 's1', playtimeMinutes: 15, timestamp: daysAgo(0) }),
        makeSession({ sessionId: 's2', playtimeMinutes: 45, timestamp: daysAgo(0) }),
        makeSession({ sessionId: 's3', playtimeMinutes: 150, timestamp: daysAgo(0) }),
      ]);
      const result = buildRecentActivityBreakdown(7);
      expect(result.sessionLengthCounts['Short (<30m)']).toBe(1);
      expect(result.sessionLengthCounts['Medium (30m–2h)']).toBe(1);
      expect(result.sessionLengthCounts['Long (2h+)']).toBe(1);
    });

    test('handles sessions with missing or invalid playtime', () => {
      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
        makeSession({ sessionId: 's1', playtimeMinutes: null, timestamp: daysAgo(0) }),
        makeSession({ sessionId: 's2', playtimeMinutes: -5, timestamp: daysAgo(0) }),
        makeSession({ sessionId: 's3', playtimeMinutes: 'abc', timestamp: daysAgo(0) }),
        makeSession({ sessionId: 's4', playtimeMinutes: 30, timestamp: daysAgo(0) }),
      ]);
      const result = buildRecentActivityBreakdown(7);
      expect(result.overview.totalPlaytimeMinutes).toBe(30);
      expect(result.overview.totalSessions).toBe(4); // All counted, just 0 minutes for invalid
    });

    test('handles sessions with missing timestamp', () => {
      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
        makeSession({
          sessionId: 's1',
          playtimeMinutes: 60,
          timestamp: null,
          endTime: null,
          startTime: null,
          date: null,
        }),
      ]);
      const result = buildRecentActivityBreakdown(7);
      expect(result.overview.totalSessions).toBe(0); // Filtered out
    });

    test('handles sessions crossing midnight (start before midnight, end after)', () => {
      const lateStart = new Date(now);
      lateStart.setDate(lateStart.getDate() - 1);
      lateStart.setHours(23, 0, 0, 0);
      const earlyEnd = new Date(now);
      earlyEnd.setHours(1, 0, 0, 0);

      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
        makeSession({
          sessionId: 's1',
          startTime: lateStart.toISOString(),
          timestamp: earlyEnd.toISOString(), // Ends today
          playtimeMinutes: 120,
        }),
      ]);
      const result = buildRecentActivityBreakdown(1); // Just today
      // The session ends today so it should be included in 1-day window
      expect(result.overview.totalSessions).toBe(1);
    });

    test('counts active days correctly', () => {
      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
        makeSession({ sessionId: 's1', playtimeMinutes: 30, timestamp: daysAgo(0) }),
        makeSession({ sessionId: 's2', playtimeMinutes: 30, timestamp: daysAgo(2) }),
      ]);
      const result = buildRecentActivityBreakdown(7);
      expect(result.overview.activeDays).toBe(2);
    });

    test('identifies busiest day correctly', () => {
      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
        makeSession({ sessionId: 's1', playtimeMinutes: 30, timestamp: daysAgo(0) }),
        makeSession({ sessionId: 's2', playtimeMinutes: 120, timestamp: daysAgo(1) }),
        makeSession({ sessionId: 's3', playtimeMinutes: 45, timestamp: daysAgo(1) }),
      ]);
      const result = buildRecentActivityBreakdown(7);
      expect(result.overview.busiestDay.totalMinutes).toBe(165);
      expect(result.overview.busiestDay.sessions).toBe(2);
    });

    test('handles 90-day period', () => {
      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
        makeSession({ sessionId: 's1', playtimeMinutes: 60, timestamp: daysAgo(80) }),
        makeSession({ sessionId: 's2', playtimeMinutes: 30, timestamp: daysAgo(100) }), // Outside range
      ]);
      const result = buildRecentActivityBreakdown(90);
      expect(result.overview.totalSessions).toBe(1);
      expect(result.dailyTimeline).toHaveLength(90);
    });

    test('handles genres as comma-separated string', () => {
      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
        makeSession({ sessionId: 's1', genres: 'RPG, Action', playtimeMinutes: 60, timestamp: daysAgo(0) }),
      ]);
      const result = buildRecentActivityBreakdown(7);
      expect(result.genreCounts['RPG']).toBe(60);
      expect(result.genreCounts['Action']).toBe(60);
    });

    test('handles Unknown game name gracefully', () => {
      PlaytimeAutoLogger.getSessionHistory.mockReturnValue([
        makeSession({ sessionId: 's1', gameName: undefined, playtimeMinutes: 30, timestamp: daysAgo(0) }),
      ]);
      const result = buildRecentActivityBreakdown(7);
      expect(result.perGameBreakdown[0].name).toBe('Unknown');
    });
  });
});
