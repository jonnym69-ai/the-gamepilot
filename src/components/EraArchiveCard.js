import React from 'react';
import CurrentEraService from '../services/CurrentEraService';
import './EraArchiveCard.css';

const formatDate = (timestamp) => {
  const ts = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  if (!ts || !Number.isFinite(ts)) return '';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function EraArchiveCard() {
  const archive = React.useMemo(() => {
    try {
      return CurrentEraService.getEraArchive();
    } catch {
      return [];
    }
  }, []);

  if (archive.length === 0) {
    return (
      <div className="result-card identity-card era-archive-card">
        <div className="identity-title-row">
          <h3 className="result-title">Era Archive</h3>
          <span className="identity-confidence-badge is-provisional">Pro</span>
        </div>
        <p className="identity-description">
          Your past eras will collect here as your play shifts — each one dated, named after what took over, and ranked
          by how long it held you.
        </p>
      </div>
    );
  }

  return (
    <div className="result-card identity-card era-archive-card">
      <div className="identity-title-row">
        <h3 className="result-title">Era Archive</h3>
        <span className="identity-confidence-badge is-growing">
          {archive.length} past era{archive.length === 1 ? '' : 's'}
        </span>
      </div>
      <ol className="era-archive-list">
        {archive.map((era, index) => (
          <li key={`${era.name}-${era.startedAt}`} className="era-archive-item">
            <div className="era-archive-rank" aria-hidden="true">
              {archive.length - index}
            </div>
            <div className="era-archive-detail">
              <span className="era-archive-name">{era.name}</span>
              {era.topGame && <span className="era-archive-game">led by {era.topGame}</span>}
              <span className="era-archive-dates">
                {formatDate(era.startedAt)} → {formatDate(era.endedAt)} · {era.days} day{era.days === 1 ? '' : 's'}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
