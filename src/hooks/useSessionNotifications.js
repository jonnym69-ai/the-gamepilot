import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/Toast';
import { RECOMMENDATION_OUTCOME, UserBehaviorProfile } from '../services/UserBehaviorProfile';

/**
 * Listens for `gamepilot:session-ended` events and shows the
 * session-saved toast plus the recommendation outcome prompt.
 *
 * Returns:
 *   - recommendationOutcomePrompt: { ...detail, recommendationSession } or null
 *   - submitRecommendationOutcome(outcome): record user feedback
 *   - disableRecommendationOutcomePrompts(): turn off the prompt permanently
 */
export default function useSessionNotifications() {
  const [recommendationOutcomePrompt, setRecommendationOutcomePrompt] = useState(null);
  const { success: toastSuccess, info: toastInfo } = useToast();

  useEffect(() => {
    const handleSessionEnded = (event) => {
      const detail = event?.detail;
      if (!detail?.gameName) return;
      const minutes = Number(detail?.playtimeMinutes) || 0;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeString = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      toastSuccess(`Session saved: +${timeString} to ${detail.gameName}`, 5000);

      const feedbackPreferences = UserBehaviorProfile.getFeedbackPreferences();
      if (
        detail.recommendationType &&
        feedbackPreferences.sessionPromptEnabled &&
        !detail.recoveredSession &&
        !detail.shutdownSession
      ) {
        const recommendationSession = UserBehaviorProfile.recordRecommendationSession(
          detail.gameId,
          detail.gameName,
          detail
        );
        if (recommendationSession) {
          setRecommendationOutcomePrompt({ ...detail, recommendationSession });
        }
      }
    };

    window.addEventListener('gamepilot:session-ended', handleSessionEnded);
    return () => window.removeEventListener('gamepilot:session-ended', handleSessionEnded);
  }, [toastSuccess]);

  // Warn once when process monitoring gives up on a running session —
  // playtime keeps accruing but nothing will detect the exit automatically.
  useEffect(() => {
    const handleMonitorTimeout = (event) => {
      const gameName = event?.detail?.gameName;
      if (!gameName) return;
      toastInfo(
        `GamePilot can't detect ${gameName}'s process, so this session won't auto-end. End it from Home when you finish.`,
        8000
      );
    };
    window.addEventListener('gamepilot:monitor-timeout', handleMonitorTimeout);
    return () => window.removeEventListener('gamepilot:monitor-timeout', handleMonitorTimeout);
  }, [toastInfo]);

  const submitRecommendationOutcome = useCallback(
    (outcome) => {
      if (!recommendationOutcomePrompt || !Object.values(RECOMMENDATION_OUTCOME).includes(outcome)) {
        setRecommendationOutcomePrompt(null);
        return;
      }

      const metadata = {
        gameName: recommendationOutcomePrompt.gameName,
        mood: recommendationOutcomePrompt.mood,
        genre: recommendationOutcomePrompt.genre,
        playtimeMinutes: recommendationOutcomePrompt.playtimeMinutes,
        recommendationType: recommendationOutcomePrompt.recommendationType,
        source: recommendationOutcomePrompt.recommendationSource || 'recommendation',
      };
      UserBehaviorProfile.trackRecommendationOutcome(recommendationOutcomePrompt.gameId, outcome, metadata);
      if (outcome !== RECOMMENDATION_OUTCOME.NOT_NOW) {
        UserBehaviorProfile.trackSessionFeedback(
          recommendationOutcomePrompt.gameName,
          outcome === RECOMMENDATION_OUTCOME.GREAT_PICK,
          { ...metadata, gameId: recommendationOutcomePrompt.gameId }
        );
      }

      const message =
        outcome === RECOMMENDATION_OUTCOME.GREAT_PICK
          ? 'Great — GamePilot will favor picks like this.'
          : outcome === RECOMMENDATION_OUTCOME.NOT_NOW
            ? 'Got it — this game will stay out of recommendations for a while.'
            : 'Understood — GamePilot will stop recommending this game.';
      toastInfo(message, 5000);
      setRecommendationOutcomePrompt(null);
    },
    [recommendationOutcomePrompt, toastInfo]
  );

  const disableRecommendationOutcomePrompts = useCallback(() => {
    UserBehaviorProfile.setFeedbackPromptEnabled('session', false);
    setRecommendationOutcomePrompt(null);
  }, []);

  return { recommendationOutcomePrompt, submitRecommendationOutcome, disableRecommendationOutcomePrompts };
}
