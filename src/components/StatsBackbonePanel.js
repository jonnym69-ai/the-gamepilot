import React, { useMemo, useState } from 'react';
import { Clock, TrendingUp, Calendar, Zap, Gamepad2, Star, Download } from 'lucide-react';
import { PieChart, BarChart } from './StatsCharts';
import { StatsAggregationService } from '../services/StatsAggregationService';
import InterfacePreferencesService from '../services/InterfacePreferencesService';
import useInterfacePreferences from '../hooks/useInterfacePreferences';
import { formatPlaytime as formatPlaytimeUnit } from '../utils/formatPlaytime';
import { LocalShareService } from '../services/LocalShareService';
import ProfileService from '../services/ProfileService';
import StorageService from '../services/StorageService';
import ShareMenu from './ShareMenu';
import '../styles/StatsBackbonePanel.css';

const PLAYTIME_UNIT_OPTIONS = [
  { key: 'auto', label: 'Auto' },
  { key: 'hours', label: 'Hours' },
  { key: 'days', label: 'Days' }
];

const FEATURE_METADATA = Object.freeze({
  perfectPlay: { icon: '✨', label: 'Perfect Play' },
  surpriseMe: { icon: '🎲', label: 'Surprise Me' },
  rediscover: { icon: '🔄', label: 'Rediscover' },
  continuePlaying: { icon: '▶️', label: 'Continue Playing' },
  share: { icon: '📤', label: 'Share' }
});

const getTopEntry = (distribution = {}) => Object.entries(distribution)
  .sort((left, right) => right[1] - left[1])[0] || [null, 0];


const formatSessionTimestamp = (timestamp) => {
  if (!timestamp) {
    return 'Unknown time';
  }

  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const buildTimelineChart = (timeline = {}) => Object.fromEntries(
  Object.entries(timeline)
    .filter(([, value]) => Number(value) > 0)
    .map(([label, value]) => [label, Number((Number(value) / 60).toFixed(1))])
);

const getTimelineTitle = (periodKey) => {
  switch (periodKey) {
    case 'daily':
      return '🕒 Today by Time Block (hours)';
    case 'weekly':
      return '📅 This Week by Day (hours)';
    case 'monthly':
      return '🗓️ This Month by Week (hours)';
    case 'yearly':
      return '📆 This Year by Month (hours)';
    case 'all':
      return '🌍 Lifetime Trend (hours)';
    default:
      return '📈 Playtime Trend (hours)';
  }
};

function StatsBackbonePanel({ dashboardData, selectedPeriod, onSelectPeriod }) {
  const prefs = useInterfacePreferences();
  const playtimeUnit = prefs.playtimeUnit || 'auto';
  const formatPlaytime = (minutes) => formatPlaytimeUnit(minutes, playtimeUnit);
  const [mostPlayedSource, setMostPlayedSource] = useState('imported');
  const periodOptions = useMemo(() => StatsAggregationService.getPeriodOptions(), []);
  const snapshot = dashboardData?.periods?.[selectedPeriod] || dashboardData?.periods?.all;
  const pilotName = StorageService.getString('profileUsername', '') || 'Gamer';

  const buildSteamHoursText = () => {
    const importedPlaytime = dashboardData?.importedPlaytime || { totalMinutes: 0, gameCount: 0 };
    const text = LocalShareService.buildSteamHoursShareText(importedPlaytime.totalMinutes, importedPlaytime.gameCount, pilotName);
    return ProfileService.appendSocialLinksToShareText(text);
  };

  const handleCopySteamHoursText = async (text = null) => {
    const success = await LocalShareService.copyTextToClipboard(text || buildSteamHoursText());
    return success;
  };

  const handleShareSteamHoursToChannel = async (channel, text = null) => {
    await LocalShareService.openShareIntent(channel, text || buildSteamHoursText());
  };

  const handleDownloadSteamHoursText = (text = null) => {
    LocalShareService.downloadShareText(text || buildSteamHoursText(), 'gamepilot-steam-hours.txt');
  };

  const handleNativeShareSteamHours = async (text = null) => {
    await LocalShareService.shareWithNativeShare({ title: "My Steam Lifetime Hours", text: text || buildSteamHoursText() });
  };

  const timelineData = useMemo(() => buildTimelineChart(snapshot?.timeline || {}), [snapshot]);
  const featureCards = useMemo(() => StatsAggregationService.getFeatureKeys()
    .map((key) => ({
      key,
      value: snapshot?.featureUsage?.counts?.[key] || 0,
      ...FEATURE_METADATA[key]
    }))
    .filter((item) => item.value > 0), [snapshot]);

  if (!snapshot) {
    return null;
  }

  const totalSessionsRecorded = dashboardData?.totalSessionsRecorded || 0;
  const importedPlaytime = dashboardData?.importedPlaytime || { totalMinutes: 0, gameCount: 0 };
  const topPlatform = getTopEntry(snapshot.platformCounts);
  const topMood = getTopEntry(snapshot.moodCounts);
  const topGenre = getTopEntry(snapshot.genreCounts);
  const trackedTopGames = snapshot.topGames || [];
  const importedTopGames = [...(importedPlaytime.games || [])]
    .sort((left, right) => (right.minutes || 0) - (left.minutes || 0))
    .slice(0, 10);
  const canShowImportedTop = selectedPeriod === 'all' && importedTopGames.length > 0;
  const showImportedTop = canShowImportedTop && mostPlayedSource === 'imported';
  const recentSessions = snapshot.recentSessions || [];
  const hasSessionData = snapshot.sessions > 0;
  const favoriteFeatureKey = snapshot.featureUsage?.favoriteFeature;
  const favoriteFeature = favoriteFeatureKey ? FEATURE_METADATA[favoriteFeatureKey]?.label || favoriteFeatureKey : null;

  return (
    <>
      <div className="stats-section stats-backbone-section">
        <div className="stats-section-header">
          <div>
            <h2><Clock size={24} /> Session Analytics</h2>
            <p className="section-subtitle">
              {snapshot.rangeLabel} · {totalSessionsRecorded} completed sessions tracked locally
            </p>
          </div>
          <div className="stats-header-controls">
            <div className="stats-unit-selector" role="group" aria-label="Playtime unit">
              {PLAYTIME_UNIT_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`stats-unit-button ${playtimeUnit === option.key ? 'active' : ''}`}
                  onClick={() => InterfacePreferencesService.set('playtimeUnit', option.key)}
                  title={`Show playtime in ${option.label.toLowerCase()}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="stats-period-selector" role="tablist" aria-label="Stats period selector">
              {periodOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={`stats-period-button ${selectedPeriod === option.key ? 'active' : ''}`}
                  onClick={() => onSelectPeriod(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card activity-card">
            <div className="stat-icon">
              <Clock size={32} />
            </div>
            <div className="stat-content">
              <h3>{formatPlaytime(snapshot.playtimeMinutes)}</h3>
              <p>Tracked by GamePilot</p>
            </div>
          </div>

          {selectedPeriod === 'all' && importedPlaytime.totalMinutes > 0 && (
            <div className="stat-card activity-card imported-playtime-card">
              <div className="stat-icon">
                <Download size={32} />
              </div>
              <div className="stat-content">
                <h3>{formatPlaytime(importedPlaytime.totalMinutes)}</h3>
                <p>Steam Lifetime · {importedPlaytime.gameCount} game{importedPlaytime.gameCount !== 1 ? 's' : ''}</p>
              </div>
              <div className="stat-card-share">
                <ShareMenu
                  onCopyText={handleCopySteamHoursText}
                  onShareText={handleShareSteamHoursToChannel}
                  buildCaption={buildSteamHoursText}
                  onDownloadText={handleDownloadSteamHoursText}
                  onNativeShare={handleNativeShareSteamHours}
                  onSaveImage={() => {}}
                  onCopyImage={() => Promise.resolve(false)}
                  imageAvailable={false}
                />
              </div>
            </div>
          )}

          <div className="stat-card activity-card">
            <div className="stat-icon">
              <TrendingUp size={32} />
            </div>
            <div className="stat-content">
              <h3>{snapshot.sessions}</h3>
              <p>Completed Sessions</p>
            </div>
          </div>

          <div className="stat-card activity-card">
            <div className="stat-icon">
              <Gamepad2 size={32} />
            </div>
            <div className="stat-content">
              <h3>{snapshot.uniqueGames}</h3>
              <p>Unique Games Played</p>
            </div>
          </div>

          <div className="stat-card activity-card">
            <div className="stat-icon">
              <Calendar size={32} />
            </div>
            <div className="stat-content">
              <h3>{snapshot.activeDays}</h3>
              <p>Active Days</p>
            </div>
          </div>

          <div className="stat-card activity-card">
            <div className="stat-icon">
              <Star size={32} />
            </div>
            <div className="stat-content">
              <h3>{formatPlaytime(snapshot.avgSessionMinutes)}</h3>
              <p>Average Session · Longest {formatPlaytime(snapshot.longestSessionMinutes)}</p>
            </div>
          </div>

          <div className="stat-card activity-card">
            <div className="stat-icon">
              <Zap size={32} />
            </div>
            <div className="stat-content">
              <h3>{snapshot.streak?.current || 0}</h3>
              <p>Current Streak · Best {snapshot.streak?.best || 0}</p>
            </div>
          </div>
        </div>

        {selectedPeriod === 'all' && importedPlaytime.totalMinutes > 0 && (
          <p className="stats-source-explainer">
            <strong>Tracked by GamePilot</strong> is the time recorded since you installed GamePilot. <strong>Steam Lifetime</strong> is your all-time total imported from Steam.
          </p>
        )}
      </div>

      <div className="stats-section">
        <div className="stats-section-header">
          <div>
            <h2>📈 Session Breakdown</h2>
            <p className="section-subtitle">
              Canonical rollups built from completed session history for {snapshot.label.toLowerCase()}.
            </p>
          </div>
        </div>

        {hasSessionData ? (
          <>
            <div className="charts-grid">
              <BarChart data={timelineData} title={getTimelineTitle(snapshot.key)} />
              <PieChart data={snapshot.platformCounts} title="🎮 Platforms Played" />
              <BarChart data={snapshot.genreCounts} title="🎨 Genres Played" />
              <PieChart data={snapshot.moodCounts} title="😌 Mood Mix" />
            </div>

            <div className="analytics-row">
              <div className="analytics-card">
                <h3>🏆 Most Played Platform</h3>
                <div className="top-category">
                  <div className="category-name">{topPlatform[0] || '—'}</div>
                  <div className="category-count">{topPlatform[1] || 0} sessions</div>
                </div>
              </div>

              <div className="analytics-card">
                <h3>😌 Dominant Mood</h3>
                <div className="top-category">
                  <div className="category-name">{topMood[0] || '—'}</div>
                  <div className="category-count">{topMood[1] || 0} sessions</div>
                </div>
              </div>

              <div className="analytics-card">
                <h3>🎮 Top Genre</h3>
                <div className="top-category">
                  <div className="category-name">{topGenre[0] || '—'}</div>
                  <div className="category-count">{topGenre[1] || 0} sessions</div>
                </div>
              </div>

              <div className="analytics-card">
                <h3>⚡ Favorite Feature</h3>
                <div className="top-category">
                  <div className="category-name">{favoriteFeature || 'No feature usage yet'}</div>
                  <div className="category-count">{snapshot.featureUsage?.totalUses || 0} tracked uses</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="analytics-card stats-empty-panel">
            <h3>No completed sessions in this window yet</h3>
            <p>Finish a session to populate the {snapshot.label.toLowerCase()} view.</p>
          </div>
        )}
      </div>

      {featureCards.length > 0 && (
        <div className="stats-section">
          <div className="stats-section-header">
            <div>
              <h2><Zap size={24} /> Feature Usage</h2>
              <p className="section-subtitle">
                {snapshot.featureUsage?.totalUses || 0} feature interactions in {snapshot.label.toLowerCase()}.
              </p>
            </div>
          </div>

          <div className="stats-grid">
            {featureCards.map((feature) => (
              <div key={feature.key} className="stat-card feature-card">
                <div className="stat-icon">{feature.icon}</div>
                <div className="stat-content">
                  <h3>{feature.value}</h3>
                  <p>{feature.label} Uses</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(trackedTopGames.length > 0 || canShowImportedTop) && (
        <div className="stats-section">
          <div className="stats-section-header">
            <div>
              <h2><Gamepad2 size={24} /> Most Played Games</h2>
              <p className="section-subtitle">
                {showImportedTop
                  ? 'Lifetime leaders from your imported Steam playtime.'
                  : `Leaders for ${snapshot.rangeLabel} ranked by playtime tracked in GamePilot.`}
              </p>
            </div>
            {canShowImportedTop && (
              <div className="stats-source-selector" role="group" aria-label="Most played source">
                <button
                  type="button"
                  className={`stats-source-button ${mostPlayedSource === 'tracked' ? 'active' : ''}`}
                  onClick={() => setMostPlayedSource('tracked')}
                >
                  GamePilot
                </button>
                <button
                  type="button"
                  className={`stats-source-button ${mostPlayedSource === 'imported' ? 'active' : ''}`}
                  onClick={() => setMostPlayedSource('imported')}
                >
                  Steam
                </button>
              </div>
            )}
          </div>

          {showImportedTop ? (
            <div className="most-played-list">
              {importedTopGames.map((game, index) => (
                <div key={game.gameId || game.gameName} className="most-played-item">
                  <div className="rank-badge">{index + 1}</div>
                  <div className="game-info">
                    <h4>{game.gameName}</h4>
                    <p>{game.platform} · <span className="source-tag source-tag-steam">Steam lifetime</span></p>
                  </div>
                  <div className="game-stats">
                    <div className="stat">
                      <span className="stat-label">Playtime:</span>
                      <span className="stat-value">{formatPlaytime(game.minutes)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="most-played-list">
              {trackedTopGames.map((game, index) => (
                <div key={game.id} className="most-played-item">
                  <div className="rank-badge">{index + 1}</div>
                  <div className="game-info">
                    <h4>{game.name}</h4>
                    <p>{game.platform} · <span className="source-tag source-tag-tracked">GamePilot</span> · Last played {formatSessionTimestamp(game.lastPlayed)}</p>
                  </div>
                  <div className="game-stats">
                    <div className="stat">
                      <span className="stat-label">Sessions:</span>
                      <span className="stat-value">{game.sessions}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Playtime:</span>
                      <span className="stat-value">{formatPlaytime(game.totalPlaytime)}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Avg:</span>
                      <span className="stat-value">{formatPlaytime(game.avgSessionMinutes)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {recentSessions.length > 0 && (
        <div className="stats-section">
          <div className="stats-section-header">
            <div>
              <h2>🕘 Recent Sessions</h2>
              <p className="section-subtitle">Latest completed sessions captured for this selected window.</p>
            </div>
          </div>

          <div className="recent-sessions-list">
            {recentSessions.map((session) => (
              <div key={session.id} className="recent-session-item">
                <div className="recent-session-main">
                  <h4>{session.gameName}</h4>
                  <p>{session.platform} · {formatSessionTimestamp(session.timestamp)}</p>
                </div>
                <div className="recent-session-tags">
                  <span className="recent-session-tag">{formatPlaytime(session.playtimeMinutes)}</span>
                  {session.genre && session.genre !== 'Unknown' && (
                    <span className="recent-session-tag">{session.genre}</span>
                  )}
                  {session.mood && session.mood !== 'Unknown' && (
                    <span className="recent-session-tag">{session.mood}</span>
                  )}
                  {session.launchMethod && (
                    <span className="recent-session-tag">{session.launchMethod}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </>
  );
}

export default StatsBackbonePanel;
