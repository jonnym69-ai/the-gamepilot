import { useEffect } from 'react';
import { useToast } from '../components/Toast';
import { FreeGameRadar } from '../services/FreeGameRadar';
import StorageService from '../services/StorageService';

const SEEN_KEY = 'freeGameNotifiedIdsV1';
const SEEN_IDS_LIMIT = 400;

/**
 * Toasts when the free-games radar surfaces offers the player hasn't been
 * told about yet. The radar lives on Discover; this hook runs once per app
 * start so a new freebie gets announced even when nobody opens the section.
 * Each source seeds its seen-set silently the first time it succeeds — a
 * fresh install should not be greeted with "47 new free games".
 */
export default function useFreeGameNotifications() {
  const { info } = useToast();

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const [epic, giveaways] = await Promise.all([
        FreeGameRadar.getEpicRadar().catch(() => null),
        FreeGameRadar.getGiveaways().catch(() => null),
      ]);
      if (cancelled) return;

      const stored = StorageService.get(SEEN_KEY, null) || {};
      const next = {};
      const fresh = [];

      for (const [source, result] of [
        ['epic', epic],
        ['giveaways', giveaways],
      ]) {
        // Source failed — keep whatever was already seen so a later success
        // diffs against the real baseline instead of a poisoned partial set.
        if (!result?.games?.length) {
          next[source] = stored[source] || null;
          continue;
        }
        const ids = result.games.map((game) => game?.id).filter(Boolean);
        const seenBefore = stored[source];
        if (seenBefore === null || seenBefore === undefined) {
          // First successful fetch for this source: seed only, never toast.
        } else {
          const known = new Set(seenBefore);
          fresh.push(...result.games.filter((game) => game?.id && !known.has(game.id)));
        }
        next[source] = [...new Set([...(seenBefore || []), ...ids])].slice(-SEEN_IDS_LIMIT);
      }

      StorageService.set(SEEN_KEY, next);
      if (cancelled || fresh.length === 0) return;
      info(
        fresh.length === 1
          ? `New free game: ${fresh[0].title} — find it on Discover`
          : `${fresh.length} new free games — find them on Discover`,
        7000
      );
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [info]);
}
