import React, { useEffect, useState } from 'react';
import './GameBarOverlay.css';

function GameBarOverlay() {
  const [library, setLibrary] = useState(() => {
    try {
      const raw = window.localStorage.getItem('gamepilot-library');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [now, setNow] = useState(Date.now());
  const [startTime, setStartTime] = useState(Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    const onStorage = () => {
      try {
        const raw = window.localStorage.getItem('gamepilot-library');
        setLibrary(raw ? JSON.parse(raw) : []);
      } catch {
        setLibrary([]);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const currentGame = (() => {
    if (!Array.isArray(library) || library.length === 0) return null;
    const lastPlayed = library
      .filter((g) => g?.isRunning || g?.last_played)
      .sort((a, b) => {
        if (a?.isRunning && !b?.isRunning) return -1;
        if (!a?.isRunning && b?.isRunning) return 1;
        return String(b?.last_played || '').localeCompare(String(a?.last_played || ''));
      })[0];
    return lastPlayed || library[0];
  })();

  useEffect(() => {
    if (currentGame?.isRunning) {
      setStartTime(Date.now());
    }
  }, [currentGame?.name, currentGame?.isRunning]);

  const formatTime = (minutes = 0, running = false) => {
    let m = Math.max(0, Math.floor(Number(minutes) || 0));
    if (running) {
      m += Math.floor((now - startTime) / 60000);
    }
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return `${h}h ${rem}m`;
  };

  return (
    <div className="gamebar-overlay">
      <div className="gamebar-header">
        <span className="gamebar-logo" aria-hidden="true">🎮</span>
        <span className="gamebar-title">GamePilot</span>
      </div>
      {currentGame ? (
        <div className="gamebar-game">
          <div className="gamebar-name" title={currentGame.name}>{currentGame.name}</div>
          <div className="gamebar-meta">
            {currentGame.isRunning ? (
              <span className="gamebar-live">● Playing now</span>
            ) : (
              <span>Last played</span>
            )}
            <span className="gamebar-divider">·</span>
            <span>{formatTime(currentGame.time_played, currentGame.isRunning)}</span>
          </div>
        </div>
      ) : (
        <div className="gamebar-empty">No games in library yet.</div>
      )}
    </div>
  );
}

export default GameBarOverlay;
