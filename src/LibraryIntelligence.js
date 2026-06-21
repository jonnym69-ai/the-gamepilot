import React, { useMemo, useState } from 'react';
import { BarChart3, Brain, Clock, Gamepad2, Library, Scale, Sparkles, Target, Trophy } from 'lucide-react';
import NavBar from './NavBar';
import { BacklogFinisherService } from './services/BacklogFinisherService';
import './LibraryIntelligence.css';

const getGameId = (game) => String(game?.appid || game?.app_id || game?.steamAppId || game?.launchId || game?.name || '');

const getMinutesPlayed = (game) => {
  const direct = Number(game?.time_played || 0);
  const nested = Number(game?.playtime?.total || 0);
  return Math.max(Number.isFinite(direct) ? direct : 0, Number.isFinite(nested) ? nested : 0);
};

const formatHours = (minutes) => {
  const hours = Math.round((Number(minutes || 0) / 60) * 10) / 10;
  return `${hours}h`;
};

const formatDate = (value) => {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getCompletionLabel = (game) => (
  game?.completionStatus
  || game?.completion_status
  || game?.status
  || (game?.completed ? 'Completed' : 'Unfinished')
);

const getRatingLabel = (game) => {
  const rating = game?.userRating ?? game?.rating ?? game?.user_rating;
  return rating ? `${rating}/10` : 'Not rated';
};

const getTopGenres = (game) => (
  Array.isArray(game?.genres) && game.genres.length > 0 ? game.genres.slice(0, 3).join(', ') : 'Unknown'
);

const getRecencyScore = (game) => {
  if (!game?.last_played) return 0;
  const days = (Date.now() - new Date(game.last_played).getTime()) / 86400000;
  if (!Number.isFinite(days)) return 0;
  if (days <= 7) return 30;
  if (days <= 30) return 20;
  if (days <= 90) return 10;
  return 3;
};

const getMomentumScore = (game) => {
  const minutes = getMinutesPlayed(game);
  const launches = Number(game?.launch_count || 0);
  return Math.min(100, Math.round((minutes / 60) * 2 + launches * 3 + getRecencyScore(game)));
};

const buildVerdict = (selectedGames) => {
  if (selectedGames.length < 2) {
    return 'Pick at least two games to compare your local play patterns.';
  }

  const sortedByTime = [...selectedGames].sort((a, b) => getMinutesPlayed(b) - getMinutesPlayed(a));
  const sortedByMomentum = [...selectedGames].sort((a, b) => getMomentumScore(b) - getMomentumScore(a));
  const mostPlayed = sortedByTime[0];
  const highestMomentum = sortedByMomentum[0];

  if (getGameId(mostPlayed) === getGameId(highestMomentum)) {
    return `${mostPlayed.name} is your strongest pick here: it has the most time invested and the best current momentum.`;
  }

  return `${mostPlayed.name} has the most time invested, but ${highestMomentum.name} looks like the better current-session pick based on recent activity and launches.`;
};

const metricRows = [
  { label: 'Playtime', getValue: (game) => formatHours(getMinutesPlayed(game)) },
  { label: 'Launches', getValue: (game) => Number(game?.launch_count || 0) },
  { label: 'Last played', getValue: (game) => formatDate(game?.last_played) },
  { label: 'Completion', getValue: getCompletionLabel },
  { label: 'Rating', getValue: getRatingLabel },
  { label: 'Genres', getValue: getTopGenres },
  { label: 'Momentum', getValue: (game) => `${getMomentumScore(game)}/100` }
];

function LibraryIntelligence({ library = [], onLaunchGame }) {
  const playableLibrary = useMemo(() => (
    Array.isArray(library)
      ? library.filter((game) => game && game.name).sort((a, b) => String(a.name).localeCompare(String(b.name)))
      : []
  ), [library]);

  const defaultSelections = useMemo(() => playableLibrary.slice(0, 2).map(getGameId), [playableLibrary]);
  const [selectedIds, setSelectedIds] = useState(defaultSelections);

  const selectedGames = useMemo(() => (
    selectedIds
      .map((id) => playableLibrary.find((game) => getGameId(game) === id))
      .filter(Boolean)
  ), [playableLibrary, selectedIds]);

  const backlogStats = useMemo(() => BacklogFinisherService.getBacklogStats(playableLibrary), [playableLibrary]);
  const backlogPriorities = useMemo(() => BacklogFinisherService.getBacklogPriorities(playableLibrary, 6), [playableLibrary]);
  const neverLaunched = useMemo(() => playableLibrary.filter((game) => getMinutesPlayed(game) === 0).slice(0, 6), [playableLibrary]);
  const highMomentum = useMemo(() => (
    playableLibrary
      .filter((game) => getMinutesPlayed(game) > 0)
      .sort((a, b) => getMomentumScore(b) - getMomentumScore(a))
      .slice(0, 5)
  ), [playableLibrary]);

  const updateSelection = (slotIndex, value) => {
    setSelectedIds((current) => {
      const next = [...current];
      next[slotIndex] = value;
      return next.filter(Boolean).slice(0, 4);
    });
  };

  const addCompareSlot = () => {
    const nextGame = playableLibrary.find((game) => !selectedIds.includes(getGameId(game)));
    if (nextGame) {
      setSelectedIds((current) => [...current, getGameId(nextGame)].slice(0, 4));
    }
  };

  return (
    <div className="library-intelligence-page">
      <NavBar />
      <main className="library-intelligence-shell">
        <section className="library-intelligence-hero">
          <div>
            <div className="library-intelligence-eyebrow"><Brain size={18} /> Local library intelligence</div>
            <h1>Compare games and decide what deserves your time next.</h1>
            <p>GamePilot uses your own library, playtime, launch history, ratings, genres, and backlog signals. No store feed, no sale discovery, no external account dependency.</p>
          </div>
          <div className="library-intelligence-hero-card">
            <Sparkles size={26} />
            <strong>GamePilot verdict</strong>
            <span>{buildVerdict(selectedGames)}</span>
          </div>
        </section>

        <section className="library-intelligence-stats-grid">
          <div className="library-intelligence-stat-card"><Library size={20} /><span>Total games</span><strong>{playableLibrary.length}</strong></div>
          <div className="library-intelligence-stat-card"><Target size={20} /><span>Backlog candidates</span><strong>{backlogStats.totalBacklog}</strong></div>
          <div className="library-intelligence-stat-card"><Clock size={20} /><span>Hours invested</span><strong>{backlogStats.totalHoursInvested || 0}h</strong></div>
          <div className="library-intelligence-stat-card"><Trophy size={20} /><span>High priority</span><strong>{backlogStats.highPriorityCount || 0}</strong></div>
        </section>

        <section className="library-intelligence-panel">
          <div className="library-intelligence-section-heading">
            <div>
              <h2><Scale size={22} /> Game comparison</h2>
              <p>Pick 2-4 owned games and compare the signals that matter for a librarian app.</p>
            </div>
            {selectedIds.length < 4 && <button type="button" onClick={addCompareSlot}>Add game</button>}
          </div>

          <div className="library-intelligence-selectors">
            {selectedIds.map((id, index) => (
              <label key={`${id}-${index}`}>
                Game {index + 1}
                <select value={id} onChange={(event) => updateSelection(index, event.target.value)}>
                  {playableLibrary.map((game) => (
                    <option key={getGameId(game)} value={getGameId(game)}>{game.name}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="library-intelligence-comparison-table">
            <div className="library-intelligence-table-row library-intelligence-table-head">
              <span>Metric</span>
              {selectedGames.map((game) => <strong key={getGameId(game)}>{game.name}</strong>)}
            </div>
            {metricRows.map((row) => (
              <div className="library-intelligence-table-row" key={row.label}>
                <span>{row.label}</span>
                {selectedGames.map((game) => <strong key={`${row.label}-${getGameId(game)}`}>{row.getValue(game)}</strong>)}
              </div>
            ))}
          </div>
        </section>

        <section className="library-intelligence-columns">
          <div className="library-intelligence-panel">
            <h2><Target size={22} /> Finish next</h2>
            <p>{BacklogFinisherService.getMotivationalMessage(backlogStats)}</p>
            <div className="library-intelligence-list">
              {backlogPriorities.length === 0 && <div className="library-intelligence-empty">No strong finish candidates yet.</div>}
              {backlogPriorities.map((entry) => (
                <article className="library-intelligence-list-card" key={getGameId(entry.game)}>
                  <div>
                    <strong>{entry.game.name}</strong>
                    <span>{entry.reasons?.[0] || 'Worth returning to'} · {entry.hoursPlayed}h played</span>
                  </div>
                  <div className="library-intelligence-score">{entry.priorityScore}</div>
                  {typeof onLaunchGame === 'function' && <button type="button" onClick={() => onLaunchGame(entry.game)}>Launch</button>}
                </article>
              ))}
            </div>
          </div>

          <div className="library-intelligence-panel">
            <h2><BarChart3 size={22} /> Momentum picks</h2>
            <p>Games with the strongest current pattern from playtime, launches, and recency.</p>
            <div className="library-intelligence-list">
              {highMomentum.map((game) => (
                <article className="library-intelligence-list-card" key={getGameId(game)}>
                  <div>
                    <strong>{game.name}</strong>
                    <span>{formatHours(getMinutesPlayed(game))} · {formatDate(game.last_played)}</span>
                  </div>
                  <div className="library-intelligence-score">{getMomentumScore(game)}</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="library-intelligence-panel">
          <h2><Gamepad2 size={22} /> Untouched shelf</h2>
          <p>Installed games in your library with no recorded playtime yet.</p>
          <div className="library-intelligence-chip-grid">
            {neverLaunched.length === 0 && <span className="library-intelligence-chip">No untouched games found</span>}
            {neverLaunched.map((game) => <span className="library-intelligence-chip" key={getGameId(game)}>{game.name}</span>)}
          </div>
        </section>
      </main>
    </div>
  );
}

export default LibraryIntelligence;
