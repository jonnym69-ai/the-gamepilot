import React, { useEffect, useMemo, useState } from 'react';
import { X, Lock, Check, Palette } from 'lucide-react';
import { ProgressionUnlockService } from '../services/ProgressionUnlockService';
import LibraryShareCard, { LIBRARY_SHARE_CARD_SIZE_PX } from './LibraryShareCard';
import './RecapCustomizeModal.css';

const WATERMARK_OPTIONS = [
  { id: 'gamepilot', label: 'GamePilot (default)' },
  { id: 'github', label: 'GitHub releases' },
  { id: 'itchio', label: 'itch.io' },
  { id: 'none', label: 'No watermark' }
];

const STAT_OPTIONS = [
  { key: 'games', label: 'Games' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'steamHours', label: 'Steam Hours' },
  { key: 'libraryValue', label: 'Library Value' },
  { key: 'topGames', label: 'Most Played' }
];

// Preview is scaled down from the full 1080px export size.
const PREVIEW_SCALE = 0.32;

const RecapCustomizeModal = ({ isOpen, onClose, library = [], username = 'Gamer', period = 'all', onApplied }) => {
  const [themes, setThemes] = useState([]);
  const [selectedThemeId, setSelectedThemeId] = useState('nebula');
  const [visibleStats, setVisibleStats] = useState({});
  const [useMostPlayedCover, setUseMostPlayedCover] = useState(true);
  const [shareCardWatermark, setShareCardWatermark] = useState('gamepilot');
  const [toast, setToast] = useState(null);

  const refresh = () => {
    const recapThemes = ProgressionUnlockService.getRecapThemes();
    const customization = ProgressionUnlockService.getRecapCustomization();
    setThemes(recapThemes);
    setSelectedThemeId(customization.selectedThemeId);
    setVisibleStats(customization.visibleStats || {});
    setUseMostPlayedCover(customization.useMostPlayedCover !== false);
    setShareCardWatermark(customization.shareCardWatermark || 'gamepilot');
  };

  useEffect(() => {
    if (isOpen) {
      refresh();
    }
  }, [isOpen]);

  const selectedPalette = useMemo(
    () => themes.find((theme) => theme.id === selectedThemeId)?.palette || null,
    [themes, selectedThemeId]
  );

  const flashToast = (message) => {
    setToast(message);
    setTimeout(() => setToast((current) => (current === message ? null : current)), 2200);
  };

  const handleSelectTheme = (themeId) => {
    const result = ProgressionUnlockService.selectRecapTheme(themeId);
    if (result.success) {
      setSelectedThemeId(themeId);
      flashToast(result.message);
      onApplied?.();
    } else {
      flashToast(result.message);
    }
  };

  const handleToggleStat = (key) => {
    const next = { ...visibleStats, [key]: visibleStats[key] === false };
    ProgressionUnlockService.updateRecapStatVisibility({ [key]: next[key] });
    setVisibleStats(next);
    onApplied?.();
  };

  const handleToggleCover = () => {
    const next = !useMostPlayedCover;
    ProgressionUnlockService.updateRecapUseMostPlayedCover(next);
    setUseMostPlayedCover(next);
    flashToast(next ? 'Most-played cover enabled.' : 'Most-played cover disabled.');
    onApplied?.();
  };

  const handleSelectWatermark = (watermark) => {
    ProgressionUnlockService.updateShareCardWatermark(watermark);
    setShareCardWatermark(watermark);
    flashToast(`Share card watermark set to ${WATERMARK_OPTIONS.find((o) => o.id === watermark)?.label || watermark}.`);
    onApplied?.();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="recap-customize-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Palette size={22} />
            Customize Recap Card
          </h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="recap-customize-body">
          <div className="recap-customize-preview-pane">
            <div
              className="recap-customize-preview-frame"
              style={{
                width: LIBRARY_SHARE_CARD_SIZE_PX * PREVIEW_SCALE,
                height: LIBRARY_SHARE_CARD_SIZE_PX * PREVIEW_SCALE
              }}
            >
              <div
                className="recap-customize-preview-scale"
                style={{ transform: `scale(${PREVIEW_SCALE})` }}
              >
                <LibraryShareCard
                  library={library}
                  username={username}
                  period={period}
                  theme={selectedPalette}
                  visibleStats={visibleStats}
                  showCover={useMostPlayedCover}
                  watermark={shareCardWatermark}
                />
              </div>
            </div>
            <p className="recap-customize-preview-hint">Live preview · exports at 1080×1080</p>
          </div>

          <div className="recap-customize-controls">
            <div className="recap-customize-section">
              <h3>Theme</h3>
              <div className="recap-theme-grid">
                {themes.map((theme) => {
                  const isSelected = theme.id === selectedThemeId;
                  const palette = theme.palette || {};
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      className={`recap-theme-swatch ${isSelected ? 'selected' : ''} ${theme.unlocked ? '' : 'locked'}`}
                      onClick={() => handleSelectTheme(theme.id)}
                      title={theme.unlocked ? theme.description : `${theme.name} unlocks at ${theme.requiredXP.toLocaleString()} XP`}
                      style={{ background: palette.background, borderColor: isSelected ? palette.accent : 'transparent' }}
                    >
                      <span className="recap-theme-accent" style={{ background: palette.accent }} />
                      <span className="recap-theme-name" style={{ color: palette.text }}>{theme.name}</span>
                      {isSelected && theme.unlocked && (
                        <span className="recap-theme-badge" style={{ background: palette.accent }}>
                          <Check size={12} />
                        </span>
                      )}
                      {!theme.unlocked && (
                        <span className="recap-theme-lock">
                          <Lock size={12} />
                          {theme.requiredXP.toLocaleString()} XP
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="recap-customize-section">
              <h3>Background</h3>
              <button
                type="button"
                className={`recap-stat-toggle ${useMostPlayedCover ? 'on' : 'off'}`}
                onClick={handleToggleCover}
              >
                <span className="recap-stat-check">{useMostPlayedCover ? <Check size={14} /> : null}</span>
                Use most-played game cover
              </button>
              <p className="recap-customize-note">When enabled, the top game&apos;s artwork is used as the card background.</p>
            </div>

            <div className="recap-customize-section">
              <h3>Watermark</h3>
              <div className="recap-watermark-options">
                {WATERMARK_OPTIONS.map((option) => {
                  const isSelected = shareCardWatermark === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`recap-stat-toggle ${isSelected ? 'on' : 'off'}`}
                      onClick={() => handleSelectWatermark(option.id)}
                    >
                      <span className="recap-stat-check">{isSelected ? <Check size={14} /> : null}</span>
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <p className="recap-customize-note">Choose what appears at the bottom of your share cards.</p>
            </div>

            <div className="recap-customize-section">
              <h3>Visible stats</h3>
              <div className="recap-stat-toggles">
                {STAT_OPTIONS.map((stat) => {
                  const isOn = visibleStats[stat.key] !== false;
                  return (
                    <button
                      key={stat.key}
                      type="button"
                      className={`recap-stat-toggle ${isOn ? 'on' : 'off'}`}
                      onClick={() => handleToggleStat(stat.key)}
                    >
                      <span className="recap-stat-check">{isOn ? <Check size={14} /> : null}</span>
                      {stat.label}
                    </button>
                  );
                })}
              </div>
              <p className="recap-customize-note">Total playtime always shows as the headline.</p>
            </div>
          </div>
        </div>

        {toast && <div className="recap-customize-toast">{toast}</div>}
      </div>
    </div>
  );
};

export default RecapCustomizeModal;
