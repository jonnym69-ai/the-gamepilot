import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/Toast';
import { RECOMMENDATION_OUTCOME, UserBehaviorProfile } from '../services/UserBehaviorProfile';
import StorageService from '../services/StorageService';
import { generateSessionRoast } from '../services/SessionRoastService';
import { generateRivalryToast } from '../services/RivalryService';
import { checkStreakMilestone, updateStreakCharacterization } from '../services/StreakCharacterizerService';
import { storeSnapshot, checkIdentityShiftToast } from '../services/IdentityShiftService';

/**
 * Listens for `gamepilot:session-ended` events and shows toast
 * notifications (roasts, rivalry, streak milestones, identity shifts)
 * plus the recommendation outcome prompt.
 *
 * Returns:
 *   - recommendationOutcomePrompt: { ...detail, recommendationSession } or null
 *   - submitRecommendationOutcome(outcome): record user feedback
 *   - disableRecommendationOutcomePrompts(): turn off the prompt permanently
 */
export default function useSessionNotifications() {
  const [recommendationOutcomePrompt, setRecommendationOutcomePrompt] = useState(null);
  const { success: toastSuccess, info: toastInfo, roast: toastRoast } = useToast();

  useEffect(() => {
    const handleSessionEnded = (event) => {
      const detail = event?.detail;
      if (!detail?.gameName) return;
      const minutes = Number(detail?.playtimeMinutes) || 0;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeString = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      // Generate personality-driven roast toast for real sessions
      const personalityEnabled = StorageService.getString('personalityToastsEnabled', 'true') === 'true';
      if (personalityEnabled && !detail?.recoveredSession && !detail?.shutdownSession && minutes > 0) {
        try {
          const roast = generateSessionRoast(detail);
          if (roast?.message) {
            toastRoast(roast.message, 6000);
          } else {
            toastSuccess(`Session saved: +${timeString} to ${detail.gameName}`, 5000);
          }
        } catch {
          toastSuccess(`Session saved: +${timeString} to ${detail.gameName}`, 5000);
        }
      } else {
        toastSuccess(`Session saved: +${timeString} to ${detail.gameName}`, 5000);
      }

      // Check for active rivalry (throttled to once per day inside the service)
      if (personalityEnabled && !detail?.recoveredSession && !detail?.shutdownSession) {
        try {
          const rivalryToast = generateRivalryToast();
          if (rivalryToast?.message) {
            setTimeout(() => toastRoast(rivalryToast.message, 6000), 1500);
          }
        } catch {
          /* non-critical */
        }

        // Check for streak milestone (throttled inside the service)
        try {
          updateStreakCharacterization();
          const milestone = checkStreakMilestone();
          if (milestone?.message) {
            setTimeout(() => toastRoast(milestone.message, 6000), 3000);
          }
        } catch {
          /* non-critical */
        }

        // Store persona snapshot and check for identity shift (throttled per quarter)
        try {
          storeSnapshot();
          const shift = checkIdentityShiftToast();
          if (shift?.message) {
            setTimeout(() => toastRoast(shift.message, 7000), 4500);
          }
        } catch {
          /* non-critical */
        }
      }

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
  }, [toastSuccess, toastRoast]);

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
