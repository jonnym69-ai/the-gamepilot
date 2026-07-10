import React from 'react';
import { Search, Gamepad2, ArrowRight } from 'lucide-react';

/**
 * EmptyLibraryState - Shown when the user has no games in their library.
 * Keeps the onboarding message aligned with GamePilot's core pitch:
 * a gaming librarian that builds a persona and recommends what to play next.
 */
function EmptyLibraryState({ onScan, theme = 'dark', scanStatus = 'idle' }) {
  const isScanning = scanStatus === 'scanning';

  return (
    <div style={{
      padding: '40px 20px',
      maxWidth: '900px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '48px'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '24px',
          backgroundColor: 'var(--button-primary-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          boxShadow: '0 10px 40px rgba(255, 107, 53, 0.3)'
        }}>
          <Gamepad2 size={40} color="#fff" />
        </div>
        <h1 style={{
          fontSize: '2.25rem',
          fontWeight: 700,
          marginBottom: '12px',
          background: 'linear-gradient(135deg, #ff6b35 0%, #f093fb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Your gaming librarian is empty
        </h1>
        <p style={{
          fontSize: '1.15rem',
          opacity: 0.8,
          maxWidth: '520px',
          margin: '0 auto',
          lineHeight: 1.6
        }}>
          Scan your libraries so GamePilot can build your persona, roast your habits, and recommend what to play next.
        </p>
      </div>

      {/* Scan CTA */}
      <div style={{
        maxWidth: '520px',
        margin: '0 auto 48px'
      }}>
        <button
          onClick={onScan}
          disabled={isScanning}
          style={{
            width: '100%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '16px 28px',
            borderRadius: '14px',
            backgroundColor: 'var(--button-primary-bg)',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            fontSize: '16px',
            cursor: isScanning ? 'not-allowed' : 'pointer',
            opacity: isScanning ? 0.7 : 1,
            transition: 'transform 0.2s'
          }}
        >
          {isScanning ? (
            <>
              <span className="scan-spinner" style={{
                width: '18px',
                height: '18px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Scanning...
            </>
          ) : (
            <>
              <Search size={20} />
              Scan your games
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>

      {/* Supported Platforms */}
      <div style={{
        backgroundColor: 'var(--card)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{
          fontSize: '1rem',
          fontWeight: 600,
          marginBottom: '16px',
          textAlign: 'center',
          opacity: 0.8
        }}>
          Supported Platforms
        </h3>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '12px'
        }}>
          {['Steam', 'Epic Games', 'Xbox Game Pass', 'GOG', 'EA App', 'Ubisoft Connect', 'Battle.net', 'Rockstar Launcher'].map(platform => (
            <span
              key={platform}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                backgroundColor: 'var(--primary)',
                border: '1px solid var(--border)',
                fontSize: '13px',
                fontWeight: 500
              }}
            >
              {platform}
            </span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default EmptyLibraryState;
