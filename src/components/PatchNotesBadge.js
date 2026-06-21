import React, { useEffect, useState } from 'react';
import { Newspaper } from 'lucide-react';
import { PatchNotesService } from '../services/PatchNotesService';

const PatchNotesBadge = ({ library }) => {
  const [updates, setUpdates] = useState([]);
  const [expanded, setExpanded] = useState(false);

  const librarySize = library?.length || 0;
  useEffect(() => {
    let mounted = true;
    let idleHandle = null;
    // Lazy load: wait 3s + idle so it doesn't block first paint
    const timer = setTimeout(() => {
      if (!mounted || !librarySize) return;
      const run = async () => {
        const results = await PatchNotesService.checkLibrary(library);
        if (mounted) setUpdates(results);
      };
      if (typeof window !== 'undefined' && window.requestIdleCallback) {
        idleHandle = window.requestIdleCallback(run, { timeout: 5000 });
      } else {
        run();
      }
    }, 3000);
    return () => {
      mounted = false;
      clearTimeout(timer);
      if (idleHandle && window.cancelIdleCallback) window.cancelIdleCallback(idleHandle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [librarySize]);

  if (updates.length === 0) return null;

  const totalUnseen = updates.reduce((sum, u) => sum + u.unseenCount, 0);

  return (
    <div className="patch-notes-badge" style={{
      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(21, 128, 61, 0.15) 100%)',
      border: '1px solid rgba(34, 197, 94, 0.3)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '20px'
    }}>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-primary, #fff)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          fontSize: '0.95rem',
          fontWeight: 600,
          textAlign: 'left'
        }}
      >
        <Newspaper size={18} style={{ color: '#22c55e' }} />
        <span>{totalUnseen} patch note{totalUnseen === 1 ? '' : 's'} across {updates.length} game{updates.length === 1 ? '' : 's'}</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', opacity: 0.6 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {updates.map(u => (
            <div key={u.appId} style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              padding: '12px'
            }}>
              <div style={{ fontWeight: 600, marginBottom: '6px' }}>{u.gameName}</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                {u.notes.map(n => (
                  <div key={n.url} style={{ marginBottom: '6px' }}>
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#22c55e', textDecoration: 'none' }}
                    >
                      {n.title}
                    </a>
                    <span style={{ opacity: 0.5, marginLeft: '8px', fontSize: '0.75rem' }}>
                      {new Date(n.date).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatchNotesBadge;
