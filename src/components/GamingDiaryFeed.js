import React, { useMemo, useState } from 'react';
import { NotebookPen, Trophy, Flag, PlayCircle } from 'lucide-react';
import SessionRepository from '../services/SessionRepository';
import { formatLastPlayed } from '../utils/homeHelpers';
import './GamingDiaryFeed.css';

const DAY_MS = 24 * 60 * 60 * 1000;
const COLLAPSED_COUNT = 6;
// Hard ceiling only for "All time" — safety against a giant list, not a
// freshness window. The Week/Month windows are the real browse control.
const ALL_TIME_CAP = 60;

const WINDOWS = [
  { id: 'week', label: 'This week', ms: 7 * DAY_MS },
  { id: 'month', label: 'This month', ms: 30 * DAY_MS },
  { id: 'all', label: 'All time', ms: Infinity },
];

const STATUS_VERBS = {
  beaten: 'beat',
  completed: 'finished',
  '100%': 'went 100% on',
  abandoned: 'walked away from',
};

// One chronological feed of the moments that mattered: journal notes,
// status changes, first touches. All local data — sessions the app
// tracked and statuses you set. Era onsets were dropped: an era is a
// stretch, not a moment, and they added noise without meaning.
export default function GamingDiaryFeed({ games }) {
  const [windowId, setWindowId] = useState('month');
  const [expanded, setExpanded] = useState(false);

  const allEvents = useMemo(() => {
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

    return list
      .filter((e) => Number.isFinite(e.at) && e.at > 0)
      .sort((a, b) => b.at - a.at)
      .slice(0, ALL_TIME_CAP);
  }, [games]);

  const activeWindow = WINDOWS.find((w) => w.id === windowId) || WINDOWS[1];
  const cutoff = Date.now() - activeWindow.ms;
  const events = activeWindow.ms === Infinity ? allEvents : allEvents.filter((e) => e.at >= cutoff);
  const visible = expanded ? events : events.slice(0, COLLAPSED_COUNT);

  if (allEvents.length === 0) return null;

  return (
    <section className="gaming-diary" aria-label="Gaming diary">
      <div className="gaming-diary-head">
        <h3 className="gaming-diary-title">
          <NotebookPen size={16} aria-hidden="true" /> Your gaming diary
        </h3>
        <div className="gaming-diary-windows" role="group" aria-label="Diary window">
          {WINDOWS.map((w) => (
            <button
              key={w.id}
              type="button"
              className={`gaming-diary-window${w.id === activeWindow.id ? ' active' : ''}`}
              onClick={() => {
                setWindowId(w.id);
                setExpanded(false);
              }}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>
      {events.length === 0 ? (
        <p className="gaming-diary-empty-window">Nothing in {activeWindow.label.toLowerCase()} — try a wider window.</p>
      ) : (
        <>
          <ul className="gaming-diary-list">
            {visible.map((event, i) => (
              <li key={`${event.type}-${event.at}-${i}`} className="gaming-diary-item">
                <span className={`gaming-diary-icon gaming-diary-icon-${event.type}`}>
                  {event.type === 'journal' && <NotebookPen size={14} aria-hidden="true" />}
                  {event.type === 'finish' && <Trophy size={14} aria-hidden="true" />}
                  {event.type === 'started' && <PlayCircle size={14} aria-hidden="true" />}
                  {event.type === 'first' && <Flag size={14} aria-hidden="true" />}
                </span>
                <div className="gaming-diary-body">
                  <p className="gaming-diary-text">{describe(event)}</p>
                  <span className="gaming-diary-date">{formatLastPlayed(event.at)}</span>
                </div>
              </li>
            ))}
          </ul>
          {events.length > COLLAPSED_COUNT && (
            <button type="button" className="gaming-diary-more" onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Show less' : `Show all ${events.length} entries`}
            </button>
          )}
        </>
      )}
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
    default:
      return null;
  }
}
