import { useEffect, useCallback } from 'react';
import { useToast } from './Toast';
import { ProgressionUnlockService } from '../services/ProgressionUnlockService';

/**
 * UnlockNotifier - Watches for newly unlocked rewards and shows toast notifications
 * Place this component inside ToastProvider (usually in App.js)
 */
export function useUnlockNotifications() {
  const { success, info } = useToast();

  const showUnlockNotifications = useCallback(() => {
    const { newlyUnlocked, hasNewUnlocks } = ProgressionUnlockService.getRewardUnlockNotifications();
    
    if (!hasNewUnlocks || newlyUnlocked.length === 0) {
      return;
    }

    // Show notification for each newly unlocked reward (limit to 3 at a time)
    const toShow = newlyUnlocked.slice(0, 3);
    
    toShow.forEach((reward, index) => {
      setTimeout(() => {
        success(
          `${reward.icon || '🎁'} Unlocked: ${reward.name}${reward.category ? ` (${reward.category})` : ''}!`,
          4000
        );
      }, index * 600); // Stagger notifications
    });

    // If there are more, show a summary
    if (newlyUnlocked.length > 3) {
      setTimeout(() => {
        info(`+${newlyUnlocked.length - 3} more rewards unlocked! Check your profile.`, 3000);
      }, 2500);
    }

    // Mark these rewards as seen
    const rewardIds = newlyUnlocked.map(r => r.id);
    ProgressionUnlockService.markRewardsAsSeen(rewardIds);
  }, [success, info]);

  return { showUnlockNotifications };
}

export function UnlockNotifier() {
  const { showUnlockNotifications } = useUnlockNotifications();

  useEffect(() => {
    // Check for unlocks on mount (page load)
    const timer = setTimeout(() => {
      showUnlockNotifications();
    }, 1500); // Delay to let app fully load

    return () => clearTimeout(timer);
  }, [showUnlockNotifications]);

  // Also check periodically when XP might change (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      showUnlockNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [showUnlockNotifications]);

  return null; // This component doesn't render anything visible
}

export default UnlockNotifier;
