import { BacklogCoachService } from './BacklogCoachService';
import StorageService from './StorageService';
import SessionRepository from './SessionRepository';
import { HabitTrackerService } from './HabitTrackerService';

const makeGame = (overrides = {}) => ({
  appid: overrides.appid || String(Math.random()),
  name: 'Game',
  platform: 'steam',
  genres: ['RPG'],
  tags: [],
  time_played: 0,
  ...overrides
});

const makeSession = ({ minutes = 30, gameName = 'Game', hoursAgo = 1 } = {}) => {
  const start = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  return {
    sessionId: `${gameName}-${start.getTime()}-${Math.random()}`,
    gameName,
    startTime: start.toISOString(),
    playtimeMinutes: minutes
  };
};

describe('BacklogCoachService', () => {
  beforeEach(() => {
    localStorage.clear();
    SessionRepository.replaceHistory([]);
  });

  describe('backlog membership (meaningfully sampled definition)', () => {
    test('unplayed games are backlog', () => {
      expect(BacklogCoachService.isBacklogGame(makeGame({ name: 'Fresh Game' }), {})).toBe(true);
    });

    test('games with 3+ hours played are sampled, not backlog', () => {
      expect(BacklogCoachService.isBacklogGame(makeGame({ name: 'Tried Game', time_played: 180 }), {})).toBe(false);
    });

    test('games with 5+ sessions are sampled even under 3 hours', () => {
      const game = makeGame({ name: 'Short Sessions', time_played: 100 });
      const counts = BacklogCoachService.getSessionCountByGame();
      expect(BacklogCoachService.isBacklogGame(game, { ...counts, shortsessions: 5 })).toBe(false);
    });

    test('beaten or finished games are not backlog', () => {
      expect(BacklogCoachService.isBacklogGame(makeGame({ name: 'Beaten', completionStatus: 'beaten' }), {})).toBe(false);
      StorageService.set('completedGames', [{ name: 'Completed Game' }]);
      expect(BacklogCoachService.isBacklogGame(makeGame({ name: 'Completed Game' }), {})).toBe(false);
    });

    test('launcher apps are never backlog', () => {
      expect(BacklogCoachService.isBacklogGame(makeGame({ name: 'GOG Galaxy' }), {})).toBe(false);
    });
  });

  describe('queue fit scoring', () => {
    test('a short game outranks a 100-hour commitment at the current pace', () => {
      StorageService.set('library', [
        makeGame({ appid: 'short', name: 'Short Game', hltb: { mainStory: 2 } }),
        makeGame({ appid: 'long', name: 'Long Game', hltb: { mainStory: 100 } })
      ]);
      // 10h tracked this week -> weekly pace 600 minutes
      HabitTrackerService.recordSession('Whatever', 600, ['RPG']);

      const plan = BacklogCoachService.getBacklogPlan(StorageService.get('library', []), 5);
      expect(plan).toBeTruthy();
      expect(plan.queue[0].game.name).toBe('Short Game');
      expect(plan.queue[0].reasons.some((r) => r.includes('week at your current pace'))).toBe(true);
      expect(plan.queue[1].game.name).toBe('Long Game');
      expect(plan.queue[1].reasons.some((r) => r.includes('commitment at your current pace'))).toBe(true);
    });

    test('plan summary reports backlog count, hours to sample, and tonight pick', () => {
      StorageService.set('library', [
        makeGame({ appid: 'a', name: 'Pile Game A', hltb: { mainStory: 2 } }),
        makeGame({ appid: 'b', name: 'Pile Game B' })
      ]);
      const plan = BacklogCoachService.getBacklogPlan(StorageService.get('library', []), 5);
      expect(plan.summary.backlogCount).toBe(2);
      // A: min(120min estimate, 180 to sample) = 120; B: no estimate -> 180
      expect(plan.summary.hoursToClear).toBe(5);
      expect(plan.tonightPick.game.name).toBe(plan.queue[0].game.name);
      expect(plan.message).toContain('2 games in your backlog');
    });
  });

  describe('progress tracking', () => {
    test('first call seeds the snapshot without counting anything as cleared', () => {
      StorageService.set('library', [
        makeGame({ appid: 'a', name: 'Pile Game A' }),
        makeGame({ appid: 'b', name: 'Pile Game B' })
      ]);
      const plan = BacklogCoachService.getBacklogPlan(StorageService.get('library', []), 5);
      expect(plan.summary.clearedTotal).toBe(0);
      expect(plan.summary.clearedThisMonth).toBe(0);
    });

    test('sampling a game past 3 hours records a clear event', () => {
      StorageService.set('library', [
        makeGame({ appid: 'a', name: 'Pile Game A' }),
        makeGame({ appid: 'b', name: 'Pile Game B' })
      ]);
      BacklogCoachService.getBacklogPlan(StorageService.get('library', []), 5);

      // User gives Pile Game A a fair shot (200 minutes)
      StorageService.set('library', [
        makeGame({ appid: 'a', name: 'Pile Game A', time_played: 200 }),
        makeGame({ appid: 'b', name: 'Pile Game B' })
      ]);
      const plan = BacklogCoachService.getBacklogPlan(StorageService.get('library', []), 5);
      expect(plan.summary.clearedTotal).toBe(1);
      expect(plan.summary.clearedThisMonth).toBe(1);
      expect(plan.recentCleared.some((e) => e.name === 'Pile Game A')).toBe(true);
    });

    test('an uninstalled game is not counted as cleared', () => {
      StorageService.set('library', [
        makeGame({ appid: 'a', name: 'Pile Game A' }),
        makeGame({ appid: 'b', name: 'Pile Game B' })
      ]);
      BacklogCoachService.getBacklogPlan(StorageService.get('library', []), 5);

      // Pile Game A removed from the library entirely (uninstalled)
      StorageService.set('library', [
        makeGame({ appid: 'b', name: 'Pile Game B' })
      ]);
      const plan = BacklogCoachService.getBacklogPlan(StorageService.get('library', []), 5);
      expect(plan.summary.clearedTotal).toBe(0);
    });
  });
});
