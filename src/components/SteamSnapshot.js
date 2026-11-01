import React, { useEffect, useState } from 'react';
import { ThumbsUp, Trophy, ExternalLink, Loader2, Users, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import SteamPublicService from '../services/SteamPublicService';
import SteamAchievementsService from '../services/SteamAchievementsService';
import './SteamSnapshot.css';

const reviewTone = (positivePct) => {
  if (positivePct == null) return 'meh';
  if (positivePct >= 80) return 'good';
  if (positivePct >= 60) return 'ok';
  if (positivePct >= 40) return 'meh';
  return 'bad';
};

const formatCount = (n) => {
  if (!n && n !== 0) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
};

const sortPersonalAchievements = (achievements = []) =>
  [...achievements].sort((a, b) => Number(b.achieved) - Number(a.achieved) || (a.percent ?? 101) - (b.percent ?? 101));

const PersonalAchievements = ({ data }) => {
  const [expanded, setExpanded] = useState(false);
  const pct = data.total > 0 ? Math.round((data.unlocked / data.total) * 100) : 0;
  const rarestUnlocked = data.achievements
    .filter((a) => a.achieved && a.percent != null && a.percent < 10)
    .sort((a, b) => a.percent - b.percent)[0];
  const sorted = sortPersonalAchievements(data.achievements);

  return (
    <div className="steam-snapshot-personal">
      <button
        type="button"
        className="steam-snapshot-personal-head"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <Trophy size={14} aria-hidden="true" />
        <span className="steam-snapshot-personal-line">
          Your achievements:{' '}
          <strong>
            {data.unlocked} / {data.total} ({pct}%)
          </strong>
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      <div
        className="steam-snapshot-personal-bar"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div className="steam-snapshot-personal-fill" style={{ width: `${pct}%` }} />
      </div>
      {rarestUnlocked && (
        <div className="steam-snapshot-personal-rare">
          Rarest unlock: <strong>{rarestUnlocked.name || rarestUnlocked.apiname}</strong> — only{' '}
          {rarestUnlocked.percent}% of players
        </div>
      )}
      {expanded && (
        <ul className="steam-snapshot-personal-list">
          {sorted.map((achievement) => (
            <li key={achievement.apiname} className={achievement.achieved ? 'unlocked' : 'locked'}>
              {achievement.achieved ? <Trophy size={13} aria-hidden="true" /> : <Lock size={13} aria-hidden="true" />}
              <span className="steam-snapshot-personal-item">
                <strong>{achievement.name || achievement.apiname}</strong>
                {achievement.description && <span>{achievement.description}</span>}
                <span className="steam-snapshot-personal-meta">
                  {achievement.percent != null && `${achievement.percent}% of players`}
                  {achievement.achieved && achievement.unlockTime
                    ? `${achievement.percent != null ? ' · ' : ''}Unlocked ${new Date(
                        achievement.unlockTime
                      ).toLocaleDateString()}`
                    : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const SteamSnapshot = ({ game }) => {
  const [entry, setEntry] = useState(() => SteamPublicService.getCached(game));
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(() => SteamPublicService.isEnabled());
  const [personal, setPersonal] = useState(null);

  useEffect(() => {
    setEntry(SteamPublicService.getCached(game));
    if (!game || !SteamPublicService.isEnabled()) return undefined;
    if (String(game.platform || '').toLowerCase() !== 'steam') return undefined;
    let cancelled = false;
    setLoading(true);
    SteamPublicService.getSnapshot(game)
      .then((result) => {
        if (!cancelled) setEntry(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [game]);

  // Personal unlocks sit behind the same Steam-public-data opt-in as the
  // rest of this card — no extra toggle, no fetch when it's off.
  useEffect(() => {
    setPersonal(null);
    if (!game || !SteamPublicService.isEnabled()) return undefined;
    if (String(game.platform || '').toLowerCase() !== 'steam') return undefined;
    const appid = SteamPublicService.appIdOf?.(game) || String(game.appid || '');
    if (!appid) return undefined;
    let cancelled = false;
    SteamAchievementsService.getForGame(appid).then((result) => {
      if (!cancelled) setPersonal(result);
    });
    return () => {
      cancelled = true;
    };
  }, [game, enabled]);

  // Hide entirely for non-Steam games — nothing to show.
  if (!game || String(game.platform || '').toLowerCase() !== 'steam') return null;

  const openExternal = (url) => {
    if (!url) return;
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (!enabled) {
    return (
      <div className="steam-snapshot steam-snapshot-empty">
        <div className="steam-snapshot-header">
          <ThumbsUp size={16} aria-hidden="true" />
          <h3>Steam Snapshot</h3>
        </div>
        <p>
          Steam public-data lookups are off. Enable them to see review summaries and global achievement rarity per game.
        </p>
        <button
          type="button"
          className="steam-snapshot-enable"
          onClick={() => {
            SteamPublicService.setEnabled(true);
            setEnabled(true);
          }}
        >
          Enable now
        </button>
      </div>
    );
  }

  if (loading && !entry) {
    return (
      <div className="steam-snapshot steam-snapshot-loading">
        <Loader2 size={14} className="steam-snapshot-spin" aria-hidden="true" />
        <span>Loading Steam Snapshot…</span>
      </div>
    );
  }

  if (!entry || !entry.found) {
    return null; // Nothing meaningful to show; stay quiet.
  }

  const { reviews, achievements, players, communityUrl, achievementsUrl } = entry;
  const tone = reviews ? reviewTone(reviews.positivePct) : 'meh';

  return (
    <div className="steam-snapshot">
      <div className="steam-snapshot-header">
        <ThumbsUp size={16} aria-hidden="true" />
        <h3>Steam Snapshot</h3>
        <span className="steam-snapshot-source">via store.steampowered.com</span>
      </div>

      {reviews && (
        <div className={`steam-snapshot-reviews tone-${tone}`}>
          <div className="steam-snapshot-reviews-line">
            <strong>{reviews.label || 'Reviewed'}</strong>
            <span className="steam-snapshot-pct">{reviews.positivePct}% positive</span>
          </div>
          <div className="steam-snapshot-reviews-meta">
            {formatCount(reviews.totalReviews)} reviews
            <span className="steam-snapshot-divider">·</span>
            {formatCount(reviews.totalPositive)} up
            <span className="steam-snapshot-divider">·</span>
            {formatCount(reviews.totalNegative)} down
          </div>
        </div>
      )}

      {players && (
        <div className="steam-snapshot-players">
          <Users size={14} aria-hidden="true" />
          <div>
            <div className="steam-snapshot-players-line">
              <strong>{players.count.toLocaleString()}</strong> playing on Steam
            </div>
            <div className="steam-snapshot-players-meta">
              as of{' '}
              {new Date(players.fetchedAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>
      )}

      {achievements && (
        <div className="steam-snapshot-achievements">
          <Trophy size={14} aria-hidden="true" />
          <div>
            <div className="steam-snapshot-ach-line">
              Community: <strong>{achievements.total}</strong> achievements
              <span className="steam-snapshot-divider">·</span>
              avg <strong>{achievements.averagePercent}%</strong> unlock rate
            </div>
            {achievements.rarestPercent != null && (
              <div className="steam-snapshot-ach-meta">
                Rarest: only <strong>{achievements.rarestPercent}%</strong> of players have it
              </div>
            )}
          </div>
        </div>
      )}

      {personal?.ok === false && personal.error === 'no-steam-id' && (
        <div className="steam-snapshot-personal-hint">
          <a href="#/settings">Add your Steam ID in Settings</a> to see your own achievement unlocks.
        </div>
      )}
      {personal?.ok === false && personal.error === 'private-profile' && (
        <div className="steam-snapshot-personal-hint">
          Set &quot;Game details&quot; to Public in your Steam privacy settings to see your unlocks.
        </div>
      )}
      {personal?.ok === true && personal.total > 0 && <PersonalAchievements data={personal} />}

      <div className="steam-snapshot-links">
        {achievementsUrl && (
          <button type="button" onClick={() => openExternal(achievementsUrl)}>
            <ExternalLink size={11} aria-hidden="true" /> Achievement leaderboard
          </button>
        )}
        {communityUrl && (
          <button type="button" onClick={() => openExternal(communityUrl)}>
            <ExternalLink size={11} aria-hidden="true" /> Community hub
          </button>
        )}
      </div>
    </div>
  );
};

export default SteamSnapshot;
