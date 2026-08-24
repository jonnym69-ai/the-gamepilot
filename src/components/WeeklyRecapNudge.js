import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, X, TrendingUp } from 'lucide-react';
import { GamingStoryService } from '../services/GamingStoryService';
import GamingStoryPanel from './GamingStoryPanel';
import StorageService from '../services/StorageService';
import './WeeklyRecapNudge.css';

// Weekly recap nudge — checks on mount whether a new weekly story chapter
// is available (i.e. the week has rolled over since the user last saw it).
// If so, shows a small dismissible banner on Home. Clicking opens a modal
// with the full GamingStoryPanel. Once dismissed or viewed, it won't show
// again until the next week starts.
const SEEN_KEY = 'weeklyRecapLastSeen';

const getWeekKey = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
};

const WeeklyRecapNudge = ({ activePersona = null }) => {
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [story, setStory] = useState(null);

  // Check if a new weekly recap is available
  const recapAvailable = useMemo(() => {
    if (dismissed) return false;
    const frequency = GamingStoryService.getStoryFrequency();
    if (frequency === 'off') return false;
    if (frequency !== 'weekly') return false;

    // Check if the week has rolled over since last seen
    const lastSeen = StorageService.getString(SEEN_KEY, '') || '';
    const currentWeek = getWeekKey();
    if (lastSeen === currentWeek) return false;

    // Check if there's actually a story to show
    const existing = GamingStoryService.getPeriodStory();
    return Boolean(existing && existing.narrative);
  }, [dismissed]);

  // Generate/refresh the story when needed
  useEffect(() => {
    if (!recapAvailable) return;
    const refreshed = GamingStoryService.updatePeriodStory('weekly', activePersona, { force: false });
    if (refreshed) setStory(refreshed);
  }, [recapAvailable, activePersona]);

  const handleOpen = () => {
    setShowModal(true);
    StorageService.setString(SEEN_KEY, getWeekKey());
  };

  const handleDismiss = () => {
    setDismissed(true);
    StorageService.setString(SEEN_KEY, getWeekKey());
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  if (!recapAvailable) return null;

  return (
    <>
      <div className="weekly-recap-nudge">
        <div className="weekly-recap-nudge-content" onClick={handleOpen}>
          <div className="weekly-recap-nudge-icon">
            <BookOpen size={18} />
          </div>
          <div className="weekly-recap-nudge-text">
            <strong>Your weekly recap is ready</strong>
            <span>See what your gaming week looked like — top games, habits, and story.</span>
          </div>
          <div className="weekly-recap-nudge-cta">
            <span>Read</span>
            <TrendingUp size={14} />
          </div>
        </div>
        <button
          className="weekly-recap-nudge-close"
          onClick={handleDismiss}
          aria-label="Dismiss"
          title="Dismiss until next week"
        >
          <X size={14} />
        </button>
      </div>

      {showModal && story && (
        <div className="weekly-recap-modal-overlay" onClick={handleCloseModal}>
          <div className="weekly-recap-modal" onClick={(e) => e.stopPropagation()}>
            <button className="weekly-recap-modal-close" onClick={handleCloseModal} aria-label="Close">
              <X size={18} />
            </button>
            <GamingStoryPanel story={story} />
          </div>
        </div>
      )}
    </>
  );
};

export default WeeklyRecapNudge;
