import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import SteamFriendsService from '../services/SteamFriendsService';
import { getSteamAppId } from '../services/SteamStoreService';
import { formatPlaytime } from '../utils/formatPlaytime';
import './FriendsPlayedPanel.css';

const MAX_FRIENDS = 24;

// "Your friends on this game" — opt-in per game: on click we ask each cached
// friend's public owned-library for this appid and rank their playtime.
// Private profiles simply don't resolve — they are skipped, not errors.
export default function FriendsPlayedPanel({ game }) {
  const appid = getSteamAppId(game);
  const available = Boolean(appid) && SteamFriendsService.isEnabled() && Boolean(SteamFriendsService.getSteamId());
  const [state, setState] = useState({ status: 'idle', rows: [], checked: 0 });

  useEffect(() => {
    setState({ status: 'idle', rows: [], checked: 0 });
  }, [appid]);

  if (!available) return null;
  const myMinutes = Number(game?.time_played ?? game?.playtimeForever) || 0;

  const compare = async () => {
    const friends = (SteamFriendsService.getCached()?.friends || []).slice(0, MAX_FRIENDS);
    if (friends.length === 0) {
      setState({ status: 'done', rows: [], checked: 0 });
      return;
    }
    setState({ status: 'loading', rows: [], checked: 0 });
    const api = window.electronAPI?.steamOwnedLibrary;
    if (!api) {
      setState({ status: 'error', rows: [], checked: 0 });
      return;
    }
    const results = await Promise.all(
      friends.map(async (friend) => {
        try {
          const res = await api(friend.steamid);
          if (!res?.ok || !Array.isArray(res.games) || res.privateDetails) return null;
          const hit = res.games.find((g) => String(g.appid) === appid);
          return hit ? { name: friend.name, avatar: friend.avatar, minutes: Number(hit.playtimeForever) || 0 } : null;
        } catch {
          return null;
        }
      })
    );
    const rows = results.filter(Boolean).sort((a, b) => b.minutes - a.minutes);
    setState({ status: 'done', rows, checked: friends.length });
  };

  return (
    <div className="friends-played">
      <div className="friends-played-head">
        <Users size={14} aria-hidden="true" />
        <h3>Friends on this game</h3>
      </div>
      {state.status === 'idle' && (
        <button type="button" className="friends-played-compare" onClick={compare}>
          Compare with friends
        </button>
      )}
      {state.status === 'loading' && <p className="friends-played-note">Checking public libraries…</p>}
      {state.status === 'error' && <p className="friends-played-note">Couldn’t reach Steam libraries right now.</p>}
      {state.status === 'done' && (
        <>
          {state.rows.length === 0 ? (
            <p className="friends-played-note">
              No friends with this game in a public library{state.checked > 0 ? ` (${state.checked} checked)` : ''}.
            </p>
          ) : (
            <ul className="friends-played-list">
              {state.rows.slice(0, 8).map((row) => (
                <li key={row.name}>
                  {row.avatar ? <img src={row.avatar} alt="" /> : <span className="friends-played-avatar-fallback" />}
                  <span className="friends-played-name">{row.name}</span>
                  <span className="friends-played-hours">
                    {row.minutes > 0 ? formatPlaytime(row.minutes) : 'owned'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {state.rows.length > 0 && myMinutes > 0 && (
            <p className="friends-played-note">
              You: {formatPlaytime(myMinutes)} — {state.checked} friends checked.
            </p>
          )}
        </>
      )}
    </div>
  );
}
