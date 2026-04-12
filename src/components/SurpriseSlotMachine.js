import React, { useState, useEffect } from 'react';
import './SurpriseSlotMachine.css';

const SurpriseSlotMachine = ({ games, onComplete }) => {
  const [spinning, setSpinning] = useState(true);
  const [displayGames, setDisplayGames] = useState([]);

  useEffect(() => {
    if (!games || games.length === 0) {
      setSpinning(false);
      return;
    }

    const finalIdx = Math.floor(Math.random() * games.length);

    const spinDuration = 2000;
    const intervalSpeed = 80;
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += intervalSpeed;
      
      setDisplayGames([
        games[Math.floor(Math.random() * games.length)],
        games[Math.floor(Math.random() * games.length)],
        games[Math.floor(Math.random() * games.length)]
      ]);

      if (elapsed >= spinDuration) {
        clearInterval(interval);
        setSpinning(false);
        setDisplayGames([
          games[(finalIdx - 1 + games.length) % games.length],
          games[finalIdx],
          games[(finalIdx + 1) % games.length]
        ]);
        
        setTimeout(() => {
          onComplete(games[finalIdx]);
        }, 800);
      }
    }, intervalSpeed);

    return () => clearInterval(interval);
  }, [games, onComplete]);

  if (!games || games.length === 0) {
    return null;
  }

  return (
    <div className="slot-machine-overlay">
      <div className="slot-machine-container">
        <div className="slot-machine-header">
          <span className="slot-title">Finding Your Surprise...</span>
        </div>
        
        <div className="slot-machine-window">
          <div className="slot-reel">
            {displayGames.map((game, idx) => (
              <div 
                key={`${game?.name || 'empty'}-${idx}`} 
                className={`slot-item ${idx === 1 && !spinning ? 'slot-item--center' : ''}`}
              >
                <div className="slot-game-icon">
                  {game?.artwork || game?.background?.includes('http') ? (
                    <img src={game.artwork || game.background} alt="" />
                  ) : (
                    <span className="slot-game-emoji">?</span>
                  )}
                </div>
                <span className="slot-game-name">
                  {game?.name || 'Loading...'}
                </span>
              </div>
            ))}
          </div>
          
          <div className="slot-machine-divider">
            <div className="divider-line" />
            <div className="divider-arrow">?</div>
            <div className="divider-line" />
          </div>
        </div>

        <div className="slot-machine-footer">
          <div className="slot-lights">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={`slot-light ${i % 2 === 0 ? 'slot-light--on' : ''}`} />
            ))}
          </div>
        </div>

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
