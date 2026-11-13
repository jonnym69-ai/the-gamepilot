import AchievementCompletionService from './AchievementCompletionService';
import SteamAchievementsService from './SteamAchievementsService';
import SteamPublicService from './SteamPublicService';
import HowLongToBeatService from './HowLongToBeatService';
import { GameCurationService } from './GameCurationService';

jest.mock('./SteamAchievementsService');
jest.mock('./SteamPublicService');
jest.mock('./GameCurationService');
jest.mock('./HowLongToBeatService');

const steamGame = (name, appid) => ({ name, appid, source: 'steam' });

const achievementsPayload = (overrides = {}) => ({
  ok: true,
  cached: true, // cache hits skip the network delay in scans
  unlocked: 1,
  total: 2,
  achievements: [
    { apiname: 'A1', name: 'First Steps', description: 'start', achieved: true },
    { apiname: 'A2', name: 'Second', description: 'more', achieved: false },
  ],
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  SteamPublicService.isEnabled.mockReturnValue(true);
  SteamPublicService.appIdOf.mockImplementation((g) => g?.appid || '');
  GameCurationService.getGameCompletion.mockReturnValue({ status: 'not-started', history: [] });
});

describe('evaluate', () => {
  it('returns 100% when every achievement is unlocked', () => {
    const verdict = AchievementCompletionService.evaluate(achievementsPayload({ unlocked: 2, total: 2 }));
    expect(verdict.status).toBe('100%');
  });

  it('returns null for partial progress with no completion-achievement name', () => {
    expect(AchievementCompletionService.evaluate(achievementsPayload())).toBeNull();
  });

  it('detects a story-completion achievement as a beaten suggestion', () => {
    const verdict = AchievementCompletionService.evaluate(
      achievementsPayload({
        achievements: [{ apiname: 'A1', name: 'Roll the Credits', description: 'see the ending', achieved: true }],
      })
    );
    expect(verdict.status).toBe('beaten');
    expect(verdict.achievementName).toBe('Roll the Credits');
  });

  it('ignores unearned completion-named achievements', () => {
    const verdict = AchievementCompletionService.evaluate(
      achievementsPayload({
        achievements: [{ apiname: 'A1', name: 'Complete the Story', description: '', achieved: false }],
      })
    );
    expect(verdict).toBeNull();
  });

  it.each([
    'Completed on Normal',
    'Finished on any difficulty',
    'Complete the game on Easy or higher',
    'Normal Mode Complete',
    'Completed Hard difficulty',
    'Beat the final boss',
    'Reach the Ending',
    'Escaped — saw the credits',
  ])('detects "%s" as a beaten suggestion', (name) => {
    const verdict = AchievementCompletionService.evaluate(
      achievementsPayload({
        achievements: [{ apiname: 'A1', name, description: '', achieved: true }],
      })
    );
    expect(verdict).not.toBeNull();
    expect(verdict.status).toBe('beaten');
  });

  it('does not flag ordinary progress achievements', () => {
    const verdict = AchievementCompletionService.evaluate(
      achievementsPayload({
        achievements: [
          { apiname: 'A1', name: 'Normal Encounter', description: 'Meet a trader', achieved: true },
          { apiname: 'A2', name: '100 Kills', description: 'on any map', achieved: true },
        ],
      })
    );
    expect(verdict).toBeNull();
  });

  it('returns null for failed payloads', () => {
    expect(AchievementCompletionService.evaluate({ ok: false, error: 'x' })).toBeNull();
    expect(AchievementCompletionService.evaluate(null)).toBeNull();
  });
});

describe('shouldApply', () => {
  it('only applies stronger claims', () => {
    expect(AchievementCompletionService.shouldApply('not-started', '100%')).toBe(true);
    expect(AchievementCompletionService.shouldApply('playing', 'beaten')).toBe(true);
    expect(AchievementCompletionService.shouldApply('completed', 'beaten')).toBe(false);
    expect(AchievementCompletionService.shouldApply('100%', 'beaten')).toBe(false);
    expect(AchievementCompletionService.shouldApply('beaten', 'beaten')).toBe(false);
  });
});

describe('scan', () => {
  it('auto-applies 100% to the completion history', async () => {
    SteamAchievementsService.getForGame.mockResolvedValue(achievementsPayload({ unlocked: 5, total: 5 }));
    const result = await AchievementCompletionService.scan([steamGame('Hades', '1')]);
    expect(GameCurationService.setGameCompletion).toHaveBeenCalledWith(
      'Hades',
      '100%',
      expect.stringContaining('Steam')
    );
    expect(result.applied).toHaveLength(1);
  });

  it('does not overwrite an equal or stronger stored status', async () => {
    GameCurationService.getGameCompletion.mockReturnValue({ status: '100%', history: [] });
    SteamAchievementsService.getForGame.mockResolvedValue(achievementsPayload({ unlocked: 5, total: 5 }));
    await AchievementCompletionService.scan([steamGame('Hades', '1')]);
    expect(GameCurationService.setGameCompletion).not.toHaveBeenCalled();
  });

  it('queues beaten detections as review candidates instead of writing them', async () => {
    SteamAchievementsService.getForGame.mockResolvedValue(
      achievementsPayload({
        achievements: [{ apiname: 'A1', name: 'Complete the Story', description: '', achieved: true }],
      })
    );
    const result = await AchievementCompletionService.scan([steamGame('Hades', '1')]);
    expect(GameCurationService.setGameCompletion).not.toHaveBeenCalled();
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].status).toBe('beaten');
    expect(AchievementCompletionService.getCandidates()).toHaveLength(1);
  });

  it('does not resurface dismissed candidates on later scans', async () => {
    AchievementCompletionService.dismiss('1');
    SteamAchievementsService.getForGame.mockResolvedValue(
      achievementsPayload({
        achievements: [{ apiname: 'A1', name: 'Complete the Story', description: '', achieved: true }],
      })
    );
    const result = await AchievementCompletionService.scan([steamGame('Hades', '1')]);
    expect(result.candidates).toHaveLength(0);
    expect(AchievementCompletionService.getCandidates()).toHaveLength(0);
  });

  it('skips non-Steam games and failed lookups without touching state', async () => {
    SteamAchievementsService.getForGame.mockResolvedValue({ ok: false, error: 'private-profile' });
    const result = await AchievementCompletionService.scan([
      { name: 'Epic Only', source: 'epic' },
      steamGame('Private Game', '2'),
    ]);
    expect(SteamAchievementsService.getForGame).toHaveBeenCalledTimes(1);
    expect(GameCurationService.setGameCompletion).not.toHaveBeenCalled();
    expect(result.candidates).toHaveLength(0);
  });

  it('does nothing when Steam public data is disabled', async () => {
    SteamPublicService.isEnabled.mockReturnValue(false);
    const result = await AchievementCompletionService.scan([steamGame('Hades', '1')]);
    expect(SteamAchievementsService.getForGame).not.toHaveBeenCalled();
    expect(result.applied).toHaveLength(0);
  });
});

describe('session evidence matching', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const session = (gameName, endMs, minutes) => ({
    gameName,
    endTime: endMs,
    playtimeMinutes: minutes,
  });

  it('unlockMs normalizes Steam epoch seconds to ms', () => {
    expect(AchievementCompletionService.unlockMs(1700000000)).toBe(1700000000 * 1000);
    expect(AchievementCompletionService.unlockMs(1700000000000)).toBe(1700000000000);
    expect(AchievementCompletionService.unlockMs(0)).toBe(0);
  });

  it('sessionWindowMs uses startTime when present, else reconstructs from minutes', () => {
    const end = Date.now();
    expect(AchievementCompletionService.sessionWindowMs({ startTime: end - 3600000, endTime: end })).toEqual({
      start: end - 3600000,
      end,
    });
    expect(AchievementCompletionService.sessionWindowMs({ endTime: end, playtimeMinutes: 120 }).start).toBe(
      end - 120 * 60000
    );
    expect(AchievementCompletionService.sessionWindowMs({})).toBeNull();
  });

  it('finds the session where a beaten-candidate achievement unlocked', () => {
    const unlockMs = Date.now() - 2 * DAY;
    SteamAchievementsService.getCachedForGame.mockReturnValue({
      ok: true,
      achievements: [{ apiname: 'WIN', name: 'Saw the Credits', achieved: true, unlockTime: unlockMs / 1000 }],
    });
    const sessions = [
      session('Hades', unlockMs + 30 * 60000, 160), // contains the unlock
      session('Other Game', unlockMs, 60),
    ];
    const ev = AchievementCompletionService.getCandidateSessionEvidence(
      { name: 'Hades', appid: '1', achievementName: 'Saw the Credits', achievementApiname: 'WIN' },
      sessions
    );
    expect(ev).toEqual({ unlockMs, endTime: unlockMs + 30 * 60000, minutes: 160 });
  });

  it('returns null when the unlock falls outside every recorded session', () => {
    const unlockMs = Date.now() - 10 * DAY;
    SteamAchievementsService.getCachedForGame.mockReturnValue({
      ok: true,
      achievements: [{ apiname: 'WIN', name: 'The End', achieved: true, unlockTime: unlockMs / 1000 }],
    });
    const sessions = [session('Hades', Date.now() - DAY, 60)];
    expect(
      AchievementCompletionService.getCandidateSessionEvidence(
        { name: 'Hades', appid: '1', achievementName: 'The End' },
        sessions
      )
    ).toBeNull();
  });

  it('matches the last unlock for auto-100% evidence', () => {
    const now = Date.now();
    SteamAchievementsService.getCachedForGame.mockReturnValue({
      ok: true,
      achievements: [
        { apiname: 'A', achieved: true, unlockTime: (now - 5 * DAY) / 1000 },
        { apiname: 'B', achieved: true, unlockTime: (now - DAY) / 1000 },
      ],
    });
    const sessions = [session('Celeste', now - DAY + 10 * 60000, 45)];
    const ev = AchievementCompletionService.getCompletionSessionEvidence('1', 'Celeste', sessions);
    expect(ev?.endTime).toBe(now - DAY + 10 * 60000);
    expect(ev?.minutes).toBe(45);
  });
});

describe('getFinishLine', () => {
  it('returns games at 70–99% sorted closest-first', () => {
    SteamAchievementsService.getSummaryForGames.mockReturnValue({
      1: { unlocked: 9, total: 10 },
      2: { unlocked: 7, total: 10 },
      3: { unlocked: 10, total: 10 },
      4: { unlocked: 3, total: 10 },
    });
    const rows = AchievementCompletionService.getFinishLine([
      steamGame('Near', '1'),
      steamGame('Mid', '2'),
      steamGame('Done', '3'),
      steamGame('Far', '4'),
      { name: 'No Steam', source: 'epic' },
    ]);
    expect(rows.map((r) => r.name)).toEqual(['Near', 'Mid']);
    expect(rows[0].remaining).toBe(1);
    expect(rows[0].pct).toBeCloseTo(0.9);
  });

  it('returns empty when there is no cached data', () => {
    SteamAchievementsService.getSummaryForGames.mockReturnValue({});
    expect(AchievementCompletionService.getFinishLine([steamGame('Hades', '1')])).toEqual([]);
    expect(AchievementCompletionService.getFinishLine([])).toEqual([]);
  });
});

describe('getPlayingGames', () => {
  it('returns playing games with time-to-credits, closest first', () => {
    GameCurationService.getGameCompletion.mockImplementation((name) => ({
      status: { 'Nearly Done': 'playing', 'Just Started': 'playing', Finished: 'beaten' }[name] || 'not-started',
    }));
    HowLongToBeatService.getEstimate.mockImplementation((g) =>
      g.name === 'Nearly Done' ? { mainStory: 20 } : g.name === 'Just Started' ? { mainStory: 30 } : null
    );
    const rows = AchievementCompletionService.getPlayingGames([
      { name: 'Nearly Done', time_played: 1140 }, // 19h of a 20h story → ~1h left
      { name: 'Just Started', time_played: 60 },
      { name: 'Finished' },
      { name: 'No Status' },
    ]);
    expect(rows.map((r) => r.name)).toEqual(['Nearly Done', 'Just Started']);
    expect(rows[0].remainingHours).toBeCloseTo(1);
    expect(rows[0].mainStoryHours).toBe(20);
    expect(rows[1].remainingHours).toBeCloseTo(29);
  });

  it('prefers inline game.hltb and clamps remaining at zero', () => {
    GameCurationService.getGameCompletion.mockReturnValue({ status: 'playing' });
    HowLongToBeatService.getEstimate.mockReturnValue(null);
    const rows = AchievementCompletionService.getPlayingGames([
      { name: 'Overplayed', time_played: 3000, hltb: { mainStory: 40 } },
    ]);
    expect(rows[0].remainingHours).toBe(0);
    expect(rows[0].mainStoryHours).toBe(40);
  });

  it('implies playing from a recent session when no status is set', () => {
    GameCurationService.getGameCompletion.mockReturnValue({ status: 'not-started' });
    HowLongToBeatService.getEstimate.mockReturnValue({ mainStory: 20 });
    const now = Date.now();
    const rows = AchievementCompletionService.getPlayingGames([{ name: 'Zomboid' }], {
      sessions: [
        { gameName: 'Zomboid', endTime: now - 3 * 24 * 60 * 60 * 1000, playtimeMinutes: 95 },
        { gameName: 'Zomboid', endTime: now - 10 * 24 * 60 * 60 * 1000, playtimeMinutes: 40 },
      ],
      nowMs: now,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].implied).toBe(true);
    expect(rows[0].lastPlayedMs).toBe(now - 3 * 24 * 60 * 60 * 1000);
    expect(rows[0].playedMinutes).toBe(135); // session minutes stand in for time_played
    expect(rows[0].remainingHours).toBeCloseTo(20 - 135 / 60);
  });

  it('ignores sessions older than the window and explicit abandoned', () => {
    const now = Date.now();
    HowLongToBeatService.getEstimate.mockReturnValue(null);
    GameCurationService.getGameCompletion.mockImplementation((name) => ({
      status: name === 'Dropped' ? 'abandoned' : 'not-started',
    }));
    const rows = AchievementCompletionService.getPlayingGames([{ name: 'Stale' }, { name: 'Dropped' }], {
      sessions: [
        { gameName: 'Stale', endTime: now - 20 * 24 * 60 * 60 * 1000, playtimeMinutes: 60 },
        { gameName: 'Dropped', endTime: now - 60000, playtimeMinutes: 60 },
      ],
      nowMs: now,
    });
    expect(rows).toEqual([]);
  });
});

describe('confirmBeaten', () => {
  it('writes beaten status and clears the candidate', () => {
    AchievementCompletionService.setCandidates([
      { name: 'Hades', appid: '1', status: 'beaten', achievementName: 'Complete the Story' },
    ]);
    expect(AchievementCompletionService.confirmBeaten('Hades', 'Complete the Story', '1')).toBe(true);
    expect(GameCurationService.setGameCompletion).toHaveBeenCalledWith(
      'Hades',
      'beaten',
      expect.stringContaining('Complete the Story')
    );
    expect(AchievementCompletionService.getCandidates()).toHaveLength(0);
  });

  it('refuses to downgrade a manual completed status', () => {
    GameCurationService.getGameCompletion.mockReturnValue({ status: 'completed', history: [] });
    expect(AchievementCompletionService.confirmBeaten('Hades', 'x', '1')).toBe(false);
    expect(GameCurationService.setGameCompletion).not.toHaveBeenCalled();
  });
});
