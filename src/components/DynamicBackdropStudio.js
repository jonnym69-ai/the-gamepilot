import React, { useEffect, useMemo, useState } from 'react';
import {
  Droplet,
  Monitor,
  Moon,
  Palette,
  Play,
  RefreshCw,
  Sparkles,
  Wind,
  Zap
} from 'lucide-react';
import DynamicBackdropService from '../services/DynamicBackdropService';
import StorageService from '../services/StorageService';
import './DynamicBackdropStudio.css';

const MODES = [
  { id: 'gradient', label: 'Soft Gradient', icon: <Palette size={16} />, desc: 'Smooth radial gradients from your cover colors' },
  { id: 'mesh', label: 'Color Mesh', icon: <Droplet size={16} />, desc: 'Organic blob mesh over a dark base' },
  { id: 'aurora', label: 'Aurora Flow', icon: <Wind size={16} />, desc: 'Slow sweeping aurora animation' },
  { id: 'cover', label: 'Cover Tint', icon: <Monitor size={16} />, desc: 'Subtle tint derived from the cover art' }
];

const PREVIEW_URLS = [
  'https://cdn.akamai.steamstatic.com/steam/apps/570/header.jpg',
  'https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg',
  'https://cdn.akamai.steamstatic.com/steam/apps/271590/header.jpg'
];

export function DynamicBackdropStudio() {
  const [settings, setSettings] = useState(() => DynamicBackdropService.getSettings());
  const [palette, setPalette] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  const previewUrl = useMemo(() => {
    if (settings.source === 'fixed') return PREVIEW_URLS[previewIndex % PREVIEW_URLS.length];
    const lastPlayed = StorageService.get('lastPlayedGame', null);
    return lastPlayed?.coverImage || lastPlayed?.header_image || lastPlayed?.image || PREVIEW_URLS[0];
  }, [settings.source, previewIndex]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    DynamicBackdropService.getPalette(previewUrl).then((result) => {
      if (!active) return;
      setPalette(result);
      setLoading(false);
    });
    return () => { active = false; };
  }, [previewUrl]);

  useEffect(() => {
    DynamicBackdropService.saveSettings(settings);
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const css = useMemo(() => {
    if (!palette || !settings.enabled) return {};
    return DynamicBackdropService.generateBackdropCSS(palette, settings);
  }, [palette, settings]);

  return (
    <div className="dynamic-backdrop-studio">
      <div className="dbs-header">
        <Sparkles size={24} />
        <div>
          <h3>Dynamic Backdrop Studio</h3>
          <p>Live, color-reactive backgrounds powered by your last played cover art.</p>
        </div>
      </div>

      <div className="dbs-grid">
        <div className="dbs-panel">
          <div className="dbs-toggle-row">
            <label className="dbs-toggle">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => updateSetting('enabled', e.target.checked)}
              />
              <span className="dbs-toggle-slider" />
              <span className="dbs-toggle-label">Enable dynamic backdrop</span>
            </label>
          </div>

          <div className="dbs-section">
            <h4>Effect Mode</h4>
            <div className="dbs-modes">
              {MODES.map((mode) => (
                <button
                  key={mode.id}
                  className={`dbs-mode ${settings.mode === mode.id ? 'active' : ''}`}
                  onClick={() => updateSetting('mode', mode.id)}
                >
                  {mode.icon}
                  <div>
                    <strong>{mode.label}</strong>
                    <span>{mode.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="dbs-section">
            <h4>Source</h4>
            <div className="dbs-source">
              <button
                className={settings.source === 'lastPlayed' ? 'active' : ''}
                onClick={() => updateSetting('source', 'lastPlayed')}
              >
                <Play size={16} /> Last played game
              </button>
              <button
                className={settings.source === 'fixed' ? 'active' : ''}
                onClick={() => updateSetting('source', 'fixed')}
              >
                <Moon size={16} /> Static preview
              </button>
            </div>
          </div>

          <div className="dbs-section">
            <h4>Intensity</h4>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.intensity}
              onChange={(e) => updateSetting('intensity', Number(e.target.value))}
            />
            <div className="dbs-range-labels">
              <span>Subtle</span>
              <span>{settings.intensity}%</span>
              <span>Bold</span>
            </div>
          </div>

          <div className="dbs-section">
            <h4>Animation Speed</h4>
            <input
              type="range"
              min={0}
              max={60}
              value={settings.animationSpeed}
              onChange={(e) => updateSetting('animationSpeed', Number(e.target.value))}
            />
            <div className="dbs-range-labels">
              <span>Still</span>
              <span>{settings.animationSpeed}</span>
              <span>Fast</span>
            </div>
          </div>

          <div className="dbs-section-row">
            <div className="dbs-section">
              <h4>Blur</h4>
              <input
                type="range"
                min={0}
                max={20}
                value={settings.blur}
                onChange={(e) => updateSetting('blur', Number(e.target.value))}
              />
              <span className="dbs-value">{settings.blur}px</span>
            </div>
            <div className="dbs-section">
              <h4>Vignette</h4>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.vignette}
                onChange={(e) => updateSetting('vignette', Number(e.target.value))}
              />
              <span className="dbs-value">{settings.vignette}%</span>
            </div>
            <div className="dbs-section">
              <h4>Overlay</h4>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.overlayOpacity}
                onChange={(e) => updateSetting('overlayOpacity', Number(e.target.value))}
              />
              <span className="dbs-value">{settings.overlayOpacity}%</span>
            </div>
          </div>
        </div>

        <div className="dbs-preview">
          <div className="dbs-preview-header">
            <Zap size={16} />
            <span>Live Preview</span>
            {settings.source === 'fixed' && (
              <button className="dbs-preview-next" onClick={() => setPreviewIndex((p) => p + 1)}>
                <RefreshCw size={14} />
              </button>
            )}
          </div>
          <div
            className={`dbs-preview-canvas ${settings.mode} ${settings.enabled ? 'enabled' : 'disabled'}`}
            style={settings.enabled ? css : {}}
          >
            <div className="dbs-preview-overlay" style={{ opacity: settings.overlayOpacity / 100 }} />
            <div className="dbs-preview-vignette" style={{ opacity: settings.vignette / 100 }} />
            <div className="dbs-preview-content">
              <div className="dbs-preview-card">
                <strong>GamePilot</strong>
                <span>This is how cards will look over your backdrop.</span>
              </div>
            </div>
          </div>
          {loading && <div className="dbs-preview-loading"><RefreshCw className="spin" size={16} /> Extracting colors...</div>}
          {palette && (
            <div className="dbs-palette">
              <div className="dbs-swatch" style={{ background: palette.dominant }} title="Dominant" />
              <div className="dbs-swatch" style={{ background: palette.secondary }} title="Secondary" />
              <div className="dbs-swatch" style={{ background: palette.accent }} title="Accent" />
              <div className="dbs-swatch" style={{ background: palette.dark }} title="Dark" />
              <div className="dbs-swatch" style={{ background: palette.light }} title="Light" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DynamicBackdropStudio;
