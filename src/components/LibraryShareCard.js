import React from 'react';
import { Gamepad2 } from 'lucide-react';
import { LibraryValueService } from '../services/LibraryValueService';
import { StatsAggregationService } from '../services/StatsAggregationService';
import { resolveGameArtwork } from '../services/GameArtworkService';
import { formatPrice, getCurrentCurrency } from '../CurrencyConverter';
import { formatPlaytime } from '../utils/formatPlaytime';
import { ShareCardWatermark } from './ShareCardWatermark';
import './LibraryShareCard.css';

export const LIBRARY_SHARE_CARD_SIZE_PX = 1080;

export const PERIOD_LABELS = {
  all: 'All Time',
  weekly: 'This Week',
  monthly: 'This Month'
};


const resolvePlaytime = (game) => {
  const value = Number(game?.time_played ?? game?.playtime ?? game?.totalPlaytime ?? 0);
  return Number.isFinite(value) ? value : 0;
};

export function buildLibraryShareData(library = [], username = 'Pilot', period = 'all') {
  const safeLibrary = Array.isArray(library) ? library : [];
  const validPeriod = ['weekly', 'monthly'].includes(period) ? period : 'all';

  let totalMinutes = 0;
  let steamMinutes = 0;
  let mostPlayed = [];
  let sessionCount = 0;
  let gameCount = safeLibrary.length;
  let steamGameCount = 0;

  try {
    const dashboard = StatsAggregationService.getDashboardData(safeLibrary);
    const snapshot = dashboard?.periods?.[validPeriod] || {};
    const topGames = snapshot?.topGames || [];

    if (validPeriod !== 'all') {
      totalMinutes = snapshot?.playtimeMinutes || 0;
      sessionCount = snapshot?.sessions || 0;
      gameCount = snapshot?.uniqueGames || 0;
      mostPlayed = topGames.slice(0, 4).filter((game) => game.totalPlaytime > 0);
      const steamTopGames = topGames.filter((game) => String(game?.platform).toLowerCase() === 'steam');
      steamMinutes = steamTopGames.reduce((sum, game) => sum + (game.totalPlaytime || 0), 0);
      steamGameCount = steamTopGames.length;
    } else {
      // All-time: use session history for sessions and top games, but total playtime from
      // library import (which includes Steam history) to match the headline number.
      sessionCount = snapshot?.sessions || dashboard?.totalSessionsRecorded || 0;
      mostPlayed = topGames.slice(0, 4).filter((game) => game.totalPlaytime > 0);
      const steamTopGames = topGames.filter((game) => String(game?.platform).toLowerCase() === 'steam');
      steamMinutes = steamTopGames.reduce((sum, game) => sum + (game.totalPlaytime || 0), 0);
      steamGameCount = steamTopGames.length;
    }
  } catch (error) {
    console.warn('Failed to compute period recap, falling back to all-time:', error);
  }

  if (validPeriod === 'all' || totalMinutes === 0) {
    totalMinutes = safeLibrary.reduce((sum, game) => sum + resolvePlaytime(game), 0);
    if (validPeriod === 'all') {
      const steamGames = safeLibrary.filter((game) => String(game?.platform || game?.brandPlatform || '').toLowerCase() === 'steam');
      steamMinutes = steamGames.reduce((sum, game) => sum + resolvePlaytime(game), 0);
      steamGameCount = steamGames.length;
      // Fallback: if dashboard didn't give a session count, sum library launch counts
      if (sessionCount === 0) {
        sessionCount = safeLibrary.reduce((sum, game) => sum + (game?.launch_count || game?.sessions || 0), 0);
      }
    }
    if (mostPlayed.length === 0) {
      mostPlayed = [...safeLibrary]
        .sort((left, right) => resolvePlaytime(right) - resolvePlaytime(left))
        .slice(0, 4)
        .filter((game) => resolvePlaytime(game) > 0);
    }
  }

  const libraryValue = LibraryValueService.calculateLibraryValue(safeLibrary);

  const currency = getCurrentCurrency();
  const totalValue = libraryValue?.totalValue || 0;

  return {
    username,
    period: validPeriod,
    gameCount,
    totalMinutes,
    totalHours: formatPlaytime(totalMinutes),
    steamMinutes,
    steamHours: formatPlaytime(steamMinutes),
    steamGameCount,
    mostPlayed,
    sessionCount,
    totalValue,
    formattedTotalValue: formatPrice(totalValue, currency),
    currency
  };
}

const TopGameRow = ({ index, game, showSessions }) => {
  if (!game) return null;
  const playtime = formatPlaytime(game?.totalPlaytime || resolvePlaytime(game));
  const sessions = game?.sessions || game?.playCount || 0;
  return (
    <div className="library-share-top-game">
      <span className="library-share-top-game-rank">#{index + 1}</span>
      <div className="library-share-top-game-info">
        <strong>{game.name}</strong>
        <span>
          {playtime}
          {showSessions && sessions > 0 ? ` · ${sessions} session${sessions !== 1 ? 's' : ''}` : ''}
        </span>
      </div>
    </div>
  );
};

const paletteToCssVars = (palette) => {
  if (!palette || typeof palette !== 'object') return {};
  return {
    '--recap-bg': palette.background,
    '--recap-accent': palette.accent,
    '--recap-glow': palette.glow,
    '--recap-text': palette.text,
    '--recap-muted': palette.muted,
    '--recap-surface': palette.surface,
    '--recap-surface-border': palette.surfaceBorder
  };
};

export function LibraryShareCard({ library, username, period, theme = null, visibleStats = null, showCover = true, watermark = 'gamepilot' }) {
  const data = buildLibraryShareData(library, username, period);
  const showSessions = data.sessionCount > 0;
  const topGame = data.mostPlayed?.[0];
  const coverUrl = showCover && topGame ? resolveGameArtwork(topGame, { surface: 'hero' }) : null;

  const stats = visibleStats && typeof visibleStats === 'object' ? visibleStats : {};
  const show = (key) => stats[key] !== false; // default visible
  const stripStats = [
    { key: 'games', value: data.gameCount, label: 'games' },
    { key: 'sessions', value: data.sessionCount, label: 'sessions' },
    { key: 'steamHours', value: data.steamHours, label: 'Steam hours' },
    { key: 'libraryValue', value: data.formattedTotalValue || `$${data.totalValue.toFixed(0)}`, label: 'library value' }
  ].filter((stat) => {
    // If no sessions have been tracked locally, showing "0 sessions" next to hundreds
    // of hours of Steam playtime looks broken. Hide it unless the user explicitly
    // toggled it on.
    if (stat.key === 'sessions' && data.sessionCount === 0 && stats.sessions !== true) {
      return false;
    }
    return show(stat.key);
  });

  const rootStyle = {
    width: LIBRARY_SHARE_CARD_SIZE_PX,
    height: LIBRARY_SHARE_CARD_SIZE_PX,
    ...paletteToCssVars(theme)
  };

  return (
    <div className="library-share-card" style={rootStyle}>
      {coverUrl && (
        <>
          <div
            className="library-share-card-cover"
            style={{ backgroundImage: `url(${coverUrl})` }}
            aria-hidden="true"
          />
          <div className="library-share-card-cover-overlay" aria-hidden="true" />
        </>
      )}
      <div className="library-share-card-glow" aria-hidden="true" />
      <Gamepad2 className="library-share-watermark" size={320} aria-hidden="true" />

      <div className="library-share-card-header">
        <span className="library-share-card-brand">GAMEPILOT</span>
        <span className="library-share-card-tag">{PERIOD_LABELS[data.period] || 'Library Recap'}</span>
      </div>

      <div className="library-share-card-body">
        <span className="library-share-card-eyebrow">
          {data.username || 'Pilot'} · {PERIOD_LABELS[data.period] || 'My Ultimate Library'}
        </span>

        <div className="library-share-card-headline">
          <div className="library-share-card-stat">
            <strong>{data.totalHours}</strong>
            <span>total playtime</span>
          </div>
        </div>

        {stripStats.length > 0 && (
          <div
            className="library-share-card-strip"
            style={{ gridTemplateColumns: `repeat(${stripStats.length}, 1fr)` }}
          >
            {stripStats.map((stat) => (
              <div key={stat.key}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        )}

        {show('topGames') && data.mostPlayed.length > 0 && (
          <div className="library-share-card-top-games">
            <span className="library-share-card-section-label">Most played</span>
            <div className="library-share-card-top-games-list">
              {data.mostPlayed.map((game, index) => (
                <TopGameRow key={game.id || game.name || index} index={index} game={game} showSessions={showSessions} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="library-share-card-footer">
        <ShareCardWatermark
          watermark={watermark}
          context="library"
          ctaClassName="library-share-card-cta"
          taglineClassName="library-share-card-tagline"
        />
      </div>
    </div>
  );
}

export default LibraryShareCard;
