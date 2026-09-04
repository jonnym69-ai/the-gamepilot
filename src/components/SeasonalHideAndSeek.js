import React, { useState, useMemo, useCallback } from 'react';
import { SeasonalHideAndSeekService } from '../services/SeasonalHideAndSeekService';
import './SeasonalHideAndSeek.css';

const STORAGE_DISMISS_KEY = 'seasonalHideAndSeekDismissed';

const SeasonalHideAndSeek = () => {
  const [showCelebration, setShowCelebration] = useState(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_DISMISS_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const activeEvent = SeasonalHideAndSeekService.getActiveEvent();
      if (!activeEvent) return false;
      return parsed[activeEvent.id]?.year === new Date().getFullYear();
    } catch {
      return false;
    }
  });

  const activeEvent = useMemo(() => SeasonalHideAndSeekService.getActiveEvent(), []);
  const progress = useMemo(() => {
    if (!activeEvent) return null;
    return SeasonalHideAndSeekService.getProgress(activeEvent.id);
  }, [activeEvent]);

  const handleFindItem = useCallback((itemId) => {
    if (!activeEvent) return;
    const result = SeasonalHideAndSeekService.findItem(activeEvent.id, itemId);
    if (!result) return;

    if (result.alreadyFound) return;

    if (result.justCompleted) {
      setShowCelebration({ type: 'complete', eventName: activeEvent.name, reward: activeEvent.rewardName });
    } else {
      setShowCelebration({ type: 'found', itemEmoji: activeEvent.itemEmoji, count: result.found.length, total: activeEvent.totalItems });
    }

    setTimeout(() => setShowCelebration(null), 3000);
  }, [activeEvent]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      const raw = localStorage.getItem(STORAGE_DISMISS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      if (activeEvent) {
        parsed[activeEvent.id] = { year: new Date().getFullYear() };
      }
      localStorage.setItem(STORAGE_DISMISS_KEY, JSON.stringify(parsed));
    } catch {
      // ignore
    }
  }, [activeEvent]);

  if (!activeEvent || !progress || dismissed) return null;

  const allFound = progress.completed;

  return (
    <>
      {/* Hidden items scattered in the UI */}
      {!allFound && Array.from({ length: activeEvent.totalItems }, (_, i) => i).map((i) => {
        const itemId = `${activeEvent.id}-item-${i}`;
        const isFound = progress.found.includes(itemId);
        if (isFound) return null;

        return (
          <button
            key={itemId}
            className="seasonal-hide-seek-item"
            onClick={() => handleFindItem(itemId)}
            aria-label={`Hidden ${activeEvent.itemName} ${i + 1}`}
            title={`You found a hidden ${activeEvent.itemName}!`}
            style={{
              position: 'fixed',
              left: `${5 + ((i * 17) + ((Date.now() / 1000) % 7)) % 90}%`,
              top: `${8 + ((i * 23) + ((Date.now() / 1000) % 11)) % 80}%`,
              zIndex: 9999
            }}
          >
            <span className="seasonal-hide-seek-emoji">{activeEvent.itemEmoji}</span>
          </button>
        );
      })}

      {/* Tracker badge */}
      <div className="seasonal-hide-seek-tracker">
        <div className="seasonal-hide-seek-tracker-header">
          <span className="seasonal-hide-seek-tracker-icon">{activeEvent.icon}</span>
          <div className="seasonal-hide-seek-tracker-info">
            <span className="seasonal-hide-seek-tracker-title">{activeEvent.name}</span>
            <span className="seasonal-hide-seek-tracker-sub">
              {allFound ? 'Complete! 🎉' : `${progress.found.length} / ${activeEvent.totalItems} found`}
            </span>
          </div>
          <button
            className="seasonal-hide-seek-dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss"
            title="Hide until next event"
          >
            ×
          </button>
        </div>
        <div className="seasonal-hide-seek-tracker-bar">
          <div
            className="seasonal-hide-seek-tracker-fill"
            style={{ width: `${progress.progressPercent}%` }}
          />
        </div>
        <div className="seasonal-hide-seek-tracker-items">
          {Array.from({ length: activeEvent.totalItems }, (_, i) => (
            <span
              key={i}
              className={`seasonal-hide-seek-tracker-dot ${progress.found.includes(`${activeEvent.id}-item-${i}`) ? 'found' : ''}`}
            >
              {activeEvent.itemEmoji}
            </span>
          ))}
        </div>
      </div>

      {/* Celebration toast */}
      {showCelebration && (
        <div className={`seasonal-hide-seek-toast ${showCelebration.type === 'complete' ? 'complete' : 'found'}`}>
          {showCelebration.type === 'complete' ? (
            <>
              <span className="seasonal-hide-seek-toast-emoji">🏆</span>
              <div>
                <strong>{showCelebration.eventName} Complete!</strong>
                <span>You earned: {showCelebration.reward} (+{activeEvent.xpReward} XP)</span>
              </div>
            </>
          ) : (
            <>
              <span className="seasonal-hide-seek-toast-emoji">{showCelebration.itemEmoji}</span>
              <div>
                <strong>Found one!</strong>
                <span>{showCelebration.count} of {showCelebration.total} {activeEvent.itemName}s</span>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default SeasonalHideAndSeek;
