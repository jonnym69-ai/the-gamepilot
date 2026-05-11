import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, Sparkles } from 'lucide-react';
import './NeverLaunchedInsight.css';

const isNeverLaunched = (game) => {
  if (!game || typeof game !== 'object') return false;
  const timePlayed = Number(game.time_played) || 0;
  const launchCount = Number(game.launch_count) || 0;
  const totalPlaytime = Number(game?.playtime?.total) || 0;
  return timePlayed === 0 && launchCount === 0 && totalPlaytime === 0;
};

/**
 * Surfaces the uncomfortable-truth backlog count: how many games the
 * user owns but has never opened. A genuinely GamePilot-native insight
 * (Steam structurally cannot show this — they want sales, not honesty).
 *
 * Hidden when the count is too low to be interesting.
 */
export function NeverLaunchedInsight({ library = [], minimumCount = 5 }) {
  const navigate = useNavigate();

  const { neverLaunchedCount, totalCount, percentOfLibrary } = useMemo(() => {
    const safeLibrary = Array.isArray(library) ? library : [];
    const total = safeLibrary.length;
    const neverCount = safeLibrary.filter(isNeverLaunched).length;
    return {
      neverLaunchedCount: neverCount,
      totalCount: total,
      percentOfLibrary: total > 0 ? Math.round((neverCount / total) * 100) : 0
    };
  }, [library]);

  if (neverLaunchedCount < minimumCount) {
    return null;
  }

  const handleOpenBacklog = () => {
    navigate('/library?filter=never-played');
  };

  return (
    <aside className="never-launched-insight" aria-label="Backlog insight">
      <div className="never-launched-insight-icon">
        <Inbox size={28} />
      </div>
      <div className="never-launched-insight-copy">
        <span className="never-launched-insight-eyebrow">Your shelf, honestly</span>
        <h3>
          You own <strong>{totalCount}</strong> games. You've never opened{' '}
          <strong>{neverLaunchedCount}</strong> of them.
        </h3>
        <p>
          That's {percentOfLibrary}% of your library waiting on you. GamePilot can
          help you find one worth your next evening.
        </p>
      </div>
      <button
        type="button"
        className="never-launched-insight-cta"
        onClick={handleOpenBacklog}
      >
        <Sparkles size={16} />
        <span>Show the backlog</span>
      </button>
    </aside>
  );
}

export default NeverLaunchedInsight;
