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
    <div className={`empty-library-state ${theme}`}>
      {/* Header */}
      <div className="empty-library-header">
        <div className="empty-library-icon">
          <Gamepad2 size={40} color="#fff" />
        </div>
        <h1>Your gaming librarian is empty</h1>
        <p>
          Scan your libraries so GamePilot can build your persona, roast your habits, and recommend what to play next.
        </p>
      </div>

      {/* Scan CTA */}
      <div className="empty-library-cta">
        <button
          onClick={onScan}
          disabled={isScanning}
          className="empty-library-scan-button"
          aria-busy={isScanning}
        >
          {isScanning ? (
            <>
              <span className="empty-library-scan-spinner" aria-hidden="true" />
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
      <div className="empty-library-platforms">
        <h3>Supported Platforms</h3>
        <div className="empty-library-platform-list">
          {['Steam', 'Epic Games', 'Xbox Game Pass', 'GOG', 'EA App', 'Ubisoft Connect', 'Battle.net', 'Rockstar Launcher'].map(platform => (
            <span key={platform} className="empty-library-platform-chip">
              {platform}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EmptyLibraryState;
