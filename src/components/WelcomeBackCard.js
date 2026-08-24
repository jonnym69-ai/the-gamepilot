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

  const { anchorGame, recommendedGame, reason, label, headline, lastSessionDuration } = data;

  const anchorArt = !imgError
    ? resolveGameArtwork(anchorGame, { surface: 'portrait' })
    : getGameArtworkPlaceholder({ game: anchorGame, surface: 'portrait' });
  const recArt = !recImgError
    ? resolveGameArtwork(recommendedGame, { surface: 'portrait' })
    : getGameArtworkPlaceholder({ game: recommendedGame, surface: 'portrait' });

  const handleDismiss = () => {
    if (dontShowAgain && onOptOut) onOptOut();
    onDismiss();
  };

  const handleLaunchAnchor = () => {
    if (dontShowAgain && onOptOut) onOptOut();
    if (onLaunchGame && anchorGame) onLaunchGame(anchorGame);
    onDismiss();
  };

  const handleLaunchRec = () => {
    if (dontShowAgain && onOptOut) onOptOut();
    if (onLaunchGame && recommendedGame) onLaunchGame(recommendedGame);
    onDismiss();
  };

  return (
    <div className="modal-overlay" onClick={handleDismiss}>
      <div
        className="modal-content"
        style={{
          maxWidth: '560px',
          padding: '0',
          overflow: 'hidden',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(108,92,231,0.15)'
        }}
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

        {/* Recent activity header */}
        <div style={{
          padding: '24px 28px 18px',
          background: 'linear-gradient(135deg, rgba(108,92,231,0.9) 0%, rgba(88,72,200,0.9) 100%)',
          color: '#fff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Gamepad2 size={15} style={{ opacity: 0.85 }} />
            <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.85 }}>
              Welcome back
            </span>
          </div>
          {headline && (
            <h2 id="welcome-back-title" style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, lineHeight: 1.35 }}>
              {headline}
            </h2>
          )}
        </div>

        {/* Game comparison body */}
        <div style={{ padding: '22px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '18px' }}>
            {/* Anchor game (Last Played) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: '1' }}>
              <span style={{ fontSize: '0.65rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a29bfe' }}>
                ⏱️ Last Played{lastSessionDuration ? ` · ${lastSessionDuration}` : ''}
              </span>
              <img
                src={anchorArt}
                alt={anchorGame?.name || 'anchor'}
                style={{
                  width: '100%',
                  maxWidth: '120px',
                  aspectRatio: '2 / 3',
                  borderRadius: '10px',
                  objectFit: 'cover',
                  border: '2px solid rgba(108,92,231,0.5)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.35)'
                }}
                onError={() => setImgError(true)}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>
                {anchorGame?.name || 'Unknown'}
              </span>
            </div>

            <ArrowRight size={28} style={{ opacity: 0.3, flexShrink: 0 }} />

            {/* Recommended / Relatable pick */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: '1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={12} style={{ opacity: 0.7, color: '#ffeaa7' }} />
                <span style={{ fontSize: '0.65rem', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ffeaa7' }}>
                  {label ? `${label} Pick` : 'Relatable Pick'}
                </span>
              </div>
              <img
                src={recArt}
                alt={recommendedGame?.name || 'recommended'}
                style={{
                  width: '100%',
                  maxWidth: '120px',
                  aspectRatio: '2 / 3',
                  borderRadius: '10px',
                  objectFit: 'cover',
                  border: '2px solid var(--accent, #6c5ce7)',
                  boxShadow: '0 4px 16px rgba(108,92,231,0.35)'
                }}
                onError={() => setRecImgError(true)}
              />
              <span style={{ fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>
                {recommendedGame?.name || 'Unknown'}
              </span>
            </div>
          </div>

          {/* Reason highlight box */}
          <div style={{
            background: 'var(--bg-secondary, rgba(255,255,255,0.04))',
            border: '1px solid rgba(255,255,255,0.06)',
            borderLeft: '3px solid var(--accent, #6c5ce7)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '18px'
          }}>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.6, margin: 0, opacity: 0.9 }}>
              {reason}
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleLaunchAnchor}
              style={{
                padding: '12px 20px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, var(--accent, #6c5ce7) 0%, #5848c8 100%)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                flex: '1 1 auto',
                boxShadow: '0 4px 14px rgba(108,92,231,0.35)'
              }}
            >
              ▶️ Jump back into {anchorGame?.name ? (anchorGame.name.length > 18 ? `${anchorGame.name.slice(0, 16)}...` : anchorGame.name) : 'Last Game'}
            </button>
            {recommendedGame && (
              <button
                type="button"
                onClick={handleLaunchRec}
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  flex: '1 1 auto'
                }}
              >
                ✨ Try {recommendedGame?.name ? (recommendedGame.name.length > 18 ? `${recommendedGame.name.slice(0, 16)}...` : recommendedGame.name) : 'Next'}
              </button>
            )}
            <button
              type="button"
              onClick={handleDismiss}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
                background: 'transparent',
                color: 'var(--text)',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              Skip
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
