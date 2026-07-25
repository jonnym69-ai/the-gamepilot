import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, Gamepad2 } from 'lucide-react';
import { resolveGameArtwork, getGameArtworkPlaceholder } from '../services/GameArtworkService';

function WelcomeBackCard({ data, onLaunchGame, onDismiss, onOptOut }) {
  const [imgError, setImgError] = useState(false);
  const [recImgError, setRecImgError] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (!data) return undefined;
    const handleEscape = (e) => { if (e.key === 'Escape') onDismiss(); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [data, onDismiss]);

  if (!data) return null;

  const { anchorGame, recommendedGame, reason, label, roast, headline } = data;

  const anchorArt = !imgError
    ? resolveGameArtwork(anchorGame)
    : getGameArtworkPlaceholder(anchorGame);
  const recArt = !recImgError
    ? resolveGameArtwork(recommendedGame)
    : getGameArtworkPlaceholder(recommendedGame);

  const handleDismiss = () => {
    if (dontShowAgain && onOptOut) onOptOut();
    onDismiss();
  };

  const handleLaunch = () => {
    if (dontShowAgain && onOptOut) onOptOut();
    if (onLaunchGame && recommendedGame) onLaunchGame(recommendedGame);
    onDismiss();
  };

  return (
    <div className="modal-overlay" onClick={handleDismiss}>
      <div
        className="modal-content"
        style={{ maxWidth: '580px', padding: '0', overflow: 'hidden' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-back-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleDismiss}
          className="modal-close"
          aria-label="Close welcome back"
        >
          <span aria-hidden="true">×</span>
        </button>

        {/* Persona header band */}
        <div style={{
          padding: '28px 32px 20px',
          background: 'linear-gradient(135deg, var(--accent, #6c5ce7) 0%, var(--accent-secondary, #a29bfe) 100%)',
          color: '#fff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Gamepad2 size={16} style={{ opacity: 0.8 }} />
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8 }}>
              Welcome back
            </span>
          </div>
          {headline && (
            <h2 id="welcome-back-title" style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 4px', lineHeight: 1.3 }}>
              {headline}
            </h2>
          )}
          {roast && (
            <p style={{ fontSize: '0.85rem', opacity: 0.9, margin: 0, lineHeight: 1.5 }}>
              {roast}
            </p>
          )}
        </div>

        {/* Game comparison body */}
        <div style={{ padding: '24px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            {/* Anchor game */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: '1' }}>
              <span style={{ fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                You've been playing
              </span>
              <img
                src={anchorArt}
                alt={anchorGame?.name || 'anchor'}
                style={{ width: '100%', maxWidth: '160px', height: '75px', borderRadius: '8px', objectFit: 'cover' }}
                onError={() => setImgError(true)}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>
                {anchorGame?.name || 'Unknown'}
              </span>
            </div>

            <ArrowRight size={28} style={{ opacity: 0.3, flexShrink: 0 }} />

            {/* Recommended game */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: '1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} style={{ opacity: 0.6 }} />
                <span style={{ fontSize: '0.65rem', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {label ? `${label} pick` : 'Try next'}
                </span>
              </div>
              <img
                src={recArt}
                alt={recommendedGame?.name || 'recommended'}
                style={{ width: '100%', maxWidth: '160px', height: '75px', borderRadius: '8px', objectFit: 'cover', border: '2px solid var(--accent, #6c5ce7)' }}
                onError={() => setRecImgError(true)}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>
                {recommendedGame?.name || 'Unknown'}
              </span>
            </div>
          </div>

          {/* Reason highlight box */}
          <div style={{
            background: 'var(--bg-secondary, rgba(255,255,255,0.05))',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '20px'
          }}>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.6, margin: 0, opacity: 0.9 }}>
              {reason}
            </p>
          </div>

          {/* Genre tags */}
          {recommendedGame?.genres?.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {recommendedGame.genres.slice(0, 4).map((g, i) => (
                <span key={i} style={{
                  fontSize: '0.7rem',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: 'var(--bg-secondary, rgba(255,255,255,0.08))',
                  opacity: 0.7
                }}>
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleLaunch}
              style={{
                padding: '12px 28px',
                borderRadius: '10px',
                border: 'none',
                background: 'var(--accent, #6c5ce7)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                flex: '1 1 auto'
              }}
            >
              Launch {recommendedGame?.name || 'Game'}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              style={{
                padding: '12px 20px',
                borderRadius: '10px',
                border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
                background: 'transparent',
                color: 'var(--text)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Not now
            </button>
          </div>

          {/* Opt-out toggle */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '16px',
            fontSize: '0.75rem',
            opacity: 0.5,
            cursor: 'pointer',
            userSelect: 'none'
          }}>
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Don't show welcome back pop-ups
          </label>
        </div>
      </div>
    </div>
  );
}

export default WelcomeBackCard;
