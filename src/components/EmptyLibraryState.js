import React from 'react';
import { Search, Gamepad2, Sparkles, Trophy, ArrowRight } from 'lucide-react';

/**
 * EmptyLibraryState - Shown when user has no games in their library
 * Provides clear guidance on how to get started
 */
function EmptyLibraryState({ onScan, theme = 'dark', scanStatus = 'idle' }) {
  const steps = [
    {
      icon: Search,
      title: 'Scan Your Games',
      description: 'GamePilot automatically finds games from Steam, Epic, Xbox, GOG, EA, Ubisoft, Battle.net, and more.',
      action: 'Start Scan'
    },
    {
      icon: Gamepad2,
      title: 'Launch & Play',
      description: 'Click any game to launch it. GamePilot tracks your playtime automatically.',
      action: null
    },
    {
      icon: Sparkles,
      title: 'Get Recommendations',
      description: 'Use mood filters and time availability to find the perfect game for any moment.',
      action: null
    },
    {
      icon: Trophy,
      title: 'Earn XP & Unlock',
      description: 'Earn XP by playing games and completing achievements. Unlock themes, audio packs, and profile customizations.',
      action: null
    }
  ];

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
          fontSize: '2.5rem',
          fontWeight: 700,
          marginBottom: '12px',
          background: 'linear-gradient(135deg, #ff6b35 0%, #f093fb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Welcome to GamePilot
        </h1>
        <p style={{
          fontSize: '1.25rem',
          opacity: 0.8,
          maxWidth: '500px',
          margin: '0 auto',
          lineHeight: 1.6
        }}>
          Your game library is empty. Let's discover your games and get started!
        </p>
      </div>

      {/* Steps */}
      <div style={{
        display: 'grid',
        gap: '20px',
        marginBottom: '48px'
      }}>
        {steps.map((step, index) => {
          const IconComponent = step.icon;
          const isFirst = index === 0;
          
          return (
            <div
              key={step.title}
              style={{
                backgroundColor: isFirst ? 'var(--card)' : 'transparent',
                border: `2px solid ${isFirst ? 'var(--button-primary-bg)' : 'var(--border)'}`,
                borderRadius: '16px',
                padding: '24px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '20px',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: isFirst && onScan ? 'pointer' : 'default'
              }}
              onClick={() => isFirst && onScan && onScan()}
              onMouseEnter={(e) => {
                if (isFirst) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                backgroundColor: isFirst ? 'var(--button-primary-bg)' : 'var(--card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <IconComponent 
                  size={28} 
                  color={isFirst ? '#fff' : 'var(--button-primary-bg)'} 
                />
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '8px'
                }}>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    margin: 0
                  }}>
                    {index + 1}. {step.title}
                  </h3>
                  {isFirst && scanStatus === 'scanning' && (
                    <span style={{
                      fontSize: '12px',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255, 107, 53, 0.15)',
                      color: 'var(--button-primary-bg)'
                    }}>
                      Scanning...
                    </span>
                  )}
                </div>
                <p style={{
                  margin: 0,
                  opacity: 0.8,
                  lineHeight: 1.6,
                  fontSize: '15px'
                }}>
                  {step.description}
                </p>
                
                {step.action && onScan && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onScan();
                    }}
                    disabled={scanStatus === 'scanning'}
                    style={{
                      marginTop: '16px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 24px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--button-primary-bg)',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '15px',
                      cursor: scanStatus === 'scanning' ? 'not-allowed' : 'pointer',
                      opacity: scanStatus === 'scanning' ? 0.7 : 1,
                      transition: 'transform 0.2s'
                    }}
                  >
                    {scanStatus === 'scanning' ? (
                      <>
                        <span className="scan-spinner" style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#fff',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                        Scanning...
                      </>
                    ) : (
                      <>
                        {step.action}
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
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
