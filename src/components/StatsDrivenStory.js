import React, { useMemo } from 'react';
import { Gamepad2, Trophy, Clock, Layers, Target, Sparkles } from 'lucide-react';
import './StatsDrivenStory.css';

const HOURS_THRESHOLD = 100;
const PERCENT_THRESHOLD = 50;
const NICHE_COUNT = 3;

function StatsDrivenStory({ library = [], libraryStats = null }) {
  const insights = useMemo(() => {
    if (!library?.length || !libraryStats) return [];

    const totalGames = library.length;
    const completedGames = library.filter((g) => g.completed || g.completionStatus === 'completed').length;
    const backlogGames = library.filter((g) => !g.completed && g.time_played && g.time_played > 0).length;
    const unplayedGames = library.filter((g) => !g.time_played || g.time_played === 0).length;

    const hoursByGenre = {};
    const hoursByPlatform = {};
    const gamesByGenre = {};
    const gamesByPlatform = {};

    library.forEach((game) => {
      const hours = (game.time_played || 0) / 60;
      const platform = game.platform || game.brandPlatform || 'Unknown';

      gamesByPlatform[platform] = (gamesByPlatform[platform] || 0) + 1;
      hoursByPlatform[platform] = (hoursByPlatform[platform] || 0) + hours;

      const genres = Array.isArray(game.genres) ? game.genres : [];
      genres.forEach((genre) => {
        if (!genre) return;
        gamesByGenre[genre] = (gamesByGenre[genre] || 0) + 1;
        hoursByGenre[genre] = (hoursByGenre[genre] || 0) + hours;
      });
    });

    const topPlatform = Object.entries(gamesByPlatform)
      .sort((a, b) => b[1] - a[1])[0];
    const topGenre = Object.entries(gamesByGenre)
      .sort((a, b) => b[1] - a[1])[0];
    const topHoursGenre = Object.entries(hoursByGenre)
      .sort((a, b) => b[1] - a[1])[0];
    const topHoursPlatform = Object.entries(hoursByPlatform)
      .sort((a, b) => b[1] - a[1])[0];

    const result = [];

    if (topPlatform) {
      const [platform, count] = topPlatform;
      const percent = Math.round((count / totalGames) * 100);
      if (percent >= PERCENT_THRESHOLD) {
        result.push({
          icon: <Gamepad2 size={18} />,
          title: 'Platform Loyalty',
          text: `**${platform}** dominates your library — **${count} games** (${percent}%) live there.`,
          highlight: platform
        });
      } else {
        result.push({
          icon: <Gamepad2 size={18} />,
          title: 'Platform Spread',
          text: `**${platform}** is your biggest launcher with **${count} games**, but your library is spread across ${Object.keys(gamesByPlatform).length} platforms.`,
          highlight: `${count} games`
        });
      }
    }

    if (topHoursGenre && topHoursGenre[1] >= HOURS_THRESHOLD) {
      const [genre, hours] = topHoursGenre;
      result.push({
        icon: <Clock size={18} />,
        title: 'Genre Time Sink',
        text: `You've sunk **${Math.round(hours)} hours** into **${genre}** games — that's your most-played genre.`,
        highlight: `${Math.round(hours)} hrs`
      });
    }

    if (topGenre) {
      const [genre, count] = topGenre;
      const percent = Math.round((count / totalGames) * 100);
      if (percent >= PERCENT_THRESHOLD) {
        result.push({
          icon: <Layers size={18} />,
          title: 'Genre Collection',
          text: `**${genre}** makes up **${percent}%** of your installed library (${count} games).`,
          highlight: `${percent}%`
        });
      }
    }

    // Niche collections (genres with >= NICHE_COUNT games but not the top genre)
    const nicheGenres = Object.entries(gamesByGenre)
      .filter(([genre, count]) => genre !== (topGenre?.[0]) && count >= NICHE_COUNT)
      .sort((a, b) => b[1] - a[1]);

    if (nicheGenres.length > 0) {
      const [genre, count] = nicheGenres[0];
      result.push({
        icon: <Target size={18} />,
        title: 'Niche Interest',
        text: `You keep **${count} ${genre}** games installed — a dedicated ${genre.toLowerCase()} collection.`,
        highlight: `${count} games`
      });
    }

    if (completedGames > 0) {
      const completionRate = Math.round((completedGames / totalGames) * 100);
      result.push({
        icon: <Trophy size={18} />,
        title: 'Completion Rate',
        text: `You've finished **${completedGames}** of your **${totalGames}** games — a **${completionRate}%** completion rate.`,
        highlight: `${completionRate}%`
      });
    } else if (unplayedGames > 0) {
      result.push({
        icon: <Trophy size={18} />,
        title: 'Fresh Library',
        text: `**${unplayedGames}** of your **${totalGames}** games haven't been played yet — lots of new worlds to explore.`,
        highlight: `${unplayedGames} unplayed`
      });
    }

    if (backlogGames > 0) {
      result.push({
        icon: <Sparkles size={18} />,
        title: 'Backlog Snapshot',
        text: `**${backlogGames}** started games are still waiting to be finished — your active backlog.`,
        highlight: `${backlogGames} backlog`
      });
    }

    if (topHoursPlatform && topHoursPlatform[1] > 0) {
      const [platform, hours] = topHoursPlatform;
      if (topPlatform?.[0] !== platform) {
        result.push({
          icon: <Clock size={18} />,
          title: 'Most Played Platform',
          text: `Most of your playtime is on **${platform}** with **${Math.round(hours)} hours** logged.`,
          highlight: `${Math.round(hours)} hrs`
        });
      }
    }

    return result.slice(0, 6);
  }, [library, libraryStats]);

  if (insights.length === 0) {
    return (
      <div className="stats-driven-story-empty">
        Play a few more games and GamePilot will build a story from your real stats.
      </div>
    );
  }

  return (
    <div className="stats-driven-story">
      {insights.map((insight, index) => (
        <div key={index} className="stats-driven-insight">
          <div className="stats-driven-insight-icon">{insight.icon}</div>
          <div className="stats-driven-insight-content">
            <div className="stats-driven-insight-title">{insight.title}</div>
            <div
              className="stats-driven-insight-text"
              dangerouslySetInnerHTML={{
                __html: insight.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              }}
            />
          </div>
          <div className="stats-driven-insight-highlight">{insight.highlight}</div>
        </div>
      ))}
    </div>
  );
}

export default StatsDrivenStory;
