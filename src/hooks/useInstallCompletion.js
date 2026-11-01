import { useCallback, useEffect, useRef, useState } from 'react';
import PendingInstallService from '../services/PendingInstallService';
import { getElectronAPI } from '../services/ElectronBridge';
import { LibraryScanCoordinatorService } from '../services/LibraryScanCoordinatorService';
import { PlaytimeEnrichmentService } from '../services/PlaytimeEnrichmentService';
import { GameCurationService } from '../services/GameCurationService';
import { assignMoodToGame } from '../services/MoodAssignmentService';

const normalizeName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const RESCAN_COOLDOWN_MS = 30000;

/**
 * Completes the "click Install → game is playable" loop.
 *
 * Two detection paths:
 *  - the main-process install watcher pushes `gamepilot:game-installed` when
 *    a Steam/Epic/GOG install marker lands (no rescan needed), and
 *  - a fallback that intersects the pending set with the library whenever it
 *    changes, covering anything the watcher misses (a rescan drops the game
 *    out of "owned, not installed" anyway).
 *
 * On completion it quietly rescans the library so the game lands as a real
 * entry, and exposes the payload + playNow/dismiss for InstallCompleteModal.
 */
export default function useInstallCompletion({ library = [], setLibrary, saveLibrary }) {
  const [completed, setCompleted] = useState(null);
  const libraryRef = useRef(library);
  const rescanStateRef = useRef({ lastRun: 0, running: false });
  libraryRef.current = library;

  const quietRescan = useCallback(async () => {
    const state = rescanStateRef.current;
    const now = Date.now();
    if (state.running || now - state.lastRun < RESCAN_COOLDOWN_MS) return;
    state.running = true;
    state.lastRun = now;
    try {
      const { mergedLibrary = [] } = await LibraryScanCoordinatorService.scanAndMergeLibrary({
        currentLibrary: libraryRef.current,
        assignMoodToGame,
        manual: false,
      });
      if (mergedLibrary.length > 0) {
        const enriched = GameCurationService.enrichLibrary(
          PlaytimeEnrichmentService.enrichLibraryWithPlaytime(mergedLibrary)
        );
        setLibrary?.(enriched);
        saveLibrary?.(enriched);
      }
    } catch {
      // Best effort — the game is installed regardless; next manual scan
      // picks it up.
    } finally {
      rescanStateRef.current.running = false;
    }
  }, [setLibrary, saveLibrary]);

  const finish = useCallback(
    (entry) => {
      const key = entry?.key || PendingInstallService.keyFor(entry);
      if (!key) return;
      PendingInstallService.remove(key);
      setCompleted({ ...entry, key });
      quietRescan().catch(() => {});
    },
    [quietRescan]
  );

  // Watcher push events (Steam/Epic/GOG manifest markers).
  useEffect(() => {
    const api = getElectronAPI();
    if (!api || typeof api.onGameInstalled !== 'function') return undefined;
    return api.onGameInstalled((payload) => {
      if (payload) finish(payload);
    });
  }, [finish]);

  // Fallback: pending ∩ library on any library change.
  useEffect(() => {
    if (completed) return;
    const pending = PendingInstallService.list();
    if (pending.length === 0 || !Array.isArray(library) || library.length === 0) return;
    const installedNames = new Set(library.map((game) => normalizeName(game?.name)).filter(Boolean));
    const landed = pending.find((entry) => installedNames.has(normalizeName(entry.name)));
    if (landed) finish(landed);
  }, [library, completed, finish]);

  const playNow = useCallback((game) => {
    const api = getElectronAPI();
    if (!api || !game) return;
    try {
      if (game.source === 'steam' && game.appid && typeof api.steamRun === 'function') {
        api.steamRun(String(game.appid)).catch(() => {});
      } else if (game.source === 'epic' && game.appName && typeof api.epicOpenApp === 'function') {
        api.epicOpenApp(game.appName).catch(() => {});
      } else if (game.source === 'gog' && game.gogProductId && typeof api.gogLaunch === 'function') {
        api.gogLaunch(String(game.gogProductId)).catch(() => {});
      }
    } catch {
      // Launcher deep links are best effort.
    }
  }, []);

  const dismiss = useCallback(() => setCompleted(null), []);

  return { completed, dismiss, playNow };
}
