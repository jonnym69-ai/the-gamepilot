import React, { useMemo } from 'react';
import { RecommendationExplainer } from '../services/RecommendationExplainer';
import './RecommendationReasonChip.css';

export function RecommendationReasonChip({ game, mood, genre, timeAvailable, recommendationType = 'perfect-play' }) {
  const explanation = useMemo(() => {
    if (!game) return null;
    return RecommendationExplainer.getDetailedExplanation(game, mood, genre, timeAvailable, recommendationType);
  }, [game, mood, genre, timeAvailable, recommendationType]);

  if (!explanation || !explanation.reasons?.length) return null;

  return (
    <div className="recommendation-reason-chip" title={explanation.fullExplanation}>
      <span className="recommendation-reason-confidence">
        {Math.round(explanation.confidence)}% match
      </span>
      <span className="recommendation-reason-text">
        {explanation.reasons[0]}
      </span>
    </div>
  );
}
