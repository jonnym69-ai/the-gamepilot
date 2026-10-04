import React, { useState, useMemo, useCallback } from 'react';
import { SeasonalHideAndSeekService } from '../services/SeasonalHideAndSeekService';
import './SeasonalHideAndSeek.css';

const STORAGE_DISMISS_KEY = 'seasonalHideAndSeekDismissed';

// Deterministic hash → 0..1 so each hidden item keeps a stable spot between
// renders (re-computing positions from Date.now() made them jump around).
const hashUnit = (seed) => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
};

// Items are kept inside the top ~70% and left ~78% of the viewport so they
// never spawn underneath the tracker badge pinned bottom-right.
const itemPosition = (seed) => ({
  left: `${(4 + hashUnit(`${seed}:x`) * 74).toFixed(2)}%`,
  top: `${(8 + hashUnit(`${seed}:y`) * 62).toFixed(2)}%`,
});

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
  const [progress, setProgress] = useState(() =>
    activeEvent ? SeasonalHideAndSeekService.getProgress(activeEvent.id) : null
  );

  const handleFindItem = useCallback(
    (itemId) => {
      if (!activeEvent) return;
      const result = SeasonalHideAndSeekService.findItem(activeEvent.id, itemId);
      if (!result || result.alreadyFound) return;

      setProgress(SeasonalHideAndSeekService.getProgress(activeEvent.id));

      if (result.justCompleted) {
        setShowCelebration({ type: 'complete', eventName: activeEvent.name, reward: activeEvent.rewardName });
      } else {
        setShowCelebration({
          type: 'found',
          itemEmoji: activeEvent.itemEmoji,
          count: result.found.length,
          total: activeEvent.totalItems,
        });
      }

      setTimeout(() => setShowCelebration(null), 3000);
    },
    [activeEvent]
  );

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
      {!allFound &&
        Array.from({ length: activeEvent.totalItems }, (_, i) => i).map((i) => {
          const itemId = `${activeEvent.id}-item-${i}`;
          if (progress.found.includes(itemId)) return null;

          return (
            <button
              key={itemId}
              className="seasonal-hide-seek-item"
              onClick={() => handleFindItem(itemId)}
              aria-label={`Hidden ${activeEvent.itemName} ${i + 1}`}
              title={`You found a hidden ${activeEvent.itemName}!`}
              style={{
                position: 'fixed',
                ...itemPosition(`${activeEvent.id}-${new Date().getFullYear()}-item-${i}`),
                zIndex: 9999,
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
          <div className="seasonal-hide-seek-tracker-fill" style={{ width: `${progress.progressPercent}%` }} />
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
                <span>
                  You earned: {showCelebration.reward} (+{activeEvent.xpReward} XP)
                </span>
              </div>
            </>
          ) : (
            <>
              <span className="seasonal-hide-seek-toast-emoji">{showCelebration.itemEmoji}</span>
              <div>
                <strong>Found one!</strong>
                <span>
                  {showCelebration.count} of {showCelebration.total} {activeEvent.itemName}s
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default SeasonalHideAndSeek;
