import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCcw, Calendar, Clock, Gamepad2, Trophy, Sun, Moon } from 'lucide-react';
import NavBar from './NavBar';
import EmptyState from './components/EmptyState';
import { PieChart, BarChart } from './components/StatsCharts';
import { buildRecentActivityBreakdown, formatDuration } from './services/RecentActivityAggregator';
import './RecentActivity.css';

const PERIOD_OPTIONS = [
  { label: '7 Days', value: 7 },
  { label: '14 Days', value: 14 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
];

// Stable color palette for per-game stacked bars
const GAME_COLORS = [
  '#ff6b35',
  '#4ecdc4',
  '#ffe66d',
  '#a8e6cf',
  '#ff8b94',
  '#c7ceea',
  '#b8e0d2',
  '#d6cadd',
  '#f6bd60',
  '#84a59d',
  '#f28482',
  '#84dcc6',
  '#cea8cb',
  '#f5cac3',
  '#84cae7',
];

const getGameColor = (gameName, index) => {
  // Use index for stable coloring within a render
  if (index < GAME_COLORS.length) return GAME_COLORS[index];
  // Fallback: hash the game name
  let hash = 0;
  for (let i = 0; i < gameName.length; i++) {
    hash = (hash * 31 + gameName.charCodeAt(i)) & 0xffffff;
  }
  return `#${hash.toString(16).padStart(6, '0')}`;
};

function RecentActivity() {
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    // Defer to next tick so the loading state renders
    setTimeout(() => {
      const data = buildRecentActivityBreakdown(days);
      setBreakdown(data);
      setLoading(false);
    }, 0);
  }, [days]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refresh on window focus (in case sessions were recorded while away)
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  // Build a stable game -> color map for the stacked bar chart
  const gameColorMap = useMemo(() => {
    if (!breakdown?.perGameBreakdown) return {};
    const map = {};
    breakdown.perGameBreakdown.forEach((game, index) => {
      map[game.name] = getGameColor(game.name, index);
    });
    return map;
  }, [breakdown]);

  const handlePeriodChange = useCallback((value) => {
    setDays(value);
  }, []);

  return (
    <div className="recent-activity-page">
      <NavBar />
      <div className="recent-activity-content">
        <div className="recent-activity-header">
          <button className="recent-activity-back-btn" onClick={() => navigate('/stats')} title="Back to Stats">
            <ArrowLeft size={20} />
          </button>
          <div className="recent-activity-title-section">
            <h1 className="recent-activity-title">Recent Activity</h1>
            <p className="recent-activity-subtitle">
              Detailed breakdown of your gaming sessions over the last {days} days
            </p>
          </div>
          <div className="recent-activity-controls">
            <div className="recent-activity-period-toggle">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`recent-activity-period-btn${days === opt.value ? ' active' : ''}`}
                  onClick={() => handlePeriodChange(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button className="recent-activity-refresh-btn" onClick={refresh} title="Refresh">
              <RefreshCcw size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="recent-activity-loading">Loading activity data…</div>
        ) : !breakdown?.hasData ? (
          <EmptyState
            icon="calendar"
            title="No sessions in this period"
            message={`No gaming sessions were recorded in the last ${days} days. Launch a game to start tracking!`}
          />
        ) : (
          <>
            {/* Overview Cards */}
            <div className="recent-activity-overview-grid">
              <OverviewCard
                icon={<Clock size={22} />}
                label="Total Playtime"
                value={breakdown.overview.totalPlaytimeLabel}
                subtitle={`${breakdown.overview.activeDays} active day${breakdown.overview.activeDays !== 1 ? 's' : ''}`}
              />
              <OverviewCard
                icon={<Gamepad2 size={22} />}
                label="Total Sessions"
                value={String(breakdown.overview.totalSessions)}
                subtitle={`${breakdown.overview.uniqueGames} unique game${breakdown.overview.uniqueGames !== 1 ? 's' : ''}`}
              />
              <OverviewCard
                icon={<Clock size={22} />}
                label="Avg Session"
                value={breakdown.overview.avgSessionLabel}
                subtitle="per session"
              />
              {breakdown.overview.topGame && (
                <OverviewCard
                  icon={<Trophy size={22} />}
                  label="Top Game"
                  value={breakdown.overview.topGame.name}
                  subtitle={breakdown.overview.topGame.totalLabel}
                />
              )}
              {breakdown.overview.busiestDay && (
                <OverviewCard
                  icon={<Calendar size={22} />}
                  label="Busiest Day"
                  value={breakdown.overview.busiestDay.label}
                  subtitle={`${breakdown.overview.busiestDay.totalLabel} · ${breakdown.overview.busiestDay.sessions} session${breakdown.overview.busiestDay.sessions !== 1 ? 's' : ''}`}
                />
              )}
            </div>

            {/* Per-day Stacked Bar Chart */}
            <div className="recent-activity-section">
              <h2 className="recent-activity-section-title">Daily Playtime</h2>
              <p className="recent-activity-section-desc">
                Stacked bars show playtime per day, colored by game. Hover for details.
              </p>
              <DailyStackedChart timeline={breakdown.dailyTimeline} gameColorMap={gameColorMap} />
            </div>

            {/* Per-game Breakdown Table */}
            <div className="recent-activity-section">
              <h2 className="recent-activity-section-title">Per-Game Breakdown</h2>
              <p className="recent-activity-section-desc">Games sorted by total playtime in the last {days} days.</p>
              <div className="recent-activity-table-wrap">
                <table className="recent-activity-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Game</th>
                      <th>Sessions</th>
                      <th>Total</th>
                      <th>Avg Session</th>
                      <th>First Played</th>
                      <th>Last Played</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.perGameBreakdown.map((game, index) => (
                      <tr key={game.name}>
                        <td className="ra-rank">{index + 1}</td>
                        <td className="ra-game-name">
                          <span className="ra-color-dot" style={{ background: gameColorMap[game.name] }} />
                          {game.name}
                        </td>
                        <td>{game.sessions}</td>
                        <td className="ra-minutes">{formatDuration(game.totalMinutes)}</td>
                        <td>{formatDuration(game.avgSessionMinutes)}</td>
                        <td>{game.firstPlayedLabel}</td>
                        <td>{game.lastPlayedLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Genre + Platform + Mood Breakdown */}
            <div className="recent-activity-section">
              <h2 className="recent-activity-section-title">Category Breakdown</h2>
              <p className="recent-activity-section-desc">
                Playtime distribution by genre, platform, and mood across the selected period.
              </p>
              <div className="charts-grid">
                {Object.keys(breakdown.genreCounts).length > 0 && (
                  <BarChart data={breakdown.genreCounts} title="Genre (by playtime)" />
                )}
                {Object.keys(breakdown.platformCounts).length > 0 && (
                  <PieChart data={breakdown.platformCounts} title="Platform (by playtime)" />
                )}
                {Object.keys(breakdown.moodCounts).length > 0 && (
                  <PieChart data={breakdown.moodCounts} title="Mood (by playtime)" />
                )}
              </div>
            </div>

            {/* Time of Day + Session Length */}
            <div className="recent-activity-section">
              <h2 className="recent-activity-section-title">Play Patterns</h2>
              <p className="recent-activity-section-desc">
                When and how long you play, based on session start times and durations.
              </p>
              <div className="recent-activity-patterns-grid">
                <div className="recent-activity-pattern-card">
                  <h3>
                    <Sun size={18} /> Time of Day
                  </h3>
                  {Object.entries(breakdown.timeOfDayCounts).map(([label, minutes]) => {
                    const total = Object.values(breakdown.timeOfDayCounts).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? Math.round((minutes / total) * 100) : 0;
                    return (
                      <div key={label} className="recent-activity-bar-row">
                        <span className="ra-bar-label">
                          {label.includes('Night') && <Moon size={14} />}
                          {label.includes('Morning') && <Sun size={14} />}
                          {label}
                        </span>
                        <div className="ra-bar-track">
                          <div className="ra-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="ra-bar-value">
                          {formatDuration(minutes)} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="recent-activity-pattern-card">
                  <h3>
                    <Clock size={18} /> Session Length
                  </h3>
                  {Object.entries(breakdown.sessionLengthCounts).map(([label, count]) => {
                    const total = Object.values(breakdown.sessionLengthCounts).reduce((a, b) => a + b, 0);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={label} className="recent-activity-bar-row">
                        <span className="ra-bar-label">{label}</span>
                        <div className="ra-bar-track">
                          <div className="ra-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="ra-bar-value">
                          {count} session{count !== 1 ? 's' : ''} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Overview stat card */
function OverviewCard({ icon, label, value, subtitle }) {
  return (
    <div className="recent-activity-overview-card">
      <div className="recent-activity-overview-icon">{icon}</div>
      <div className="recent-activity-overview-info">
        <div className="recent-activity-overview-label">{label}</div>
        <div className="recent-activity-overview-value">{value}</div>
        {subtitle && <div className="recent-activity-overview-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}

/** Custom stacked bar chart for daily playtime */
function DailyStackedChart({ timeline, gameColorMap }) {
  const maxMinutes = useMemo(() => {
    if (!timeline || timeline.length === 0) return 0;
    return Math.max(...timeline.map((d) => d.totalMinutes), 1);
  }, [timeline]);

  if (!timeline || timeline.length === 0) return null;

  // For wide date ranges, thin the x-axis labels
  const labelInterval = timeline.length > 60 ? 14 : timeline.length > 30 ? 7 : timeline.length > 14 ? 3 : 1;

  return (
    <div className="ra-stacked-chart">
      <div className="ra-stacked-bars">
        {timeline.map((day) => {
          const heightPct = (day.totalMinutes / maxMinutes) * 100;
          const gameEntries = Object.entries(day.games).sort(([, a], [, b]) => b - a);
          return (
            <div
              key={day.dateKey}
              className="ra-stacked-bar-col"
              title={`${day.label}: ${formatDuration(day.totalMinutes)} (${day.sessions} session${day.sessions !== 1 ? 's' : ''})`}
            >
              <div
                className="ra-stacked-bar"
                style={{ height: `${Math.max(heightPct, day.totalMinutes > 0 ? 2 : 0)}%` }}
              >
                {gameEntries.map(([gameName, minutes]) => (
                  <div
                    key={gameName}
                    className="ra-stacked-bar-segment"
                    style={{
                      height: `${(minutes / day.totalMinutes) * 100}%`,
                      background: gameColorMap[gameName] || '#ff6b35',
                    }}
                    title={`${gameName}: ${formatDuration(minutes)}`}
                  />
                ))}
              </div>
              {timeline.indexOf(day) % labelInterval === 0 && <span className="ra-stacked-bar-label">{day.label}</span>}
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="ra-stacked-legend">
        {Object.entries(gameColorMap).map(([gameName, color]) => (
          <span key={gameName} className="ra-legend-item">
            <span className="ra-legend-dot" style={{ background: color }} />
            {gameName}
          </span>
        ))}
      </div>
    </div>
  );
}

export default RecentActivity;
