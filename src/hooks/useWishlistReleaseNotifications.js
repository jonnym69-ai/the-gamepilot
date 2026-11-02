import { useEffect } from 'react';
import { useToast } from '../components/Toast';
import ReleaseTrackerService from '../services/ReleaseTrackerService';
import WishlistService from '../services/WishlistService';

/**
 * Announces wishlist games the day they release. Runs the cached/TTL-gated
 * release refresh once per app start, then toasts each newly-released game
 * exactly once (the service tracks announced appids). All data is local;
 * the only network use is the existing steam-store-details bridge inside
 * ReleaseTrackerService.refresh().
 */
export default function useWishlistReleaseNotifications() {
  const { info } = useToast();

  useEffect(() => {
    if (!ReleaseTrackerService.isEnabled() || !WishlistService.isEnabled()) return undefined;
    let cancelled = false;

    const check = async () => {
      await ReleaseTrackerService.refresh().catch(() => null);
      if (cancelled) return;
      const fresh = ReleaseTrackerService.consumeReleaseDayAnnouncements();
      if (cancelled || fresh.length === 0) return;
      fresh.forEach((release) => {
        info(`${release.name} is out today`, 9000, {
          label: 'View on Steam',
          onClick: () => {
            window.electronAPI?.openExternal?.(`https://store.steampowered.com/app/${release.appid}`);
          },
        });
      });
    };

    check();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
