import React, { useMemo } from 'react';
import { Clock, Trophy, Gamepad2, TrendingUp } from 'lucide-react';
import { StatsAggregationService } from '../services/StatsAggregationService';

/**
 * WeeklyDigestCard — a persistent on-home summary of this week's gaming.
 * Shows hours played, games played, top game, and sessions count.
 * Refreshes automatically when the library changes.
 */
const WeeklyDigestCard = ({ library = [] }) => {
  const stats = useMemo(() => {
    try {
      const data = StatsAggregationService.getDashboardData(library);
      const weekly = data?.periods?.weekly;
      if (!weekly) return null;

      const totalMinutes = weekly.totalPlaytimeMinutes || 0;
      const hours = Math.floor(totalMinutes / 60);
      const mins = totalMinutes % 60;
      const timeStr = hours > 0
        ? mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
        : mins > 0 ? `${mins}m` : '0m';

      const gamesPlayed = weekly.uniqueGames || 0;
      const sessions = weekly.sessionCount || 0;
      const topGames = weekly.topGames || [];
      const topGame = topGames[0]?.name || null;
      const topGameMinutes = topGames[0]?.playtimeMinutes || 0;

      const allTime = data?.periods?.all;
      const allTimeHours = allTime ? Math.floor((allTime.totalPlaytimeMinutes || 0) / 60) : 0;

      return { timeStr, hours, gamesPlayed, sessions, topGame, topGameMinutes, allTimeHours };
    } catch {
      return null;
    }
  }, [library]);

  if (!stats || (stats.hours === 0 && stats.sessions === 0)) return null;

  return (
    <div className="weekly-digest-card">
      <div className="weekly-digest-header">
        <TrendingUp size={16} />
        <span>This Week</span>
      </div>
      <div className="weekly-digest-stats">
        <div className="weekly-digest-stat">
          <Clock size={18} />
          <div className="weekly-digest-stat-content">
            <span className="weekly-digest-stat-value">{stats.timeStr}</span>
            <span className="weekly-digest-stat-label">played</span>
          </div>
        </div>
        <div className="weekly-digest-stat">
          <Gamepad2 size={18} />
          <div className="weekly-digest-stat-content">
            <span className="weekly-digest-stat-value">{stats.gamesPlayed}</span>
            <span className="weekly-digest-stat-label">game{stats.gamesPlayed === 1 ? '' : 's'}</span>
          </div>
        </div>
        <div className="weekly-digest-stat">
          <Trophy size={18} />
          <div className="weekly-digest-stat-content">
            <span className="weekly-digest-stat-value">{stats.sessions}</span>
            <span className="weekly-digest-stat-label">session{stats.sessions === 1 ? '' : 's'}</span>
          </div>
        </div>
      </div>
      {stats.topGame && (
        <div className="weekly-digest-top-game">
          <span className="weekly-digest-top-game-label">Top game</span>
          <span className="weekly-digest-top-game-name">{stats.topGame}</span>
        </div>
      )}
    </div>
  );
};

export default WeeklyDigestCard;
