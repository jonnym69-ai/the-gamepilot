import React, { useEffect, useId, useState } from 'react';
import RecommendationPreferenceService, {
  CHANGE_EVENT,
  RECOMMENDATION_REASONS,
} from '../services/RecommendationPreferenceService';
import './RecommendationPreferenceControl.css';

/**
 * Optional "set aside" picker: pauses this game in recommendations until the
 * user chooses "Recommend normally". Unlike "Not this one" (visit-scoped),
 * this persists by exact game title — and stays reversible from the game's
 * details panel. It never implies dislike or edits the taste profile.
 */
export default function RecommendationPreferenceControl({ game }) {
  const labelId = useId();
  const gameName = game?.name || '';
  const [selected, setSelected] = useState(() => RecommendationPreferenceService.getPreference(gameName)?.reason || '');
  const [error, setError] = useState(false);

  useEffect(() => {
    const sync = () => {
      setSelected(RecommendationPreferenceService.getPreference(gameName)?.reason || '');
      setError(false);
    };
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, [gameName]);

  if (!gameName) return null;

  const handleChange = (event) => {
    const value = event.target.value;
    if (RecommendationPreferenceService.setPreference(gameName, value)) {
      setSelected(value);
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <div className="recommendation-preference">
      <label className="recommendation-preference-label" htmlFor={labelId}>
        Set aside
      </label>
      <select
        id={labelId}
        className="filter-select recommendation-preference-select"
        aria-label={`Recommendation preference for ${gameName}`}
        value={selected}
        onChange={handleChange}
      >
        <option value="">Recommend normally</option>
        {RECOMMENDATION_REASONS.map((reason) => (
          <option key={reason.value} value={reason.value}>
            {reason.label}
          </option>
        ))}
      </select>
      {selected && (
        <p className="recommendation-preference-note">
          Paused in recommendations until you choose Recommend normally. You can still launch this game from your
          library.
          {selected === 'refresher' && ' Your session notes and Guides in game details can help you return.'}
        </p>
      )}
      {error && (
        <p className="recommendation-preference-note" role="alert">
          Couldn’t save that preference. Try again.
        </p>
      )}
    </div>
  );
}
