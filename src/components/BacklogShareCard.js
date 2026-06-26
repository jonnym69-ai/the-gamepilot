import React from 'react';
import { Target, Clock, Trophy, Gamepad2 } from 'lucide-react';
import { resolveGameArtwork } from '../services/GameArtworkService';
import { ShareCardWatermark } from './ShareCardWatermark';
import './BacklogShareCard.css';

export const BACKLOG_SHARE_CARD_SIZE_PX = 1080;

export function buildBacklogShareData(backlogStats = {}, backlogPriorities = [], username = 'Pilot') {
  const safeStats = {
    totalBacklog: backlogStats?.totalBacklog || 0,
    totalHoursInvested: backlogStats?.totalHoursInvested || 0,
    estimatedHoursToFinish: backlogStats?.estimatedHoursToFinish || 0,
    highPriorityCount: backlogStats?.highPriorityCount || 0,
    averageScore: backlogStats?.averageScore || 0,
  };

  const topPriorities = (backlogPriorities || []).slice(0, 5).map((entry) => ({
    name: entry.game?.name || 'Unknown',
    hoursPlayed: entry.hoursPlayed || 0,
    estimatedRemaining: entry.estimatedRemaining || 0,
    priorityScore: entry.priorityScore || 0,
    reason: entry.reasons?.[0] || 'Worth finishing',
  }));

  return {
    username,
    stats: safeStats,
    topPriorities,
  };
}

const PriorityRow = ({ index, entry }) => {
  return (
    <div className="backlog-share-priority-row">
      <span className="backlog-share-priority-rank">#{index + 1}</span>
      <div className="backlog-share-priority-info">
        <strong>{entry.name}</strong>
        <span>{entry.reason} · {entry.hoursPlayed}h played · {entry.estimatedRemaining}h left</span>
      </div>
      <div className="backlog-share-priority-score">{entry.priorityScore}</div>
    </div>
  );
};

export function BacklogShareCard({ backlogStats = {}, backlogPriorities = [], username, theme = null }) {
  const data = buildBacklogShareData(backlogStats, backlogPriorities, username);
  const topGame = backlogPriorities?.[0]?.game;
  const coverUrl = topGame ? resolveGameArtwork(topGame, { surface: 'hero' }) : null;

  const hasPriorities = data.topPriorities.length > 0;
  const hasStats = data.stats.totalBacklog > 0;

  return (
    <div className="backlog-share-card">
      {coverUrl && (
        <>
          <div
            className="backlog-share-card-cover"
            style={{ backgroundImage: `url(${coverUrl})` }}
            aria-hidden="true"
          />
          <div className="backlog-share-card-cover-overlay" aria-hidden="true" />
        </>
      )}
      <div className="backlog-share-card-glow" aria-hidden="true" />
      <Target className="backlog-share-watermark" size={320} aria-hidden="true" />

      <div className="backlog-share-card-header">
        <span className="backlog-share-card-brand">GAMEPILOT</span>
        <span className="backlog-share-card-tag">Backlog Intel</span>
      </div>

      <div className="backlog-share-card-body">
        <span className="backlog-share-card-eyebrow">
          {data.username || 'Pilot'} · Backlog Report
        </span>

        <div className="backlog-share-card-headline">
          <div className="backlog-share-card-stat">
            <strong>{data.stats.totalBacklog}</strong>
            <span>games to finish</span>
          </div>
        </div>

        {hasStats && (
          <div className="backlog-share-card-strip" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="backlog-share-card-stat-pill">
              <Clock size={18} />
              <div>
                <strong>{data.stats.totalHoursInvested}h</strong>
                <span>invested</span>
              </div>
            </div>
            <div className="backlog-share-card-stat-pill">
              <Trophy size={18} />
              <div>
                <strong>{data.stats.highPriorityCount}</strong>
                <span>high priority</span>
              </div>
            </div>
            <div className="backlog-share-card-stat-pill">
              <Gamepad2 size={18} />
              <div>
                <strong>{data.stats.estimatedHoursToFinish}h</strong>
                <span>to finish</span>
              </div>
            </div>
          </div>
        )}

        {hasPriorities && (
          <div className="backlog-share-card-priorities">
            <h4 className="backlog-share-card-section-title">Top Finish Candidates</h4>
            <div className="backlog-share-priority-list">
              {data.topPriorities.map((entry, i) => (
                <PriorityRow key={entry.name} index={i} entry={entry} />
              ))}
            </div>
          </div>
        )}

        {!hasPriorities && (
          <div className="backlog-share-card-empty">
            No strong finish candidates yet — time to start some games!
          </div>
        )}
      </div>

      <div className="backlog-share-card-footer">
        <ShareCardWatermark />
      </div>
    </div>
  );
}

export default BacklogShareCard;
