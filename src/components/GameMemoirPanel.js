import React, { useMemo } from 'react';
import { BookOpen, CalendarDays, Clock, Crown, Flag, History, Trophy } from 'lucide-react';
import GameMemoirService from '../services/GameMemoirService';
import { formatPlaytime } from '../utils/formatPlaytime';
import './GameMemoirPanel.css';

const fmtDate = (ms) =>
  ms ? new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : null;
const fmtShort = (ms) => (ms ? new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null);

// The per-game character sheet: when you started, how you played it, what it
// earned you, and how it ended — assembled from local records only.
export default function GameMemoirPanel({ game, library = [] }) {
  const memoir = useMemo(() => GameMemoirService.getMemoir(game, library), [game, library]);
  if (!memoir.hasAny) return null;

  const stats = [
    memoir.sessionCount > 0 && { icon: Clock, label: 'Sessions', value: memoir.sessionCount },
    memoir.totalMinutes > 0 && { icon: History, label: 'Tracked time', value: formatPlaytime(memoir.totalMinutes) },
    memoir.longestSession && {
      icon: CalendarDays,
      label: 'Longest sitting',
      value: `${formatPlaytime(memoir.longestSession.minutes)}${fmtShort(memoir.longestSession.at) ? ` · ${fmtShort(memoir.longestSession.at)}` : ''}`,
    },
    memoir.daySpan > 0 && {
      icon: CalendarDays,
      label: 'Run span',
      value: `${memoir.daySpan} day${memoir.daySpan === 1 ? '' : 's'}${memoir.activeMonths > 1 ? ` · ${memoir.activeMonths} months` : ''}`,
    },
  ].filter(Boolean);

  return (
    <div className="game-memoir" data-testid="game-memoir">
      <h3>The story so far</h3>
      {stats.length > 0 && (
        <div className="game-memoir-stats">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="game-memoir-stat">
              <Icon size={13} aria-hidden="true" />
              <span className="game-memoir-stat-label">{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      )}
      <ul className="game-memoir-lines">
        {memoir.firstPlayedAt && (
          <li>
            <Flag size={13} aria-hidden="true" /> First played {fmtDate(memoir.firstPlayedAt)}
          </li>
        )}
        {memoir.status?.at && (
          <li>
            <BookOpen size={13} aria-hidden="true" /> Marked {memoir.status.label.toLowerCase()}{' '}
            {fmtDate(memoir.status.at)}
          </li>
        )}
        {memoir.era && (
          <li>
            <Crown size={13} aria-hidden="true" /> Headlined {memoir.era.name}
            {memoir.era.since ? ` · since ${fmtShort(memoir.era.since)}` : ''}
          </li>
        )}
        {memoir.signatureTitle && (
          <li className="game-memoir-title-earned">
            <Trophy size={13} aria-hidden="true" /> Title earned: <strong>{memoir.signatureTitle.name}</strong>
          </li>
        )}
        {memoir.achievements && (
          <li>
            <Trophy size={13} aria-hidden="true" /> Steam achievements: {memoir.achievements.unlocked}/
            {memoir.achievements.total}
          </li>
        )}
        {memoir.ra && (
          <li>
            <Trophy size={13} aria-hidden="true" /> RetroAchievements: {memoir.ra.earned}/{memoir.ra.total}
            {memoir.ra.completionHardcore ? ` · ${memoir.ra.completionHardcore} hardcore` : ''}
          </li>
        )}
      </ul>
      {memoir.latestNote && (
        <blockquote className="game-memoir-note">
          “{memoir.latestNote.text}”<cite> — you, {fmtShort(memoir.latestNote.at)}</cite>
        </blockquote>
      )}
    </div>
  );
}
