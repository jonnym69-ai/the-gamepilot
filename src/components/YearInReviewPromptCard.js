import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, X } from 'lucide-react';
import { YearInReviewService } from '../services/YearInReviewService';
import { getRecapSeasonYear } from '../utils/recapSeason';
import StorageService from '../services/StorageService';
import { EraTimelineBar } from './EraTimelineBar';
import './YearInReviewPromptCard.css';

const DISMISSED_KEY = 'yearInReviewPromptDismissedV1';
// Below this a "year" is a handful of sessions — the recap exists, but a
// card announcing it would overstate what there is to look back on.
const MIN_SESSIONS = 3;

const eraPhrase = (name = '') => String(name).replace(/^the\s+/i, 'the ');

export default function YearInReviewPromptCard({ library = [], now }) {
  const [dismissed, setDismissed] = React.useState(() => StorageService.getString(DISMISSED_KEY));

  const prompt = React.useMemo(() => {
    const year = getRecapSeasonYear(now);
    if (year === null) return null;
    try {
      const snapshot = YearInReviewService.getYearSnapshot(library, year);
      if (!snapshot?.hasData || (snapshot.summary?.sessions || 0) < MIN_SESSIONS) return null;
      const stretches = Array.isArray(snapshot.eras?.stretches) ? snapshot.eras.stretches : [];
      const topEra =
        stretches.reduce(
          (best, era) => ((era?.playtimeMinutes || 0) > (best?.playtimeMinutes || 0) ? era : best),
          null
        ) || null;
      const topGame = snapshot.topGames?.[0]?.name || null;
      const finishedCount = Array.isArray(snapshot.milestones?.finished) ? snapshot.milestones.finished.length : 0;
      return { year, summary: snapshot.summary, topEra, topGame, stretches, finishedCount };
    } catch (error) {
      console.warn('YearInReviewPromptCard: snapshot failed', error);
      return null;
    }
  }, [library, now]);

  if (!prompt || dismissed === String(prompt.year)) return null;

  const handleDismiss = () => {
    StorageService.setString(DISMISSED_KEY, String(prompt.year));
    setDismissed(String(prompt.year));
  };

  const { year, summary, topEra, topGame, stretches, finishedCount } = prompt;
  const headline = `${summary.playtimeHours}h across ${summary.uniqueGames} game${summary.uniqueGames === 1 ? '' : 's'}`;
  const finishedLine =
    finishedCount > 0 ? ` You finished ${finishedCount} game${finishedCount === 1 ? '' : 's'} this year.` : '';
  const teaser = topEra
    ? `${headline} — and it was the year of ${eraPhrase(topEra.name)}.${finishedLine}`
    : topGame
      ? `${headline} — ${topGame} led the way.${finishedLine}`
      : `${headline}, all tracked locally.${finishedLine}`;

  return (
    <aside className="yir-prompt-card" aria-label="Year in review">
      <button
        type="button"
        className="yir-prompt-dismiss"
        onClick={handleDismiss}
        aria-label={`Dismiss ${year} year in review`}
      >
        <X size={14} aria-hidden="true" />
      </button>
      <p className="yir-prompt-eyebrow">Year in review</p>
      <h3 className="yir-prompt-heading">Your {year} in review is ready</h3>
      <p className="yir-prompt-teaser">{teaser}</p>
      {stretches.length > 0 && (
        <div className="yir-prompt-timeline">
          <EraTimelineBar stretches={stretches} compact />
        </div>
      )}
      <Link to={`/year-in-review?year=${year}&tab=milestones&wrapped=1`} className="yir-prompt-cta">
        Watch your year <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </aside>
  );
}
