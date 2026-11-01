import React from 'react';
import './EraTimelineBar.css';

// html2canvas-safe hex palette — one colour per era stretch, shared by the
// Year in Review timeline, the story share card, and the December recap
// prompt on Today.
export const ERA_TIMELINE_COLORS = Object.freeze([
  '#7c3aed',
  '#0891b2',
  '#d97706',
  '#059669',
  '#dc2626',
  '#db2777',
  '#4f46e5',
  '#65a30d',
]);

export const eraTimelineColor = (index) => ERA_TIMELINE_COLORS[index % ERA_TIMELINE_COLORS.length];

const MONTH_TICK_LABELS = Object.freeze([
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]);

// 12-segment bar: each month tinted with its era stretch's colour; quiet
// months stay muted. Title attribute carries the stretch name for hover.
export function EraTimelineBar({ stretches = [], showLabels = false, compact = false }) {
  const monthOwner = new Array(12).fill(-1);
  stretches.forEach((era, index) => {
    for (let month = era.startMonth; month <= era.endMonth && month < 12; month += 1) {
      if (month >= 0) monthOwner[month] = index;
    }
  });
  return (
    <div className={`era-timeline-bar${compact ? ' compact' : ''}`} aria-hidden="true">
      {MONTH_TICK_LABELS.map((label, month) => {
        const owner = monthOwner[month];
        const era = owner >= 0 ? stretches[owner] : null;
        return (
          <span
            key={label}
            className={`era-timeline-segment${era ? '' : ' quiet'}`}
            title={era ? `${label}: ${era.name}` : `${label}: no tracked sessions`}
            style={{ backgroundColor: era ? eraTimelineColor(owner) : undefined }}
          >
            {showLabels && <em>{label}</em>}
          </span>
        );
      })}
    </div>
  );
}
