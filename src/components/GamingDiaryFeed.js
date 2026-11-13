import React, { useMemo } from 'react';
import { NotebookPen, Trophy, Flag, Sparkles, PlayCircle } from 'lucide-react';
import SessionRepository from '../services/SessionRepository';
import CurrentEraService from '../services/CurrentEraService';
import { formatLastPlayed } from '../utils/homeHelpers';
import './GamingDiaryFeed.css';

const MAX_EVENTS = 40;

const STATUS_VERBS = {
  beaten: 'beat',
  completed: 'finished',
  '100%': 'went 100% on',
  abandoned: 'walked away from',
};

// One chronological feed of everything you marked down: journal notes,
// status changes, first touches, era shifts. All local data — sessions the
// app tracked, statuses you set, eras it recorded.
export default function GamingDiaryFeed({ games }) {
  const events = useMemo(() => {
    const list = [];

    const firstSession = new Map();
    SessionRepository.getSessionHistory().forEach((entry) => {
      const at = new Date(entry.endTime || entry.startTime || entry.timestamp || 0).getTime() || 0;
      const name = entry.gameName;
      const note = String(entry?.note || '').trim();
      if (note) {
        list.push({ type: 'journal', at, game: name || 'a game', text: note });
      }
      if (name && at > 0 && (!firstSession.has(name) || at < firstSession.get(name))) {
        firstSession.set(name, at);
      }
    });
    firstSession.forEach((at, game) => list.push({ type: 'first', at, game }));

    (Array.isArray(games) ? games : []).forEach((game) => {
      (Array.isArray(game?.completionHistory) ? game.completionHistory : []).forEach((entry) => {
        if (entry?.status === 'playing' && entry?.previousStatus === 'not-started') {
          list.push({ type: 'started', at: entry.timestamp, game: game.name });
        } else if (STATUS_VERBS[entry?.status]) {
          list.push({ type: 'finish', status: entry.status, at: entry.timestamp, game: game.name });
        }
      });
    });

    // Era history appends a row on every signature shift, so a long-running
    // era can leave several near-identical entries. Collapse consecutive
    // same-name runs to the earliest onset — "the era began" once, not
    // every time its top game flickered. A genuinely returning era still
    // gets its own line because the run is broken by a different era.
    const rawEras = (CurrentEraService.getCurrentEra()?.history || [])
      .filter((era) => era?.since && era?.name)
      .sort((a, b) => a.since - b.since);
    const collapsedEras = [];
    rawEras.forEach((era) => {
      const prev = collapsedEras[collapsedEras.length - 1];
      if (prev && prev.name === era.name) return; // same era continuing — keep the first onset
      collapsedEras.push(era);
    });
    collapsedEras.slice(-8).forEach((era) => {
      list.push({ type: 'era', at: era.since, game: era.topGame || null, text: era.name });
    });

    return list
      .filter((e) => Number.isFinite(e.at) && e.at > 0)
      .sort((a, b) => b.at - a.at)
      .slice(0, MAX_EVENTS);
  }, [games]);

  if (events.length === 0) return null;

  return (
    <section className="gaming-diary" aria-label="Gaming diary">
      <h3 className="gaming-diary-title">
        <NotebookPen size={16} aria-hidden="true" /> Your gaming diary
      </h3>
      <ul className="gaming-diary-list">
        {events.map((event, i) => (
          <li key={`${event.type}-${event.at}-${i}`} className="gaming-diary-item">
            <span className={`gaming-diary-icon gaming-diary-icon-${event.type}`}>
              {event.type === 'journal' && <NotebookPen size={14} aria-hidden="true" />}
              {event.type === 'finish' && <Trophy size={14} aria-hidden="true" />}
              {event.type === 'started' && <PlayCircle size={14} aria-hidden="true" />}
              {event.type === 'first' && <Flag size={14} aria-hidden="true" />}
              {event.type === 'era' && <Sparkles size={14} aria-hidden="true" />}
            </span>
            <div className="gaming-diary-body">
              <p className="gaming-diary-text">{describe(event)}</p>
              <span className="gaming-diary-date">{formatLastPlayed(event.at)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function describe(event) {
  switch (event.type) {
    case 'journal':
      return (
        <>
          You wrote about <strong>{event.game}</strong>: “{event.text}”
        </>
      );
    case 'finish':
      return (
        <>
          You {STATUS_VERBS[event.status]} <strong>{event.game}</strong>.
        </>
      );
    case 'started':
      return (
        <>
          You started playing <strong>{event.game}</strong>.
        </>
      );
    case 'first':
      return (
        <>
          <strong>{event.game}</strong> entered your life.
        </>
      );
    case 'era':
      // Era names already read as full titles ("The Project Zomboid Era"), so
      // they carry the sentence — no leading article or trailing "era".
      return (
        <>
          <strong>{event.text}</strong> began{event.game ? ` — ${event.game} leading it` : ''}.
        </>
      );
    default:
      return null;
  }
}
