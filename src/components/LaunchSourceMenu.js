import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Play } from 'lucide-react';
import { getLaunchSources } from '../services/LibraryDataService';
import './LaunchSourceMenu.css';

/**
 * Split-button launcher.
 *
 * Primary click launches the game's existing primary platform/appid (no
 * change to behaviour — what users had before).
 *
 * When the game has 2+ launch sources, a chevron opens a dropdown of
 * alternates. Picking an alternate calls `onLaunch` with a SHALLOW CLONE
 * of the game whose `platform` + `appid` are swapped to the chosen
 * source — the rest of the launch pipeline (LauncherService,
 * electronAPI.launchGame) is unchanged.
 *
 * The library entry itself is never mutated.
 */
export function LaunchSourceMenu({
  game,
  onLaunch,
  className = '',
  primaryLabel = 'Launch Game',
  isFocused = false
}) {
  const sources = getLaunchSources(game);
  const hasMultiple = sources.length > 1;
  const primaryPlatform = (game?.platform || sources[0]?.platform || '').trim();

  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handlePrimaryLaunch = useCallback((event) => {
    if (event) {
      event.stopPropagation();
    }
    if (typeof onLaunch === 'function' && game) {
      onLaunch(game);
    }
    setIsOpen(false);
  }, [game, onLaunch]);

  const handleSourceLaunch = useCallback((source, event) => {
    if (event) {
      event.stopPropagation();
    }
    if (typeof onLaunch !== 'function' || !game || !source?.platform) {
      return;
    }
    // Do NOT mutate the library entry; build a shallow clone with the
    // chosen source's platform + appid so the launch pipeline routes
    // through the right launcher.
    onLaunch({
      ...game,
      platform: source.platform,
      appid: source.appid || game.appid
    });
    setIsOpen(false);
  }, [game, onLaunch]);

  const handleToggle = useCallback((event) => {
    event.stopPropagation();
    setIsOpen((prev) => !prev);
  }, []);

  if (!game) return null;

  return (
    <div
      ref={wrapperRef}
      className={`launch-source-menu ${hasMultiple ? 'has-multiple' : ''} ${className}`.trim()}
    >
      <button
        type="button"
        className="launch-source-menu-primary launch-button"
        onClick={handlePrimaryLaunch}
        style={{ outline: isFocused ? '2px solid var(--accent, #ff6b35)' : 'none' }}
        aria-label={primaryPlatform ? `${primaryLabel} on ${primaryPlatform}` : primaryLabel}
      >
        <Play size={16} />
        <span>
          {primaryLabel}
          {hasMultiple && primaryPlatform && (
            <span className="launch-source-menu-platform-hint"> on {primaryPlatform}</span>
          )}
        </span>
      </button>

      {hasMultiple && (
        <button
          type="button"
          className="launch-source-menu-toggle"
          onClick={handleToggle}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label={`Choose launch source (${sources.length} available)`}
        >
          <ChevronDown size={16} />
        </button>
      )}

      {hasMultiple && isOpen && (
        <ul className="launch-source-menu-dropdown" role="menu">
          {sources.map((source) => {
            const isPrimary = source.platform === primaryPlatform;
            return (
              <li key={`${source.platform}::${source.appid || ''}`} role="none">
                <button
                  type="button"
                  className={`launch-source-menu-option ${isPrimary ? 'is-primary' : ''}`}
                  role="menuitem"
                  onClick={(event) => handleSourceLaunch(source, event)}
                >
                  <Play size={14} />
                  <span className="launch-source-menu-option-platform">{source.platform}</span>
                  {isPrimary && <span className="launch-source-menu-option-badge">Primary</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default LaunchSourceMenu;
