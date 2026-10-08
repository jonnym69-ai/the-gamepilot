import React, { useEffect, useState } from 'react';
import { Award, BadgeCheck, Calendar, ExternalLink } from 'lucide-react';
import SteamProfileService from '../services/SteamProfileService';
import './SteamProfileCard.css';

const memberSinceLabel = (timestamp) => {
  if (!Number.isInteger(timestamp)) return null;
  return new Date(timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
};

export default function SteamProfileCard() {
  const [state, setState] = useState({ status: 'loading', profile: null, error: null });

  useEffect(() => {
    if (!SteamProfileService.isEnabled() || !SteamProfileService.getSteamId()) return undefined;
    let cancelled = false;
    (async () => {
      const result = await SteamProfileService.fetchProfile();
      if (cancelled) return;
      if (result.success) {
        setState({ status: 'ready', profile: result.profile, error: null });
      } else {
        setState({ status: 'error', profile: null, error: result.error });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!SteamProfileService.isEnabled() || !SteamProfileService.getSteamId()) return null;
  if (state.status === 'loading') return null;

  const { profile } = state;

  return (
    <aside className="steam-profile-card" aria-label="Steam profile">
      {state.status === 'error' || !profile ? (
        <p className="steam-profile-note">{state.error || 'Steam profile unavailable.'}</p>
      ) : (
        <div className="steam-profile-body">
          {profile.avatar ? (
            <img src={profile.avatar} alt="" className="steam-profile-avatar" loading="lazy" />
          ) : (
            <span className="steam-profile-avatar steam-profile-avatar-fallback" aria-hidden="true">
              {profile.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="steam-profile-main">
            <span className="steam-profile-name">
              {profile.name}
              {profile.isPrivate && (
                <span className="steam-profile-private" title="Some profile details are private">
                  limited profile
                </span>
              )}
            </span>
            <div className="steam-profile-stats">
              {profile.level !== null && (
                <span className="steam-profile-stat" title="Steam level">
                  <BadgeCheck size={13} aria-hidden="true" /> Level {profile.level}
                </span>
              )}
              {profile.badges !== null && (
                <span className="steam-profile-stat" title="Badges earned">
                  <Award size={13} aria-hidden="true" /> {profile.badges} badges
                </span>
              )}
              {memberSinceLabel(profile.memberSince) && (
                <span className="steam-profile-stat" title="Steam member since">
                  <Calendar size={13} aria-hidden="true" /> since {memberSinceLabel(profile.memberSince)}
                </span>
              )}
            </div>
          </div>
          {profile.profileUrl && (
            <a
              href={profile.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="steam-profile-link"
              title="View Steam profile"
            >
              <ExternalLink size={14} aria-hidden="true" />
              <span className="visually-hidden">View Steam profile</span>
            </a>
          )}
        </div>
      )}
    </aside>
  );
}
