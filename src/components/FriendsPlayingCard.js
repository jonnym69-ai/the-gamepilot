import React, { useCallback, useEffect, useState } from 'react';
import { Play, RefreshCw, Users } from 'lucide-react';
import SteamFriendsService from '../services/SteamFriendsService';
import { getSteamAppId } from '../services/SteamStoreService';
import './FriendsPlayingCard.css';

const relativeTime = (timestamp) => {
  const minutes = Math.max(0, Math.round((Date.now() - Number(timestamp || 0)) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 min ago';
  return `${minutes} min ago`;
};

export default function FriendsPlayingCard({ library = [], onLaunchGame }) {
  const [state, setState] = useState({ status: 'loading', friends: [], fetchedAt: null, error: null });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force = false) => {
    setRefreshing(true);
    try {
      const result = await SteamFriendsService.fetchFriends({ force });
      if (result.success) {
        setState({ status: 'ready', friends: result.friends, fetchedAt: result.fetchedAt, error: null });
      } else {
        setState({ status: 'error', friends: [], fetchedAt: null, error: result.error });
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!SteamFriendsService.isEnabled() || !SteamFriendsService.getSteamId()) return undefined;
    let cancelled = false;
    const run = async () => {
      const result = await SteamFriendsService.fetchFriends();
      if (cancelled) return;
      if (result.success) {
        setState({ status: 'ready', friends: result.friends, fetchedAt: result.fetchedAt, error: null });
      } else {
        setState({ status: 'error', friends: [], fetchedAt: null, error: result.error });
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!SteamFriendsService.isEnabled() || !SteamFriendsService.getSteamId()) return null;
  if (state.status === 'loading') return null;

  const { playing, online } = SteamFriendsService.splitByPresence(state.friends);
  const ownedByAppId = new Map(
    (Array.isArray(library) ? library : [])
      .map((game) => [getSteamAppId(game), game])
      .filter(([appid]) => Boolean(appid))
  );

  // Group friends by what they're playing — a shared game is a squad-night
  // signal, and "3 friends are in Valheim and you own it" is actionable.
  const gameGroups = new Map();
  playing.forEach((friend) => {
    const key = friend.appid || friend.playing;
    if (!key) return;
    if (!gameGroups.has(key)) {
      gameGroups.set(key, { gameTitle: friend.playing, appid: friend.appid, friends: [] });
    }
    gameGroups.get(key).friends.push(friend);
  });
  const grouped = [...gameGroups.values()].sort((a, b) => b.friends.length - a.friends.length);

  return (
    <aside className="friends-playing" aria-label="Steam friends activity">
      <header className="friends-playing-header">
        <Users size={15} aria-hidden="true" />
        <span className="friends-playing-label">Friends on Steam</span>
        <button
          type="button"
          className="friends-playing-refresh"
          onClick={() => load(true)}
          disabled={refreshing}
          aria-label="Refresh friends"
        >
          <RefreshCw size={13} aria-hidden="true" className={refreshing ? 'spinning' : ''} />
        </button>
      </header>

      {state.status === 'error' ? (
        <p className="friends-playing-note">{state.error}</p>
      ) : playing.length === 0 ? (
        <p className="friends-playing-note">
          {online.length > 0
            ? `${online.length} friend${online.length === 1 ? '' : 's'} online — nobody in a game right now.`
            : 'No friends online right now.'}
        </p>
      ) : (
        <>
          <ul className="friends-playing-list">
            {grouped.slice(0, 5).map((group) => {
              const owned = group.appid ? ownedByAppId.get(group.appid) : null;
              const squad = group.friends.length > 1;
              return (
                <li
                  key={group.appid || group.gameTitle}
                  className={`friends-playing-item${squad && owned ? ' friends-playing-squad' : ''}`}
                >
                  <span className="friends-playing-avatars" aria-hidden="true">
                    {group.friends.slice(0, 3).map((friend) =>
                      friend.avatar ? (
                        <img
                          key={friend.steamid}
                          src={friend.avatar}
                          alt=""
                          className="friends-playing-avatar"
                          loading="lazy"
                        />
                      ) : (
                        <span key={friend.steamid} className="friends-playing-avatar friends-playing-avatar-fallback">
                          {friend.name.slice(0, 1).toUpperCase()}
                        </span>
                      )
                    )}
                  </span>
                  <span className="friends-playing-text">
                    <strong>{group.friends.map((f) => f.name).join(', ')}</strong>
                    <span>
                      {group.gameTitle}
                      {squad ? ` · ${group.friends.length} in the same game` : ''}
                    </span>
                  </span>
                  {owned && (
                    <button
                      type="button"
                      className="friends-playing-launch"
                      onClick={() => onLaunchGame?.(owned)}
                      title={`${owned.name || owned.title} is in your library`}
                    >
                      <Play size={12} aria-hidden="true" /> {squad ? 'Join them' : 'Play your copy'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="friends-playing-footnote">
            {online.length > 0 ? `${online.length} more online · ` : ''}Steam presence · {relativeTime(state.fetchedAt)}
          </p>
        </>
      )}
    </aside>
  );
}
