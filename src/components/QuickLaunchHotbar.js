import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Play, ChevronDown, ChevronUp, Pin } from 'lucide-react';
import InterfacePreferencesService from '../services/InterfacePreferencesService';
import useInterfacePreferences from '../hooks/useInterfacePreferences';
import { resolveGameArtwork, getGameArtworkPlaceholder } from '../services/GameArtworkService';
import './QuickLaunchHotbar.css';

const HOTBAR_LIMIT = 6;

const gameKey = (game) => String(game?.appid || game?.name || '');

const pickHotbarGames = (library, pinnedIds) => {
  if (!Array.isArray(library) || library.length === 0) return [];
  const pinSet = new Set((pinnedIds || []).map(String));
  const pinned = [];
  const recent = [];
  library.forEach((game) => {
    if (!game) return;
    if (pinSet.has(gameKey(game))) {
      pinned.push(game);
    } else if (game.last_played || (game.playtime_forever && game.playtime_forever > 0)) {
      recent.push(game);
    }
  });
  recent.sort((a, b) => {
    const aTime = a.last_played ? new Date(a.last_played).getTime() : 0;
    const bTime = b.last_played ? new Date(b.last_played).getTime() : 0;
    if (aTime !== bTime) return bTime - aTime;
    return (b.playtime_forever || 0) - (a.playtime_forever || 0);
  });
  return [...pinned, ...recent].slice(0, HOTBAR_LIMIT);
};

export default function QuickLaunchHotbar({ library = [] }) {
  const prefs = useInterfacePreferences();
  const location = useLocation();

  const games = useMemo(() => pickHotbarGames(library, prefs.pinnedGameIds), [library, prefs.pinnedGameIds]);

  if (!prefs.showQuickLaunchHotbar) return null;
  if (location.pathname === '/' && !prefs.quickLaunchCollapsed) {
    // Home already shows continue-playing; collapse by default on home
  }
  if (games.length === 0) return null;

  const collapsed = prefs.quickLaunchCollapsed;

  const handleLaunch = (game) => {
    window.dispatchEvent(new CustomEvent('gamepilot:launch-game', { detail: game }));
  };

  const togglePin = (e, game) => {
    e.stopPropagation();
    const id = gameKey(game);
    const set = new Set((prefs.pinnedGameIds || []).map(String));
    if (set.has(id)) set.delete(id); else set.add(id);
    InterfacePreferencesService.set('pinnedGameIds', Array.from(set));
  };

  const toggleCollapse = () => {
    InterfacePreferencesService.set('quickLaunchCollapsed', !collapsed);
  };

  return (
    <div className={`quick-launch-hotbar ${collapsed ? 'collapsed' : ''}`} role="toolbar" aria-label="Quick launch">
      <button type="button" className="quick-launch-toggle" onClick={toggleCollapse} title={collapsed ? 'Expand quick launch' : 'Collapse quick launch'}>
        {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        <span>Quick Launch</span>
      </button>
      {!collapsed && (
        <div className="quick-launch-list">
          {games.map((game) => {
            const art = resolveGameArtwork(game, { surface: 'hotbar' }) || getGameArtworkPlaceholder({ game, surface: 'hotbar' });
            const id = gameKey(game);
            const isPinned = (prefs.pinnedGameIds || []).map(String).includes(id);
            return (
              <button
                type="button"
                key={id}
                className="quick-launch-item"
                onClick={() => handleLaunch(game)}
                title={`Launch ${game.name}`}
              >
                <div className="quick-launch-art" style={{ backgroundImage: art ? `url(${art})` : undefined }}>
                  {!art && <Play size={16} />}
                </div>
                <span className="quick-launch-name">{game.name}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => togglePin(e, game)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') togglePin(e, game); }}
                  className={`quick-launch-pin ${isPinned ? 'pinned' : ''}`}
                  title={isPinned ? 'Unpin' : 'Pin to hotbar'}
                >
                  <Pin size={12} />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
