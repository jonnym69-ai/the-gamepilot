import React, { useMemo } from 'react';
import { Fingerprint } from 'lucide-react';
import { UserBehaviorProfile } from '../services/UserBehaviorProfile';
import './TasteFingerprint.css';

/**
 * Taste Fingerprint — a compact, identity-derived view of the player's top
 * genres and moods rendered as proportional bars. Reads directly from
 * UserBehaviorProfile so it always reflects real, local play behavior.
 */
function TasteFingerprint({ limit = 4 }) {
  const { genres, moods } = useMemo(() => {
    let topGenres = [];
    let topMoods = [];
    try {
      topGenres = UserBehaviorProfile.getTopGenres(limit) || [];
    } catch {
      topGenres = [];
    }
    try {
      topMoods = UserBehaviorProfile.getTopMoods(limit) || [];
    } catch {
      topMoods = [];
    }
    return { genres: topGenres, moods: topMoods };
  }, [limit]);

  const maxGenreCount = Math.max(1, ...genres.map((g) => g.count || 0));
  const maxMoodCount = Math.max(1, ...moods.map((m) => m.count || 0));

  if (genres.length === 0 && moods.length === 0) {
    return (
      <div className="taste-fingerprint taste-fingerprint--empty">
        <Fingerprint size={18} />
        <p>Your taste fingerprint builds as you play and track sessions.</p>
      </div>
    );
  }

  return (
    <div className="taste-fingerprint">
      <div className="taste-fingerprint-header">
        <Fingerprint size={16} />
        <span>Taste Fingerprint</span>
      </div>

      <div className="taste-fingerprint-columns">
        {genres.length > 0 && (
          <div className="taste-fingerprint-column">
            <h5>Top Genres</h5>
            {genres.map((entry) => (
              <div key={entry.genre} className="taste-fingerprint-row">
                <span className="taste-fingerprint-label">{entry.genre}</span>
                <div className="taste-fingerprint-bar-track">
                  <div
                    className="taste-fingerprint-bar taste-fingerprint-bar--genre"
                    style={{ width: `${Math.round(((entry.count || 0) / maxGenreCount) * 100)}%` }}
                  />
                </div>
                <span className="taste-fingerprint-count">{entry.count}</span>
              </div>
            ))}
          </div>
        )}

        {moods.length > 0 && (
          <div className="taste-fingerprint-column">
            <h5>Top Moods</h5>
            {moods.map((entry) => (
              <div key={entry.mood} className="taste-fingerprint-row">
                <span className="taste-fingerprint-label">{entry.mood}</span>
                <div className="taste-fingerprint-bar-track">
                  <div
                    className="taste-fingerprint-bar taste-fingerprint-bar--mood"
                    style={{ width: `${Math.round(((entry.count || 0) / maxMoodCount) * 100)}%` }}
                  />
                </div>
                <span className="taste-fingerprint-count">{entry.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TasteFingerprint;
