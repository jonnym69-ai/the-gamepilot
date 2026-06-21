import React, { useEffect, useState } from 'react';
import { Clock, X } from 'lucide-react';
import { NostalgiaService } from '../services/NostalgiaService';

const NostalgiaCard = ({ library }) => {
  const [memory, setMemory] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const librarySize = Array.isArray(library) ? library.length : 0;

  useEffect(() => {
    if (librarySize === 0) return;
    // Defer to idle so we never block first paint of Home.
    const run = () => {
      const session = NostalgiaService.getOnThisDaySession(library);
      if (session && !session.alreadyShown) {
        setMemory(session);
        NostalgiaService.markShown(session.cacheKey);
      }
    };
    let handle;
    if (typeof window !== 'undefined' && window.requestIdleCallback) {
      handle = window.requestIdleCallback(run, { timeout: 1500 });
      return () => window.cancelIdleCallback && window.cancelIdleCallback(handle);
    }
    handle = setTimeout(run, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [librarySize]);

  if (!memory || dismissed) return null;

  const hours = Math.floor(memory.playtimeMinutes / 60);
  const minutes = memory.playtimeMinutes % 60;
  const timeText = hours > 0
    ? `${hours}.${Math.round((minutes / 60) * 10)}h`
    : `${minutes}m`;

  const dateText = memory.date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="nostalgia-card" style={{
      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        fontSize: '6rem',
        opacity: 0.08,
        transform: 'rotate(-15deg)',
        pointerEvents: 'none'
      }}>
        🕰️
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'rgba(199, 180, 255, 0.9)'
          }}>
            <Clock size={14} />
            On This Day — {memory.yearsAgo} {memory.yearsAgo === 1 ? 'year' : 'years'} ago
          </div>

          <h3 style={{
            margin: '0 0 6px 0',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'var(--text-primary, #fff)'
          }}>
            {memory.gameName}
          </h3>

          <p style={{
            margin: 0,
            fontSize: '0.9rem',
            color: 'var(--text-secondary, rgba(255,255,255,0.7))',
            lineHeight: 1.5
          }}>
            You played for <strong>{timeText}</strong> on {dateText}.
          </p>

          {memory.platform && memory.platform !== 'Unknown' && (
            <span style={{
              display: 'inline-block',
              marginTop: '10px',
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-secondary, rgba(255,255,255,0.7))'
            }}>
              {memory.platform}
            </span>
          )}
        </div>

        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary, rgba(255,255,255,0.5))',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            transition: 'color 0.2s ease'
          }}
          title="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default NostalgiaCard;
