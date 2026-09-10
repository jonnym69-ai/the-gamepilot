import React, { useState, useEffect, useCallback } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, RefreshCcw } from 'lucide-react';
import {
  getTodayParadox,
  getTodayParadoxState,
  markParadoxRevealed,
  markParadoxHidden,
} from '../services/DailyParadoxService';
import './DailyParadox.css';

function DailyParadox() {
  const [paradox, setParadox] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const loadParadox = useCallback(() => {
    const p = getTodayParadox();
    const state = getTodayParadoxState();
    setParadox(p);
    setRevealed(state.revealed);
  }, []);

  useEffect(() => {
    loadParadox();
  }, [loadParadox]);

  const handleReveal = useCallback(() => {
    if (revealed) {
      setRevealed(false);
      markParadoxHidden();
    } else {
      setRevealed(true);
      markParadoxRevealed();
    }
  }, [revealed]);

  if (!paradox) return null;

  return (
    <div className="daily-paradox-card">
      <div
        className="daily-paradox-header"
        onClick={() => setExpanded((e) => !e)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setExpanded((e) => !e);
        }}
      >
        <div className="daily-paradox-icon-row">
          <span className="daily-paradox-icon">{paradox.categoryIcon}</span>
          <div className="daily-paradox-title-row">
            <span className="daily-paradox-label">Daily Paradox</span>
            <span className="daily-paradox-category">{paradox.categoryLabel}</span>
          </div>
        </div>
        <button className="daily-paradox-expand-btn" title={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {expanded && (
        <div className="daily-paradox-body">
          <h3 className="daily-paradox-question-title">{paradox.title}</h3>
          <p className="daily-paradox-question">{paradox.question}</p>

          {revealed && (
            <div className="daily-paradox-explanation">
              <div className="daily-paradox-explanation-label">
                <Lightbulb size={14} /> Resolution
              </div>
              <p>{paradox.explanation}</p>
            </div>
          )}

          <button className="daily-paradox-reveal-btn" onClick={handleReveal}>
            {revealed ? 'Hide resolution' : 'Reveal resolution'}
          </button>

          <div className="daily-paradox-footer">
            <span className="daily-paradox-counter">
              Paradox {(paradox.dayOfYear % paradox.totalParadoxes) + 1} of {paradox.totalParadoxes}
            </span>
            <button className="daily-paradox-refresh" onClick={loadParadox} title="Refresh">
              <RefreshCcw size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DailyParadox;
