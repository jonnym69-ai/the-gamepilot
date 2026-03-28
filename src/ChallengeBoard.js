import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, CheckCircle2, Clock, Gamepad2, Play, Plus, Star, Target, Trophy, X } from 'lucide-react';
import NavBar from './NavBar';
import { AchievementTracker } from './AchievementSystem';
import { ChallengeBoardService } from './services/ChallengeBoardService';
import './ChallengeBoard.css';

const PERIOD_ICONS = {
  daily: Calendar,
  weekly: Clock,
  monthly: Target,
  yearly: Trophy
};

const getLibraryLookupId = (game = {}) => String(
  game.id
    || game.appid
    || game.appId
    || game.steamAppId
    || game.rawgId
    || game.name
    || ''
);

const formatPlaytime = (minutes) => {
  const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0));
  if (safeMinutes < 60) {
    return `${safeMinutes}m`;
  }
  const hours = safeMinutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1).replace(/\.0$/, '')}h`;
};

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-header">
      <div className="skeleton-icon" />
      <div className="skeleton-title" />
    </div>
    <div className="skeleton-content">
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
      <div className="skeleton-line" />
    </div>
  </div>
);

function ChallengeBoard({ library = [], onLaunchGame, activeSessions = {}, endSession, theme }) {
  const timeoutRef = useRef(null);
  const [snapshot, setSnapshot] = useState({ generatedAt: Date.now(), periods: [] });
  const [pendingSelections, setPendingSelections] = useState({});
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const showStatus = useCallback((message) => {
    setStatusMessage(message);
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => setStatusMessage(''), 3500);
  }, []);

  const refreshSnapshot = useCallback(() => {
    setIsLoading(true);
    AchievementTracker.checkAndResetTimeBasedAchievements();
    AchievementTracker.checkAndUnlockAchievements();
    setSnapshot(ChallengeBoardService.getChallengeBoardSnapshot(library));
    setIsLoading(false);
  }, [library]);

  useEffect(() => {
    refreshSnapshot();
  }, [refreshSnapshot]);

  useEffect(() => () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }
  }, []);

  const libraryIndex = useMemo(() => {
    const byId = new Map();
    const byName = new Map();

    library.forEach((game) => {
      const id = getLibraryLookupId(game);
      if (id) {
        byId.set(id, game);
      }
      if (game?.name) {
        byName.set(game.name, game);
      }
    });

    return { byId, byName };
  }, [library]);

  const totals = useMemo(() => snapshot.periods.reduce((acc, period) => ({
    total: acc.total + period.totalCount,
    completed: acc.completed + period.completedCount
  }), { total: 0, completed: 0 }), [snapshot.periods]);

  const handlePinToggle = useCallback((period, quest) => {
    const result = quest.isPinned
      ? ChallengeBoardService.clearQuestPin(period)
      : ChallengeBoardService.pinQuest(period, quest.id);

    showStatus(result.message);
    if (result.success) {
      refreshSnapshot();
    }
  }, [refreshSnapshot, showStatus]);

  const handleSelectionChange = useCallback((period, value) => {
    setPendingSelections((current) => ({
      ...current,
      [period]: value
    }));
  }, []);

  const handleAddCuratedGame = useCallback((period, explicitGameId = null) => {
    const gameId = explicitGameId || pendingSelections[period];
    const result = ChallengeBoardService.addCuratedGame(period, gameId);

    showStatus(result.message);
    if (result.success) {
      setPendingSelections((current) => ({
        ...current,
        [period]: ''
      }));
      refreshSnapshot();
    }
  }, [pendingSelections, refreshSnapshot, showStatus]);

  const handleRemoveCuratedGame = useCallback((period, gameId) => {
    const result = ChallengeBoardService.removeCuratedGame(period, gameId);
    showStatus(result.message);
    if (result.success) {
      refreshSnapshot();
    }
  }, [refreshSnapshot, showStatus]);

  const handleLaunch = useCallback((gameSummary) => {
    const fullGame = libraryIndex.byId.get(gameSummary.id) || libraryIndex.byName.get(gameSummary.name);
    if (!fullGame || typeof onLaunchGame !== 'function') {
      showStatus('Could not find that game in your local library.');
      return;
    }

    AchievementTracker.logGameplayFeature('continue_playing');
    AchievementTracker.trackPlatformUsage(fullGame.platform);
    onLaunchGame(fullGame);
    showStatus(`${fullGame.name} launched.`);
  }, [libraryIndex.byId, libraryIndex.byName, onLaunchGame, showStatus]);

  const handleEndSession = useCallback((gameName) => {
    if (typeof endSession !== 'function') {
      return;
    }

    endSession(gameName);
    window.setTimeout(() => refreshSnapshot(), 150);
  }, [endSession, refreshSnapshot]);

  return (
    <div className="challenge-board-page">
      <NavBar />
      <div className="challenge-board-shell">
        <header className="challenge-board-hero">
          <div className="challenge-board-copy">
            <span className="challenge-board-kicker">Rotating goals</span>
            <h1>Challenge Board</h1>
            <p>
              Track the active daily, weekly, monthly, and yearly goal rotations in one place,
              then build a focused local lineup to help you hit them.
            </p>
          </div>
          <div className="challenge-board-overview">
            <div>
              <span>Challenges complete</span>
              <strong>{totals.completed}/{totals.total || 0}</strong>
            </div>
            <div>
              <span>Rotations live</span>
              <strong>{snapshot.periods.length}</strong>
            </div>
          </div>
        </header>

        {statusMessage && <div className="challenge-board-status">{statusMessage}</div>}

        <div className="challenge-period-stack">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            snapshot.periods.map((periodSnapshot) => {
              const PeriodIcon = PERIOD_ICONS[periodSnapshot.period] || Target;
              const stats = periodSnapshot.stats || {};
              const currentSelection = pendingSelections[periodSnapshot.period] || '';

              return (
                <section key={periodSnapshot.period} className="challenge-period-card">
                <header className="challenge-period-header">
                  <div className="challenge-period-title-group">
                    <div className="challenge-period-icon">
                      <PeriodIcon size={22} />
                    </div>
                    <div>
                      <span className="challenge-period-label">{periodSnapshot.title}</span>
                      <h2>{periodSnapshot.label}</h2>
                    </div>
                  </div>
                  <div className="challenge-period-summary">
                    <div>
                      <span>Completion</span>
                      <strong>{periodSnapshot.completedCount}/{periodSnapshot.totalCount || 0}</strong>
                    </div>
                    <div>
                      <span>Playtime</span>
                      <strong>{formatPlaytime(stats.playtimeMinutes)}</strong>
                    </div>
                    <div>
                      <span>Sessions</span>
                      <strong>{stats.sessions || 0}</strong>
                    </div>
                    <div>
                      <span>Games</span>
                      <strong>{stats.uniqueGames || 0}</strong>
                    </div>
                  </div>
                </header>

                {periodSnapshot.primaryChallenge && (
                  <article className={`challenge-primary-card${periodSnapshot.primaryChallenge.completed ? ' completed' : ''}`}>
                    <div className="challenge-primary-copy">
                      <div className="challenge-primary-topline">
                        <span>{periodSnapshot.primaryChallenge.metricTitle}</span>
                        <button
                          type="button"
                          className={`challenge-pin-button${periodSnapshot.primaryChallenge.isPinned ? ' pinned' : ''}`}
                          onClick={() => handlePinToggle(periodSnapshot.period, periodSnapshot.primaryChallenge)}
                        >
                          <Star size={16} />
                          <span>{periodSnapshot.primaryChallenge.isPinned ? 'Pinned' : 'Pin challenge'}</span>
                        </button>
                      </div>
                      <h3>{periodSnapshot.primaryChallenge.name}</h3>
                      <p>{periodSnapshot.primaryChallenge.requirementLabel}</p>
                      <div className="challenge-primary-meta">
                        <span>{periodSnapshot.primaryChallenge.progressLabel}</span>
                        <span>{periodSnapshot.primaryChallenge.remainingLabel}</span>
                        <strong>{periodSnapshot.primaryChallenge.xpReward} XP</strong>
                      </div>
                    </div>
                    <div className="challenge-primary-progress">
                      <div className="challenge-progress-track large">
                        <div
                          className="challenge-progress-fill"
                          style={{ width: `${Math.min(periodSnapshot.primaryChallenge.progressPercent, 100)}%` }}
                        />
                      </div>
                      <div className="challenge-primary-state">
                        {periodSnapshot.primaryChallenge.completed ? (
                          <span><CheckCircle2 size={16} /> Challenge complete</span>
                        ) : (
                          <span>{Math.round(periodSnapshot.primaryChallenge.progressPercent)}% complete</span>
                        )}
                        {periodSnapshot.primaryChallenge.permanentlyUnlocked && (
                          <small>Permanent unlock recorded</small>
                        )}
                      </div>
                    </div>
                  </article>
                )}

                <div className="challenge-period-content">
                  <div className="challenge-quest-grid">
                    {periodSnapshot.quests.map((quest) => (
                      <article
                        key={quest.id}
                        className={`challenge-quest-card${quest.completed ? ' completed' : ''}${quest.isPinned ? ' pinned' : ''}`}
                      >
                        <div className="challenge-quest-topline">
                          <span>{quest.metricTitle}</span>
                          <button
                            type="button"
                            className={`challenge-pin-button${quest.isPinned ? ' pinned' : ''}`}
                            onClick={() => handlePinToggle(periodSnapshot.period, quest)}
                          >
                            <Star size={14} />
                            <span>{quest.isPinned ? 'Pinned' : 'Pin'}</span>
                          </button>
                        </div>
                        <div className="challenge-quest-heading">
                          <div className="challenge-quest-icon">{quest.icon || '🎯'}</div>
                          <div>
                            <h3>{quest.name}</h3>
                            <p>{quest.requirementLabel}</p>
                          </div>
                        </div>
                        <div className="challenge-progress-track">
                          <div className="challenge-progress-fill" style={{ width: `${Math.min(quest.progressPercent, 100)}%` }} />
                        </div>
                        <div className="challenge-quest-stats">
                          <span>{quest.progressLabel}</span>
                          <span>{quest.remainingLabel}</span>
                        </div>
                        <div className="challenge-quest-footer">
                          <strong>{quest.xpReward} XP</strong>
                          <small>{quest.completed ? 'Complete' : `${Math.round(quest.progressPercent)}% done`}</small>
                        </div>
                      </article>
                    ))}
                  </div>

                  <aside className="challenge-lineup-panel">
                    <div className="lineup-panel-heading">
                      <div>
                        <h3><Gamepad2 size={18} /> Focus Lineup</h3>
                        <p>Pick up to four games to keep this rotation moving.</p>
                      </div>
                    </div>

                    <div className="lineup-add-row">
                      <select value={currentSelection} onChange={(event) => handleSelectionChange(periodSnapshot.period, event.target.value)}>
                        <option value="">Choose a local game</option>
                        {periodSnapshot.candidateGames.map((game) => (
                          <option key={game.id} value={game.id}>{game.name} · {game.platform}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => handleAddCuratedGame(periodSnapshot.period)}>
                        <Plus size={16} />
                        <span>Add</span>
                      </button>
                    </div>

                    {periodSnapshot.candidateGames.length > 0 && (
                      <div className="lineup-suggestion-row">
                        {periodSnapshot.candidateGames.slice(0, 4).map((game) => (
                          <button key={game.id} type="button" onClick={() => handleAddCuratedGame(periodSnapshot.period, game.id)}>
                            {game.name}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="lineup-card-list">
                      {periodSnapshot.curatedGames.length > 0 ? periodSnapshot.curatedGames.map((game) => {
                        const isActive = Boolean(activeSessions?.[game.name]);
                        return (
                          <article key={game.id} className="lineup-game-card">
                            <div className="lineup-game-art" style={game.image ? { backgroundImage: `url(${game.image})` } : undefined}>
                              {!game.image && <Gamepad2 size={24} />}
                            </div>
                            <div className="lineup-game-copy">
                              <strong>{game.name}</strong>
                              <span>{game.platform}</span>
                              <small>{game.timePlayed > 0 ? `${formatPlaytime(game.timePlayed)} logged` : 'Fresh pick'}</small>
                            </div>
                            <div className="lineup-game-actions">
                              <button type="button" onClick={() => handleLaunch(game)}>
                                <Play size={14} />
                                <span>Launch</span>
                              </button>
                              {isActive ? (
                                <button type="button" className="danger" onClick={() => handleEndSession(game.name)}>
                                  <X size={14} />
                                  <span>End</span>
                                </button>
                              ) : (
                                <button type="button" className="ghost" onClick={() => handleRemoveCuratedGame(periodSnapshot.period, game.id)}>
                                  <X size={14} />
                                  <span>Remove</span>
                                </button>
                              )}
                            </div>
                          </article>
                        );
                      }) : (
                        <div className="lineup-empty-state">
                          Add a few games here to build a rotation-specific lineup.
                        </div>
                      )}
                    </div>
                  </aside>
                </div>
              </section>
            );
          })
          )}
        </div>
      </div>
    </div>
  );
}

export default ChallengeBoard;
