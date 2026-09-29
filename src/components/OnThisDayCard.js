import React, { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { getTodaysEvents } from '../services/OnThisDayService';
import './OnThisDayCard.css';

export default function OnThisDayCard({ today = new Date() }) {
  const result = useMemo(() => getTodaysEvents(today), [today]);
  if (!result?.events?.length) return null;

  const dateLabel = result.date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

  return (
    <aside className="on-this-day" aria-label="Gaming history anniversaries">
      <header className="on-this-day-header">
        <CalendarDays size={15} aria-hidden="true" />
        <span className="on-this-day-label">{result.exact ? 'On this day in gaming' : 'This week in gaming'}</span>
        <span className="on-this-day-date">{dateLabel}</span>
      </header>
      <ul className="on-this-day-events">
        {result.events.map((item) => (
          <li key={`${item.year}-${item.event}`}>
            <strong>{item.year}</strong>
            <span>{item.event}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
