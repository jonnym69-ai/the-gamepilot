import { useCallback, useEffect, useRef } from 'react';
import { useToast } from '../components/Toast';
import { GameLaunchCoordinatorService } from '../services/GameLaunchCoordinatorService';

/**
 * Manages game launching — the handleLaunchGame callback and the
 * gamepilot:launch-game event listener.
 *
 * Needs:
 *   - library: the current library array
 *   - setLibrary: state setter
 *   - saveLibrary: from useLibraryLoading
 *   - setLastPlayedGame: state setter
 *   - handleEndSession: from useSessionLifecycle
 *   - refreshActiveSessions: from useSessionLifecycle
 *   - minimizeOnLaunch: boolean preference
 *   - trackGamePlay: from useSeasonalFeatures
 *
 * Returns:
 *   - handleLaunchGame(game): launch a game
 */
export default function useGameLaunching({
  library,
  setLibrary,
  saveLibrary,
  setLastPlayedGame,
  handleEndSession,
  refreshActiveSessions,
  minimizeOnLaunch,
  trackGamePlay,
}) {
  const launchesInProgress = useRef(new Set());
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();

  const handleLaunchGame = useCallback(
    async (game) => {
      const gameKey = String(game?.appid || game?.name || '').trim();
      if (!gameKey) {
        toastError('This game is missing the information needed to launch it.');
        return;
      }
      if (launchesInProgress.current.has(gameKey)) {
        toastInfo(`${game.name || 'This game'} is already being launched.`);
        return;
      }

      launchesInProgress.current.add(gameKey);
      try {
        const electronAvailable = typeof window.electronAPI !== 'undefined';
        if (!electronAvailable) {
          throw new Error('Electron APIs not available - please restart the app');
        }

        const result = await GameLaunchCoordinatorService.launchGame({
          game,
          library,
          onLibraryUpdated: (updatedLibrary) => {
            setLibrary(updatedLibrary);
            saveLibrary(updatedLibrary);
          },
          onLastPlayedGameUpdated: (launchedGame) => {
            setLastPlayedGame(launchedGame);
          },
          onEndSession: (gameName) => {
            handleEndSession(gameName);
          },
        });

        if (!result.success) {
          console.error(' Game launch failed:', result.message);
          toastError(result.message);
        } else {
          refreshActiveSessions();
          toastSuccess(`${game.name} launched. Session tracking is active.`);

          // Record the play for seasonal reward tracking (reward toast is shown elsewhere).
          trackGamePlay(game);

          if (minimizeOnLaunch && window.electronAPI?.minimizeWindow) {
            window.electronAPI.minimizeWindow().catch(() => {});
          }
        }
      } catch (error) {
        console.error('Launch error:', error);
        toastError(`Failed to launch ${game.name}: ${error.message}`);
      } finally {
        launchesInProgress.current.delete(gameKey);
      }
    },
    [
      handleEndSession,
      library,
      minimizeOnLaunch,
      saveLibrary,
      setLibrary,
      setLastPlayedGame,
      refreshActiveSessions,
      trackGamePlay,
      toastError,
      toastInfo,
      toastSuccess,
    ]
  );

  // Listen for launch requests from CommandPalette / QuickLaunchHotbar
  useEffect(() => {
    const onLaunchRequest = (e) => {
      const game = e?.detail;
      if (game) {
        handleLaunchGame(game);
      }
    };
    window.addEventListener('gamepilot:launch-game', onLaunchRequest);
    return () => window.removeEventListener('gamepilot:launch-game', onLaunchRequest);
  }, [handleLaunchGame]);

  return { handleLaunchGame };
}
