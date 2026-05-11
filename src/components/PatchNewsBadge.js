import React, { useEffect, useState } from 'react';
import { Bell, Wrench } from 'lucide-react';
import SteamNewsService from '../services/SteamNewsService';

// Compact badge for Library cards. Renders only when there's a post on the
// Steam news feed dated *after* the user's last_played for this game. Hidden
// otherwise — keeps the card clean.
const PatchNewsBadge = ({ game }) => {
  const [status, setStatus] = useState(() => SteamNewsService.getUpdateStatus(game));

  useEffect(() => {
    setStatus(SteamNewsService.getUpdateStatus(game));
  }, [game]);

  if (!status || !status.sinceLastPlayed) return null;
  const Icon = status.isPatch ? Wrench : Bell;
  const label = status.isPatch
    ? `${status.newerCount} new patch${status.newerCount === 1 ? '' : 'es'}`
    : `${status.newerCount} new post${status.newerCount === 1 ? '' : 's'}`;
  const tip = status.latest?.title
    ? `${label} since you last played\nLatest: ${status.latest.title}`
    : `${label} since you last played`;

  return (
    <span
      className={`patch-news-badge ${status.isPatch ? 'is-patch' : ''}`}
      title={tip}
      aria-label={label}
    >
      <Icon size={10} aria-hidden="true" />
      <span>{status.isPatch ? 'Patch' : 'News'}</span>
    </span>
  );
};

export default PatchNewsBadge;
