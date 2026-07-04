import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Palette, Sparkles, Wand2, Trash2, Square, Type, Zap, FolderOpen, Layers } from 'lucide-react';
import NavBar from './NavBar';
import StorageService from './services/StorageService';
import './ThemeBuilder.css';

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

const PRESET_GRADIENTS = [
  { id: 'sunset', name: 'Sunset', from: '#ff6b6b', to: '#feca57', angle: 135 },
  { id: 'ocean', name: 'Ocean', from: '#1a73e8', to: '#00d2d3', angle: 135 },
  { id: 'forest', name: 'Forest', from: '#00b894', to: '#55efc4', angle: 135 },
  { id: 'midnight', name: 'Midnight', from: '#2d3436', to: '#636e72', angle: 135 },
  { id: 'cosmic', name: 'Cosmic', from: '#6c5ce7', to: '#fd79a8', angle: 135 },
  { id: 'ember', name: 'Ember', from: '#e17055', to: '#d63031', angle: 135 },
];

const EFFECTS = [
  { id: 'none', name: 'None' },
  { id: 'snow', name: 'Snow' },
  { id: 'pulse', name: 'Subtle Pulse' },
  { id: 'particles', name: 'Floating Particles' },
  { id: 'starfield', name: 'Starfield' },
  { id: 'aurora', name: 'Aurora Glow' },
];

const ACCENT_PRESETS = [
  '#00d2d3', '#ff6b6b', '#feca57', '#1a73e8', '#00b894', '#e17055', '#6c5ce7', '#fd79a8', '#ffeaa7', '#55efc4'
];

export default function ThemeBuilder() {
  const navigate = useNavigate();

  const [bgType, setBgType] = useState('solid');
  const [solidColor, setSolidColor] = useState('#0f172a');
  const [gradientFrom, setGradientFrom] = useState('#1a73e8');
  const [gradientTo, setGradientTo] = useState('#00d2d3');
  const [gradientAngle, setGradientAngle] = useState(135);
  const [effect, setEffect] = useState('none');
  const [accent, setAccent] = useState('#00d2d3');
  const [textColor, setTextColor] = useState('#ffffff');

  // Card styling
  const [cardRadius, setCardRadius] = useState(12);
  const [cardBlur, setCardBlur] = useState(12);
  const [cardOpacity, setCardOpacity] = useState(8);

  // Font
  const [fontFamily, setFontFamily] = useState('system');

  // Glow
  const [neonGlow, setNeonGlow] = useState(false);

  // Particle config (only used when effect === 'particles')
  const [particleDensity, setParticleDensity] = useState(3);
  const [particleSpeed, setParticleSpeed] = useState(3);
  const [effectColor, setEffectColor] = useState('#ffffff');
  const [effectIntensity, setEffectIntensity] = useState(3);
  const [vignette, setVignette] = useState(0);
  const [grain, setGrain] = useState(0);
  const [bloom, setBloom] = useState(0);
  const [shadowDepth, setShadowDepth] = useState(10);
  const [borderWidth, setBorderWidth] = useState(1);

  // Doodle style override
  const [doodleStyle, setDoodleStyle] = useState(
    () => StorageService.getString('doodleStyleOverride') || 'auto'
  );
  const [doodleWordmark, setDoodleWordmark] = useState(
    () => StorageService.getString('doodleWordmark', 'GamePilot')
  );

  // Save slots
  const [slotName, setSlotName] = useState('');

  const [previewActive, setPreviewActive] = useState(false);

  useEffect(() => {
    const saved = StorageService.get('themeBuilderConfig', null);
    if (saved) {
      setBgType(saved.bgType || 'solid');
      setSolidColor(saved.solidColor || '#0f172a');
      setGradientFrom(saved.gradientFrom || '#1a73e8');
      setGradientTo(saved.gradientTo || '#00d2d3');
      setGradientAngle(saved.gradientAngle || 135);
      const loadedEffect = saved.effect || 'none';
      setEffect(loadedEffect);
      setAccent(saved.accent || '#00d2d3');
      setCardRadius(saved.cardRadius ?? 12);
      setCardBlur(saved.cardBlur ?? 12);
      setCardOpacity(saved.cardOpacity ?? 8);
      setFontFamily(saved.fontFamily || 'system');
      setNeonGlow(saved.neonGlow ?? false);
      setParticleDensity(saved.particleDensity ?? 3);
      setParticleSpeed(saved.particleSpeed ?? 3);
      setEffectColor(saved.effectColor || '#ffffff');
      setEffectIntensity(saved.effectIntensity ?? 3);
      setVignette(saved.vignette ?? 0);
      setGrain(saved.grain ?? 0);
      setBloom(saved.bloom ?? 0);
      setShadowDepth(saved.shadowDepth ?? 10);
      setBorderWidth(saved.borderWidth ?? 1);
      setTextColor(saved.textColor || '#ffffff');
    }
    setDoodleStyle(StorageService.getString('doodleStyleOverride') || 'auto');
    setDoodleWordmark(StorageService.getString('doodleWordmark', 'GamePilot'));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const rgb = hexToRgb(effectColor);
    const soft = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(0.8, 0.08 + effectIntensity * 0.1)})`;
    root.style.setProperty('--builder-effect-color', effectColor);
    root.style.setProperty('--builder-effect-soft', soft);
    root.style.setProperty('--builder-effect-intensity', String(effectIntensity));
    root.style.setProperty('--builder-effect-speed', `${Math.max(3, 18 - particleSpeed * 3)}s`);
  }, [effectColor, effectIntensity, particleSpeed]);


  const getPreviewStyle = () => {
    const base = {
      background: bgType === 'solid'
        ? solidColor
        : `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`,
      color: '#ffffff',
    };
    return base;
  };

  const applyDoodleStyle = (style) => {
    setDoodleStyle(style);
    StorageService.setString('doodleStyleOverride', style);
    window.dispatchEvent(new CustomEvent('gamepilot:doodle-style-updated'));
  };

  const applyTheme = () => {
    const config = {
      bgType,
      solidColor,
      gradientFrom,
      gradientTo,
      gradientAngle,
      effect,
      accent,
      textColor,
      cardRadius,
      cardBlur,
      cardOpacity,
      fontFamily,
      neonGlow,
      particleDensity,
      particleSpeed,
      effectColor,
      effectIntensity,
      vignette,
      grain,
      bloom,
      shadowDepth,
      borderWidth,
    };
    StorageService.set('themeBuilderConfig', config);
    StorageService.setString('themeBuilderActive', 'true');

    const textRgb = hexToRgb(textColor);
    const textSecondary = `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, 0.8)`;
    const textMuted = `rgba(${textRgb.r}, ${textRgb.g}, ${textRgb.b}, 0.6)`;
    const effectRgb = hexToRgb(effectColor);
    const effectSoft = `rgba(${effectRgb.r}, ${effectRgb.g}, ${effectRgb.b}, ${Math.min(0.8, 0.08 + effectIntensity * 0.1)})`;

    const bg = bgType === 'solid'
      ? solidColor
      : `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`;

    const cssVars = {
      '--bg-primary': bg,
      '--bg-secondary': bgType === 'solid' ? solidColor : gradientFrom,
      '--bg-card': `rgba(255,255,255,0.${String(cardOpacity).padStart(2, '0')})`,
      '--bg-input': `rgba(255,255,255,0.${String(Math.max(4, cardOpacity - 4)).padStart(2, '0')})`,
      '--bg-hover': `rgba(255,255,255,0.${String(Math.min(20, cardOpacity + 4)).padStart(2, '0')})`,
      '--text-primary': textColor,
      '--text-secondary': textSecondary,
      '--text-muted': textMuted,
      '--text-color': textColor,
      '--text-accent': accent,
      '--border-primary': 'rgba(255,255,255,0.15)',
      '--border-secondary': 'rgba(255,255,255,0.1)',
      '--accent-color': accent,
      '--primary-color': accent,
      '--button-primary-bg': accent,
      '--button-primary-text': '#0f172a',
      '--link-primary': accent,
      '--card-radius': `${cardRadius}px`,
      '--card-blur': `${cardBlur}px`,
      '--card-border-width': `${borderWidth}px`,
      '--card-shadow-depth': shadowDepth,
      '--builder-font': fontFamily === 'monospace' ? "'Fira Code', 'Cascadia Code', monospace" : fontFamily === 'serif' ? "'Merriweather', 'Georgia', serif" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      '--neon-glow': neonGlow ? `0 0 ${Math.max(12, shadowDepth * 2)}px ${accent}66, 0 0 4px ${accent}44` : `0 ${Math.max(4, shadowDepth / 2)}px ${Math.max(12, shadowDepth * 2)}px rgba(0, 0, 0, 0.2)`,
      '--particle-density': particleDensity,
      '--particle-speed': 11 - particleSpeed,
      '--builder-effect': effect,
      '--builder-effect-color': effectColor,
      '--builder-effect-soft': effectSoft,
      '--builder-effect-intensity': effectIntensity,
      '--builder-effect-speed': `${Math.max(3, 18 - particleSpeed * 3)}s`,
      '--builder-vignette': vignette / 100,
      '--builder-grain': grain / 100,
      '--builder-bloom': bloom / 100,
      '--nav-text': textColor,
      '--nav-bg': `rgba(255,255,255,0.${String(cardOpacity).padStart(2, '0')})`,
      '--nav-hover': `rgba(255,255,255,0.${String(Math.min(20, cardOpacity + 4)).padStart(2, '0')})`,
      '--nav-active': accent,
      '--header-text': textColor,
      '--header-bg': bg,
      '--header-border': 'rgba(255,255,255,0.15)',
      '--header-accent': accent,
      '--card-bg': `rgba(255,255,255,0.${String(cardOpacity).padStart(2, '0')})`,
      '--input-bg': `rgba(255,255,255,0.${String(Math.max(4, cardOpacity - 4)).padStart(2, '0')})`,
      '--option-bg': bgType === 'solid' ? solidColor : gradientFrom,
      '--button-bg': accent,
      '--button-text': '#0f172a',
      '--muted-color': textMuted,
      '--text-inverse': accent,
      '--card': `rgba(255,255,255,0.${String(cardOpacity).padStart(2, '0')})`,
      '--container-bg': `rgba(255,255,255,0.${String(cardOpacity).padStart(2, '0')})`,
      '--content-bg': bg,
      '--modal-bg': `rgba(255,255,255,0.${String(cardOpacity).padStart(2, '0')})`,
      '--sidebar-bg': `rgba(255,255,255,0.${String(cardOpacity).padStart(2, '0')})`,
      '--dropdown-bg': `rgba(255,255,255,0.${String(cardOpacity).padStart(2, '0')})`,
      '--tooltip-bg': accent,
      '--page-title': textColor,
      '--page-subtitle': textSecondary,
      '--section-header': textColor,
      '--section-border': 'rgba(255,255,255,0.15)',
      '--shadow': '0 4px 20px rgba(0, 0, 0, 0.1)',
    };

    Object.entries(cssVars).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });

    document.body.classList.add('theme-builder-active');
    document.body.dataset.builderEffect = effect;

    setPreviewActive(true);
    setTimeout(() => setPreviewActive(false), 1500);
  };

  const resetTheme = () => {
    StorageService.remove('themeBuilderConfig');
    StorageService.remove('themeBuilderActive');
    setBgType('solid');
    setSolidColor('#0f172a');
    setGradientFrom('#1a73e8');
    setGradientTo('#00d2d3');
    setGradientAngle(135);
    setEffect('none');
    setAccent('#00d2d3');
    setCardRadius(12);
    setCardBlur(12);
    setCardOpacity(8);
    setFontFamily('system');
    setNeonGlow(false);
    setParticleDensity(3);
    setParticleSpeed(3);
    setEffectColor('#ffffff');
    setEffectIntensity(3);
    setVignette(0);
    setGrain(0);
    setBloom(0);
    setShadowDepth(10);
    setBorderWidth(1);
    setTextColor('#ffffff');
    setDoodleStyle('auto');
    StorageService.setString('doodleStyleOverride', 'auto');
    setDoodleWordmark('GamePilot');
    StorageService.setString('doodleWordmark', 'GamePilot');
    setSlotName('');
  };

  const applyPreset = (preset) => {
    setBgType('gradient');
    setGradientFrom(preset.from);
    setGradientTo(preset.to);
    setGradientAngle(preset.angle);
  };

  return (
    <div className="theme-builder-page">
      <NavBar />
      <div className="theme-builder-header">
        <button className="theme-builder-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
          Back
        </button>
        <h1><Palette size={24} /> Theme Builder</h1>
        <p className="theme-builder-subtitle">
          Craft your own look with custom colors, gradients, and effects.
        </p>
      </div>

      <div className="theme-builder-grid">
        {/* Left Panel — Controls */}
        <div className="theme-builder-panel">
          <section className="builder-section">
            <h3><Palette size={18} /> Background</h3>

            <div className="builder-row">
              <label className="builder-label">Type</label>
              <div className="builder-segmented">
                <button
                  className={bgType === 'solid' ? 'active' : ''}
                  onClick={() => setBgType('solid')}
                >
                  Solid
                </button>
                <button
                  className={bgType === 'gradient' ? 'active' : ''}
                  onClick={() => setBgType('gradient')}
                >
                  Gradient
                </button>
              </div>
            </div>

            {bgType === 'solid' && (
              <div className="builder-row">
                <label className="builder-label">Color</label>
                <div className="builder-color-wrap">
                  <input
                    type="color"
                    value={solidColor}
                    onChange={(e) => setSolidColor(e.target.value)}
                    className="builder-color-input"
                  />
                  <span className="builder-color-hex">{solidColor}</span>
                </div>
              </div>
            )}

            {bgType === 'gradient' && (
              <>
                <div className="builder-row">
                  <label className="builder-label">From</label>
                  <div className="builder-color-wrap">
                    <input
                      type="color"
                      value={gradientFrom}
                      onChange={(e) => setGradientFrom(e.target.value)}
                      className="builder-color-input"
                    />
                    <span className="builder-color-hex">{gradientFrom}</span>
                  </div>
                </div>
                <div className="builder-row">
                  <label className="builder-label">To</label>
                  <div className="builder-color-wrap">
                    <input
                      type="color"
                      value={gradientTo}
                      onChange={(e) => setGradientTo(e.target.value)}
                      className="builder-color-input"
                    />
                    <span className="builder-color-hex">{gradientTo}</span>
                  </div>
                </div>
                <div className="builder-row">
                  <label className="builder-label">Angle: {gradientAngle}deg</label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={gradientAngle}
                    onChange={(e) => setGradientAngle(parseInt(e.target.value))}
                    className="builder-slider"
                  />
                </div>

                <div className="builder-presets">
                  {PRESET_GRADIENTS.map((preset) => (
                    <button
                      key={preset.id}
                      className="builder-preset-swatch"
                      title={preset.name}
                      onClick={() => applyPreset(preset)}
                      style={{
                        background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`,
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="builder-section">
            <h3><Sparkles size={18} /> Effect</h3>
            <div className="builder-options">
              {EFFECTS.map((fx) => (
                <button
                  key={fx.id}
                  className={`builder-option ${effect === fx.id ? 'active' : ''}`}
                  onClick={() => setEffect(fx.id)}
                  title={fx.name}
                >
                  {fx.name}
                </button>
              ))}
            </div>
            {effect !== 'none' && (
              <>
                <div className="builder-row" style={{ marginTop: '12px' }}>
                  <label className="builder-label">Effect Color</label>
                  <div className="builder-color-wrap">
                    <input
                      type="color"
                      value={effectColor}
                      onChange={(e) => setEffectColor(e.target.value)}
                      className="builder-color-input"
                    />
                    <span className="builder-color-hex">{effectColor}</span>
                  </div>
                </div>
                <div className="builder-row">
                  <label className="builder-label">Intensity: {effectIntensity}</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={effectIntensity}
                    onChange={(e) => setEffectIntensity(parseInt(e.target.value))}
                    className="builder-slider"
                  />
                </div>
                <div className="builder-row">
                  <label className="builder-label">Speed: {particleSpeed}</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={particleSpeed}
                    onChange={(e) => setParticleSpeed(parseInt(e.target.value))}
                    className="builder-slider"
                  />
                </div>
              </>
            )}
          </section>

          <section className="builder-section">
            <h3><Sparkles size={18} /> Atmosphere</h3>
            <div className="builder-row">
              <label className="builder-label">Vignette: {vignette}%</label>
              <input
                type="range"
                min="0"
                max="35"
                value={vignette}
                onChange={(e) => setVignette(parseInt(e.target.value))}
                className="builder-slider"
              />
            </div>
            <div className="builder-row">
              <label className="builder-label">Grain: {grain}%</label>
              <input
                type="range"
                min="0"
                max="25"
                value={grain}
                onChange={(e) => setGrain(parseInt(e.target.value))}
                className="builder-slider"
              />
            </div>
            <div className="builder-row">
              <label className="builder-label">Bloom: {bloom}%</label>
              <input
                type="range"
                min="0"
                max="35"
                value={bloom}
                onChange={(e) => setBloom(parseInt(e.target.value))}
                className="builder-slider"
              />
            </div>
          </section>

          <section className="builder-section">
            <h3><Wand2 size={18} /> Accent</h3>
            <div className="builder-accent-grid">
              {ACCENT_PRESETS.map((c) => (
                <button
                  key={c}
                  className={`builder-accent-swatch ${accent === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setAccent(c)}
                  title={c}
                />
              ))}
            </div>
            <div className="builder-row" style={{ marginTop: '12px' }}>
              <div className="builder-color-wrap">
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="builder-color-input"
                />
                <span className="builder-color-hex">{accent}</span>
              </div>
            </div>
            <div className="builder-row" style={{ marginTop: '12px' }}>
              <label className="builder-label">Text Color</label>
              <div className="builder-color-wrap">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="builder-color-input"
                />
                <span className="builder-color-hex">{textColor}</span>
              </div>
            </div>
          </section>

          <section className="builder-section">
            <h3><Square size={18} /> Card Style</h3>
            <div className="builder-row">
              <label className="builder-label">Radius: {cardRadius}px</label>
              <input
                type="range"
                min="0"
                max="24"
                value={cardRadius}
                onChange={(e) => setCardRadius(parseInt(e.target.value))}
                className="builder-slider"
              />
            </div>
            <div className="builder-row">
              <label className="builder-label">Glass Blur: {cardBlur}px</label>
              <input
                type="range"
                min="0"
                max="20"
                value={cardBlur}
                onChange={(e) => setCardBlur(parseInt(e.target.value))}
                className="builder-slider"
              />
            </div>
            <div className="builder-row">
              <label className="builder-label">Card Opacity: {cardOpacity}%</label>
              <input
                type="range"
                min="2"
                max="20"
                value={cardOpacity}
                onChange={(e) => setCardOpacity(parseInt(e.target.value))}
                className="builder-slider"
              />
            </div>
            <div className="builder-row">
              <label className="builder-label">Border: {borderWidth}px</label>
              <input
                type="range"
                min="0"
                max="4"
                value={borderWidth}
                onChange={(e) => setBorderWidth(parseInt(e.target.value))}
                className="builder-slider"
              />
            </div>
            <div className="builder-row">
              <label className="builder-label">Shadow: {shadowDepth}</label>
              <input
                type="range"
                min="0"
                max="30"
                value={shadowDepth}
                onChange={(e) => setShadowDepth(parseInt(e.target.value))}
                className="builder-slider"
              />
            </div>
          </section>

          <section className="builder-section">
            <h3><Type size={18} /> Font</h3>
            <div className="builder-options">
              {[
                { id: 'system', name: 'System' },
                { id: 'monospace', name: 'Monospace' },
                { id: 'serif', name: 'Serif' },
              ].map((f) => (
                <button
                  key={f.id}
                  className={`builder-option ${fontFamily === f.id ? 'active' : ''}`}
                  onClick={() => setFontFamily(f.id)}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </section>

          <section className="builder-section">
            <h3><Zap size={18} /> Glow</h3>
            <div className="builder-row">
              <label className="builder-label">Neon Accent Glow</label>
              <div className="builder-toggle">
                <input
                  type="checkbox"
                  checked={neonGlow}
                  onChange={(e) => setNeonGlow(e.target.checked)}
                  id="neon-glow-toggle"
                />
                <label htmlFor="neon-glow-toggle" className="builder-toggle-slider" />
              </div>
            </div>
          </section>

          {effect === 'particles' && (
            <section className="builder-section">
              <h3><Sparkles size={18} /> Particle Config</h3>
              <div className="builder-row">
                <label className="builder-label">Density: {particleDensity}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={particleDensity}
                  onChange={(e) => setParticleDensity(parseInt(e.target.value))}
                  className="builder-slider"
                />
              </div>
              <div className="builder-row">
                <label className="builder-label">Speed: {particleSpeed}</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={particleSpeed}
                  onChange={(e) => setParticleSpeed(parseInt(e.target.value))}
                  className="builder-slider"
                />
              </div>
            </section>
          )}

          <section className="builder-section">
            <h3><FolderOpen size={18} /> Save Slots</h3>
            <div className="builder-row">
              <input
                type="text"
                placeholder="Slot name (e.g. Sunset Vibe)"
                value={slotName}
                onChange={(e) => setSlotName(e.target.value)}
                className="builder-input"
                style={{ flex: 1 }}
              />
              <button
                className="builder-option"
                onClick={() => {
                  if (!slotName.trim()) return;
                  const config = StorageService.get('themeBuilderConfig', {});
                  const slots = StorageService.get('themeBuilderSlots', {});
                  slots[slotName.trim()] = { ...config, savedAt: Date.now() };
                  StorageService.set('themeBuilderSlots', slots);
                  setSlotName('');
                }}
              >
                Save
              </button>
            </div>
            <div className="builder-slot-list">
              {Object.entries(StorageService.get('themeBuilderSlots', {})).map(([name, data]) => (
                <div key={name} className="builder-slot-chip">
                  <span className="builder-slot-name">{name}</span>
                  <div className="builder-slot-actions">
                    <button
                      className="builder-slot-btn"
                      onClick={() => {
                        StorageService.set('themeBuilderConfig', data);
                        window.location.reload();
                      }}
                    >
                      Load
                    </button>
                    <button
                      className="builder-slot-btn builder-slot-delete"
                      onClick={() => {
                        const slots = StorageService.get('themeBuilderSlots', {});
                        delete slots[name];
                        StorageService.set('themeBuilderSlots', slots);
                        window.location.reload();
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="builder-section">
            <h3><Layers size={18} /> Doodle Style</h3>
            <p className="builder-locked-text" style={{ marginBottom: 10 }}>
              Controls how text and colours render inside the daily doodle card on the home screen.
            </p>
            <div className="builder-options">
              {[
                { id: 'auto', name: 'Auto (theme-matched)' },
                { id: 'dark', name: 'Always Dark' },
                { id: 'light', name: 'Always Light' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  className={`builder-option ${doodleStyle === opt.id ? 'active' : ''}`}
                  onClick={() => applyDoodleStyle(opt.id)}
                >
                  {opt.name}
                </button>
              ))}
            </div>
            <div className="builder-row" style={{ marginTop: 12 }}>
              <label className="builder-label">Doodle Wordmark</label>
              <input
                type="text"
                value={doodleWordmark}
                onChange={(e) => {
                  const v = e.target.value.slice(0, 20);
                  setDoodleWordmark(v);
                  StorageService.setString('doodleWordmark', v);
                  window.dispatchEvent(new CustomEvent('gamepilot:doodle-wordmark-updated'));
                }}
                maxLength={20}
                placeholder="GamePilot"
                className="builder-input"
                style={{ flex: 1 }}
              />
            </div>
          </section>

          <div className="builder-actions">
            <button
              className={`action-button primary ${previewActive ? 'applied' : ''}`}
              onClick={applyTheme}
            >
              <Save size={16} />
              {previewActive ? 'Applied!' : 'Apply Theme'}
            </button>
            <button className="action-button" onClick={resetTheme}>
              <Trash2 size={16} />
              Reset
            </button>
          </div>
        </div>

        {/* Right Panel — Preview */}
        <div className="theme-builder-preview">
          <div className="preview-label">Live Preview</div>
          <div
            className={`preview-canvas preview-effect-${effect}`}
            style={getPreviewStyle()}
            data-density={particleDensity}
            data-speed={particleSpeed}
            data-intensity={effectIntensity}
            data-vignette={vignette > 0 ? 'on' : 'off'}
            data-grain={grain > 0 ? 'on' : 'off'}
            data-bloom={bloom > 0 ? 'on' : 'off'}
          >
            {/* Mini doodle preview */}
            <div className={`builder-doodle-preview${doodleStyle === 'light' ? ' builder-doodle-preview--light' : ''}`}>
              <div className="builder-doodle-wordmark">
                {(doodleWordmark || 'GamePilot').split('').map((ch, i) => (
                  <span key={i} className="builder-doodle-letter" style={{ color: [accent, textColor, accent][i % 3] }}>{ch}</span>
                ))}
              </div>
              <div className="builder-doodle-meta" style={{ color: doodleStyle === 'light' ? 'rgba(20,10,5,0.85)' : textColor }}>
                <span>Neon Runway — Today</span>
                <span style={{ color: accent }}>Welcome to {doodleWordmark || 'GamePilot'}</span>
              </div>
            </div>
            <div
              className="preview-card"
              style={{
                borderRadius: `${cardRadius}px`,
                backdropFilter: `blur(${cardBlur}px)`,
                WebkitBackdropFilter: `blur(${cardBlur}px)`,
                background: `rgba(255,255,255,0.${String(cardOpacity).padStart(2, '0')})`,
                fontFamily: fontFamily === 'monospace' ? "'Fira Code', monospace" : fontFamily === 'serif' ? "'Merriweather', serif" : "inherit",
                boxShadow: neonGlow ? `0 0 ${Math.max(12, shadowDepth * 2)}px ${accent}66, 0 0 4px ${accent}44` : `0 ${Math.max(4, shadowDepth / 2)}px ${Math.max(12, shadowDepth * 2)}px rgba(0, 0, 0, 0.2)`,
                border: neonGlow ? `${borderWidth}px solid ${accent}44` : `${borderWidth}px solid rgba(255,255,255,0.15)`,
              }}
            >
              <h4 style={{ color: textColor }}>Sample Card</h4>
              <p style={{ color: `rgba(${hexToRgb(textColor).r}, ${hexToRgb(textColor).g}, ${hexToRgb(textColor).b}, 0.8)` }}>This is how your theme will look across GamePilot.</p>
              <button
                className="preview-button"
                style={{
                  background: accent,
                  boxShadow: neonGlow ? `0 0 8px ${accent}88` : 'none',
                }}
              >
                Sample Button
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
