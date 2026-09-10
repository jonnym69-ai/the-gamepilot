import { useEffect, useCallback } from 'react';
import CalendarXPService from '../services/CalendarXPService';
import { SeasonalRewardService } from '../services/SeasonalRewardService';

/**
 * Manages seasonal/calendar features — birthday, anniversary, and
 * Christmas rewards, plus seasonal play tracking.
 *
 * Needs:
 *   - library: the current library array (triggers reward re-checks)
 *
 * Returns:
 *   - trackGamePlay(game): called when a game is launched
 */
export default function useSeasonalFeatures({ library }) {
  // Process calendar rewards in the background (rechecks whenever the library changes).
  useEffect(() => {
    try {
      CalendarXPService.processBirthdayReward();
      CalendarXPService.checkAnniversaryReward();
      CalendarXPService.processChristmasReward();
    } catch (e) {
      console.warn('Calendar auto-reward check failed:', e);
    }
  }, [library]);

  const trackGamePlay = useCallback((game) => {
    SeasonalRewardService.trackGamePlay(game);
  }, []);

  return { trackGamePlay };
}
