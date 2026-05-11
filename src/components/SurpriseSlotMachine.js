import React, { useState, useEffect } from 'react';
import './SurpriseSlotMachine.css';

const SurpriseSlotMachine = ({ games, onComplete }) => {
  const [spinning, setSpinning] = useState(true);
  const [previewGames, setPreviewGames] = useState([]);
  const [spinningGame, setSpinningGame] = useState(null);
  const [revealedGame, setRevealedGame] = useState(null);

  useEffect(() => {
    if (!games || games.length === 0) {
      setSpinning(false);
      return;
    }

    const finalIdx = Math.floor(Math.random() * games.length);

    const spinDuration = 1800;
    const intervalSpeed = 120;
    let elapsed = 0;

    const buildPreviewStrip = (forcedGame = null) => {
      const strip = [];

      while (strip.length < 6) {
        strip.push(games[Math.floor(Math.random() * games.length)]);
      }

      if (forcedGame) {
        strip[2] = forcedGame;
      }

      return strip;
    };

    const initialGame = games[Math.floor(Math.random() * games.length)];
    setSpinningGame(initialGame);
    setRevealedGame(null);
    setPreviewGames(buildPreviewStrip(initialGame));

    const interval = setInterval(() => {
      elapsed += intervalSpeed;

      const currentGame = games[Math.floor(Math.random() * games.length)];
      setSpinningGame(currentGame);
      setPreviewGames(buildPreviewStrip(currentGame));

      if (elapsed >= spinDuration) {
        clearInterval(interval);
        const winner = games[finalIdx];
        setSpinning(false);
        // Keep showing random games in preview strip until actual reveal

        setTimeout(() => {
          setRevealedGame(winner);
          setPreviewGames(buildPreviewStrip(winner));
        }, 180);

        setTimeout(() => {
          onComplete(winner);
        }, 800);
      }
    }, intervalSpeed);

    return () => clearInterval(interval);
  }, [games, onComplete]);

  if (!games || games.length === 0) {
    return null;
  }

  const displayGame = spinning ? spinningGame : revealedGame;

  return (
    <div className="slot-machine-overlay">
      <div className="slot-machine-container">
        <div className="slot-machine-header">
          <span className="slot-title">Surprise Me</span>
          <p className="slot-subtitle">Picking something random from your library.</p>
        </div>

        <div className="slot-machine-window">
          <div className={`slot-hero-card ${spinning ? 'spinning' : 'settled'}`}>
            <div className="slot-game-icon slot-game-icon--hero">
              {spinning ? (
                <div className="slot-hero-placeholder">?</div>
              ) : displayGame?.artwork || displayGame?.background?.includes('http') ? (
                <img src={displayGame.artwork || displayGame.background} alt="" />
              ) : (
                <span className="slot-game-emoji">?</span>
              )}
            </div>

            <div className="slot-hero-copy">
              <span className="slot-status-pill">{spinning ? 'Choosing...' : 'Picked'}</span>
              <span className="slot-game-name slot-game-name--hero">
                {spinning ? 'Surprise incoming...' : displayGame?.name || 'Loading...'}
              </span>
              {spinning ? (
                <span className="slot-game-platform">Hidden until reveal</span>
              ) : displayGame?.platform && (
                <span className="slot-game-platform">{displayGame.platform}</span>
              )}
            </div>
          </div>

          <div className={`slot-preview-strip ${spinning ? 'spinning' : 'settled'}`}>
            {previewGames.map((game, idx) => (
              <div
                key={`${game?.name || 'empty'}-${idx}`}
                className={`slot-preview-item ${idx === 2 ? 'slot-preview-item--focus' : ''}`}
              >
                <div className="slot-game-icon slot-game-icon--preview">
                  {game?.artwork || game?.background?.includes('http') ? (
                    <img src={game.artwork || game.background} alt="" />
                  ) : (
                    <span className="slot-game-emoji">?</span>
                  )}
                </div>
                <span className="slot-preview-name">{game?.name || 'Loading...'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="slot-machine-footer">
          <div className={`slot-lights ${spinning ? 'spinning' : ''}`}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={`slot-light ${i % 2 === 0 ? 'slot-light--on' : ''}`} />
            ))}
          </div>
        </div>

        {/* Winner celebration effect */}
        {!spinning && revealedGame && (
          <div className="winner-celebration active" />
        )}

        {spinning && (
          <div className="slot-spinning-indicator">
            <div className="spin-dots">
              <span>.</span><span>.</span><span>.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurpriseSlotMachine;
