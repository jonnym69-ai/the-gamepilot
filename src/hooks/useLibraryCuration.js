/**
 * Library curation callbacks.
 *
 * Groups all the game-level mutation handlers (rating, favorites, removal,
 * collections, hidden, completion, notes, cover art, session notes,
 * played-elsewhere) so App.js stays focused on orchestration.
 *
 * Each callback receives the library mutators (setLibrary + saveLibrary)
 * via the deps object rather than closing over them, which keeps the
 * callbacks stable across re-renders.
 */

import { useCallback } from 'react';
import { normalizeLibraryData } from '../services/LibraryDataService';
import { GameCurationService } from '../services/GameCurationService';
import { GameRatingService } from '../services/GameRatingService';
import { AchievementTracker } from '../AchievementSystem';
import { UserBehaviorProfile } from '../services/UserBehaviorProfile';

const FAVORITES_STORAGE_KEY = 'favorites';

export default function useLibraryCuration({ library, setLibrary, saveLibrary, toastSuccess }) {
  const handleUpdateRating = useCallback(
    (gameName, userRating, replayIntent, extra = {}) => {
      const updatedLibrary = normalizeLibraryData(
        (library || []).map((game) => {
          if (!game || game.name !== gameName) {
            return game;
          }

          const gameId = String(game.appid || game.name || '');
          if (gameId) {
            GameRatingService.setRating(gameId, {
              value: typeof userRating === 'number' ? userRating : game.userRating,
              wouldReplay: extra?.wouldReplay,
              tags: extra?.tags,
            });
          }

          return {
            ...game,
            userRating: typeof userRating === 'number' ? userRating : game.userRating,
            replayIntent: replayIntent ?? game.replayIntent,
            wouldReplay: extra?.wouldReplay ?? game.wouldReplay,
            userRatingTags: extra?.tags ?? game.userRatingTags,
          };
        })
      );

      setLibrary(updatedLibrary);
      saveLibrary(updatedLibrary);
      AchievementTracker.checkAndUnlockAchievements();

      if (typeof userRating === 'number' && userRating > 0) {
        const targetGame = (library || []).find((g) => g?.name === gameName);
        if (targetGame) {
          UserBehaviorProfile.trackRating({
            gameId: String(targetGame.appid || targetGame.name || ''),
            rating: userRating,
            wouldReplay: extra?.wouldReplay,
            tags: extra?.tags,
            mood: targetGame.mood || null,
            genres: Array.isArray(targetGame.genres) ? targetGame.genres : [],
          });
        }
      }
    },
    [library, saveLibrary, setLibrary]
  );

  const handleToggleFavorite = useCallback((favoriteKey) => {
    if (!favoriteKey) {
      return;
    }

    try {
      const currentFavorites = JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || '[]');
      const normalizedFavorites = Array.isArray(currentFavorites) ? currentFavorites : [];
      const nextFavorites = normalizedFavorites.includes(favoriteKey)
        ? normalizedFavorites.filter((entry) => entry !== favoriteKey)
        : [...normalizedFavorites, favoriteKey];
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavorites));
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }, []);

  const handleRemoveGames = useCallback(
    (gameIds = []) => {
      const normalizedIds = Array.isArray(gameIds) ? gameIds.map((id) => String(id)).filter(Boolean) : [];
      if (normalizedIds.length === 0) {
        return;
      }

      const removalSet = new Set(normalizedIds);
      const updatedLibrary = normalizeLibraryData(
        (library || []).filter((game) => !removalSet.has(String(game?.appid || game?.name)))
      );
      setLibrary(updatedLibrary);
      saveLibrary(updatedLibrary);
    },
    [library, saveLibrary, setLibrary]
  );

  // --- Curation handlers ---
  const handleUpdateCollections = useCallback(
    (gameName, collectionIds) => {
      GameCurationService.setGameCollections(gameName, collectionIds);
      setLibrary((prev) => {
        const updatedLibrary = normalizeLibraryData(
          prev.map((g) => (g.name === gameName ? GameCurationService.enrichGame(g) : g))
        );
        saveLibrary(updatedLibrary);
        return updatedLibrary;
      });
    },
    [saveLibrary, setLibrary]
  );

  const handleToggleHidden = useCallback(
    (gameName) => {
      const isHidden = GameCurationService.toggleHiddenGame(gameName);
      setLibrary((prev) => {
        const updatedLibrary = normalizeLibraryData(prev.map((g) => (g.name === gameName ? { ...g, isHidden } : g)));
        saveLibrary(updatedLibrary);
        return updatedLibrary;
      });
    },
    [saveLibrary, setLibrary]
  );

  const handleUpdateCompletion = useCallback(
    (gameName, status, note) => {
      const completedStatuses = new Set(['beaten', 'completed', '100%']);
      const isCompletionStatus = completedStatuses.has(
        String(status || '')
          .trim()
          .toLowerCase()
      );
      GameCurationService.setGameCompletion(gameName, status, note);
      setLibrary((prev) => {
        const priorGame = prev.find((g) => g.name === gameName);
        const wasCompleted = completedStatuses.has(
          String(priorGame?.completionStatus || '')
            .trim()
            .toLowerCase()
        );
        const hadPlaytime = Number(priorGame?.time_played || 0) > 0;
        const updatedLibrary = normalizeLibraryData(
          prev.map((g) => (g.name === gameName ? GameCurationService.enrichGame(g) : g))
        );
        saveLibrary(updatedLibrary);
        AchievementTracker.checkAndUnlockAchievements();
        if (isCompletionStatus && hadPlaytime && !wasCompleted) {
          AchievementTracker.trackBacklogMilestone('finish_started');
          AchievementTracker.checkAndUnlockAchievements();
        }
        return updatedLibrary;
      });
    },
    [saveLibrary, setLibrary]
  );

  const handleUpdateNotes = useCallback(
    (gameName, text) => {
      GameCurationService.setGameNotes(gameName, text);
      setLibrary((prev) => {
        const updatedLibrary = normalizeLibraryData(
          prev.map((g) => (g.name === gameName ? GameCurationService.enrichGame(g) : g))
        );
        saveLibrary(updatedLibrary);
        return updatedLibrary;
      });
    },
    [saveLibrary, setLibrary]
  );

  const handleUpdateCoverArt = useCallback(
    (gameName, url) => {
      GameCurationService.setCoverArtOverride(gameName, url);
      setLibrary((prev) => {
        const updatedLibrary = normalizeLibraryData(
          prev.map((g) => (g.name === gameName ? GameCurationService.enrichGame(g) : g))
        );
        saveLibrary(updatedLibrary);
        return updatedLibrary;
      });
    },
    [saveLibrary, setLibrary]
  );

  const handleUpdateMood = useCallback(
    (gameName, mood) => {
      // setMoodOverride is already called by GameModal; here we just refresh
      // the live library state so the UI reflects the override immediately.
      setLibrary((prev) => {
        const updatedLibrary = normalizeLibraryData(
          prev.map((g) => (g.name === gameName ? GameCurationService.enrichGame(g) : g))
        );
        saveLibrary(updatedLibrary);
        return updatedLibrary;
      });
    },
    [saveLibrary, setLibrary]
  );

  const handleAddSessionNote = useCallback(
    (gameName, text) => {
      GameCurationService.addSessionNote(gameName, text);
      setLibrary((prev) => {
        const updatedLibrary = normalizeLibraryData(
          prev.map((g) => (g.name === gameName ? GameCurationService.enrichGame(g) : g))
        );
        saveLibrary(updatedLibrary);
        return updatedLibrary;
      });
    },
    [saveLibrary, setLibrary]
  );

  const handleTogglePlayedElsewhere = useCallback(
    (gameName) => {
      const next = GameCurationService.togglePlayedElsewhere(gameName);
      setLibrary((prev) => {
        const updatedLibrary = normalizeLibraryData(
          prev.map((g) => (g.name === gameName ? GameCurationService.enrichGame(g) : g))
        );
        saveLibrary(updatedLibrary);
        return updatedLibrary;
      });
      toastSuccess(
        next
          ? `${gameName} marked as played elsewhere — no longer counts as unplayed.`
          : `${gameName} unmarked — counts as unplayed again.`
      );
    },
    [saveLibrary, setLibrary, toastSuccess]
  );

  return {
    handleUpdateRating,
    handleToggleFavorite,
    handleRemoveGames,
    handleUpdateCollections,
    handleToggleHidden,
    handleUpdateCompletion,
    handleUpdateNotes,
    handleUpdateCoverArt,
    handleUpdateMood,
    handleAddSessionNote,
    handleTogglePlayedElsewhere,
  };
}
