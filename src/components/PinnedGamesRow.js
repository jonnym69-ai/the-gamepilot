import React, { useMemo } from 'react';
import { Pin, X, Play } from 'lucide-react';
import InterfacePreferencesService from '../services/InterfacePreferencesService';
import useInterfacePreferences from '../hooks/useInterfacePreferences';
import { resolveGameArtwork, getGameArtworkPlaceholder } from '../services/GameArtworkService';
import './PinnedGamesRow.css';

const gameKey = (game) => String(game?.appid || game?.name || '');

export default function PinnedGamesRow({ library = [], onLaunchGame, favorites = [] }) {
  const prefs = useInterfacePreferences();

  const pinnedGames = useMemo(() => {
    const idSet = new Set((prefs.pinnedGameIds || []).map(String));
    const favSet = new Set((favorites || []).map(String));
    const games = (library || []).filter((g) => g && (idSet.has(gameKey(g)) || favSet.has(g.name) || favSet.has(String(g.appid))));
    const seen = new Set();
    return games.filter((g) => {
      const key = gameKey(g);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 12);
  }, [library, prefs.pinnedGameIds, favorites]);

  if (pinnedGames.length === 0) return null;

  const unpin = (e, game) => {
    e.stopPropagation();
    const id = gameKey(game);
    const next = (prefs.pinnedGameIds || []).map(String).filter((x) => x !== id);
    InterfacePreferencesService.set('pinnedGameIds', next);
  };

  return (
    <div className="pinned-games-row">
      <div className="pinned-games-header">
        <Pin size={14} />
        <span>Pinned & Favourites</span>
        <span className="pinned-games-count">{pinnedGames.length}</span>
      </div>
      <div className="pinned-games-list">
        {pinnedGames.map((game) => {
          const art = resolveGameArtwork(game, { surface: 'pinned_row' }) || getGameArtworkPlaceholder({ game, surface: 'pinned_row' });
          return (
            <div key={gameKey(game)} className="pinned-game-card" title={game.name}>
              <button
                type="button"
                className="pinned-game-art"
                onClick={() => onLaunchGame && onLaunchGame(game)}
                style={{ backgroundImage: art ? `url(${art})` : undefined }}
                aria-label={`Launch ${game.name}`}
              >
                {!art && <Play size={20} />}
                <div className="pinned-game-overlay">
                  <Play size={20} />
                </div>
              </button>
              <div className="pinned-game-name">{game.name}</div>
              <button
                type="button"
                className="pinned-game-unpin"
                onClick={(e) => unpin(e, game)}
                title="Unpin"
              >
                <X size={11} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
