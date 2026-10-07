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
            {playing.slice(0, 5).map((friend) => {
              const owned = friend.appid ? ownedByAppId.get(friend.appid) : null;
              return (
                <li key={friend.steamid} className="friends-playing-item">
                  {friend.avatar ? (
                    <img src={friend.avatar} alt="" className="friends-playing-avatar" loading="lazy" />
                  ) : (
                    <span className="friends-playing-avatar friends-playing-avatar-fallback" aria-hidden="true">
                      {friend.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="friends-playing-text">
                    <strong>{friend.name}</strong>
                    <span>{friend.playing}</span>
                  </span>
                  {owned && (
                    <button
                      type="button"
                      className="friends-playing-launch"
                      onClick={() => onLaunchGame?.(owned)}
                      title={`${owned.name || owned.title} is in your library`}
                    >
                      <Play size={12} aria-hidden="true" /> Play your copy
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
