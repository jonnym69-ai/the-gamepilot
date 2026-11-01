import React from 'react';
import { EyeOff, RotateCcw, BookOpen, Scale, Sparkles, Check, Pipette } from 'lucide-react';
import InterfacePreferencesService from '../services/InterfacePreferencesService';
import useInterfacePreferences from '../hooks/useInterfacePreferences';

const HOME_TOGGLES = [
  {
    key: 'showHomeShelves',
    label: 'Curated shelves',
    hint: 'Tonight\u2019s pick / rediscover, and favourite cards on Home.',
  },
];

const DENSITY_TOGGLES = [
  { key: 'compactMode', label: 'Compact mode', hint: 'Tighter spacing, smaller headers across the whole app.' },
  { key: 'reducedMotion', label: 'Reduced motion', hint: 'Disables theme animations, shimmers, and easing.' },
  {
    key: 'showThemedPageTitles',
    label: 'Themed page titles',
    hint: 'Playful per-theme page headings (e.g. \u201cChill Library\u201d).',
  },
  {
    key: 'showQuickLaunchHotbar',
    label: 'Quick-launch hotbar',
    hint: 'Floating bar at the bottom for your most-played and pinned games.',
  },
];

const ORNAMENT_LEVELS = [
  { value: 'plain', label: 'Plain', hint: 'Clean, system-font, no decorative effects. Most professional.' },
  { value: 'balanced', label: 'Balanced', hint: 'Theme colors and gradients, no animations or decorative fonts.' },
  { value: 'full', label: 'Full', hint: 'Everything on \u2014 shimmer, sweeps, themed fonts, gradients.' },
];

const ACCENT_PRESETS = [
  { label: 'Follow theme', value: null },
  { label: 'Orange', value: '#ff6b35' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Sky', value: '#38bdf8' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Crimson', value: '#dc2626' },
  { label: 'Lime', value: '#84cc16' },
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Fuchsia', value: '#d946ef' },
  { label: 'Gold', value: '#eab308' },
];

const FOLLOW_THEME_SWATCH = 'conic-gradient(#ff6b35,#10b981,#8b5cf6,#38bdf8,#ff6b35)';

const accentSwatchColumn = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
  width: 56,
  background: 'none',
  border: 'none',
  padding: 0,
  color: 'var(--text-primary)',
  fontSize: 11,
  cursor: 'pointer',
};

const accentSwatchCircle = (active) => ({
  display: 'grid',
  placeItems: 'center',
  width: 28,
  height: 28,
  borderRadius: '50%',
  border: active ? '2px solid var(--accent-primary, #ff6b35)' : '1px solid var(--border-primary)',
  boxShadow: active ? '0 0 0 2px var(--user-accent-soft, rgba(255, 107, 53, 0.18))' : 'none',
});

const ToggleRow = ({ pref, prefKey, label, hint, onChange }) => (
  <div className="setting-item" style={{ alignItems: 'flex-start' }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <label>{label}</label>
      <p className="setting-description" style={{ margin: '4px 0 0', opacity: 0.72, fontSize: '12px' }}>
        {hint}
      </p>
    </div>
    <div className="toggle-switch">
      <input
        id={`iface-${prefKey}`}
        type="checkbox"
        checked={!!pref[prefKey]}
        onChange={(e) => onChange(prefKey, e.target.checked)}
      />
      <label htmlFor={`iface-${prefKey}`} className="toggle-slider" />
    </div>
  </div>
);

export default function InterfaceSettings() {
  const prefs = useInterfacePreferences();

  const handleChange = (key, value) => InterfacePreferencesService.set(key, value);
  const handleAccent = (value) => InterfacePreferencesService.set('accentOverride', value);
  const handleCustomAccent = (value) => InterfacePreferencesService.setCustomAccent(value);
  const handleReset = () => InterfacePreferencesService.resetAll();
  const experienceMode = InterfacePreferencesService.getExperienceMode();

  const recentAccents = (prefs.recentAccents || []).filter((hex) => !ACCENT_PRESETS.some((p) => p.value === hex));
  const customAccentActive = !!prefs.accentOverride && !ACCENT_PRESETS.some((p) => p.value === prefs.accentOverride);
  const activeCheck = (
    <Check size={14} strokeWidth={3} color="#fff" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }} />
  );

  const EXPERIENCE_PRESETS = [
    {
      id: 'librarian',
      label: 'Librarian',
      Icon: BookOpen,
      hint: 'Pure tool mode. Clean layout, plain fonts, no decorative extras.',
      apply: () => InterfacePreferencesService.applyLibrarianPreset(),
    },
    {
      id: 'balanced',
      label: 'Balanced',
      Icon: Scale,
      hint: 'Tool-first with light theming. Recommendations and shelves visible.',
      apply: () => InterfacePreferencesService.applyBalancedPreset(),
    },
    {
      id: 'full',
      label: 'Full experience',
      Icon: Sparkles,
      hint: 'Everything on: themed titles, decorative flourishes, all shelves.',
      apply: () => InterfacePreferencesService.applyFullPreset(),
    },
  ];

  return (
    <div className="settings-section">
      <div className="interface-group" style={{ marginBottom: '14px' }}>
        <h4 style={{ margin: '0 0 6px' }}>Experience mode</h4>
        <p className="setting-description" style={{ margin: '0 0 10px', opacity: 0.72, fontSize: '12px' }}>
          Quick presets to reshape GamePilot for how you want to use it. You can fine-tune anything below afterwards.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {EXPERIENCE_PRESETS.map((preset) => {
            const active = experienceMode === preset.id;
            const Icon = preset.Icon;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={preset.apply}
                title={preset.hint}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 14px',
                  borderRadius: 10,
                  border: active ? '2px solid var(--accent-primary, #ff6b35)' : '1px solid var(--border-primary)',
                  background: active ? 'rgba(255, 107, 53, 0.12)' : 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: active ? 600 : 400,
                }}
              >
                <Icon size={15} />
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="interface-presets"
        style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}
      >
        <button
          type="button"
          className="data-button reset"
          onClick={handleReset}
          title="Reset all interface preferences to defaults"
        >
          <RotateCcw size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Reset interface
        </button>
      </div>

      <div className="interface-group" style={{ marginTop: '14px' }}>
        <h4 style={{ margin: '8px 0 6px' }}>
          <EyeOff size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Home sections
        </h4>
        {HOME_TOGGLES.map((t) => (
          <ToggleRow key={t.key} pref={prefs} prefKey={t.key} label={t.label} hint={t.hint} onChange={handleChange} />
        ))}
      </div>

      <div className="interface-group" style={{ marginTop: '14px' }}>
        <h4 style={{ margin: '8px 0 6px' }}>Density & motion</h4>
        {DENSITY_TOGGLES.map((t) => (
          <ToggleRow key={t.key} pref={prefs} prefKey={t.key} label={t.label} hint={t.hint} onChange={handleChange} />
        ))}
      </div>

      <div className="interface-group" style={{ marginTop: '14px' }}>
        <h4 style={{ margin: '8px 0 6px' }}>Theme ornamentation</h4>
        <p className="setting-description" style={{ margin: '0 0 8px', opacity: 0.72, fontSize: '12px' }}>
          Strip back decorative effects without changing your theme.
        </p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {ORNAMENT_LEVELS.map((level) => {
            const active = prefs.ornamentLevel === level.value;
            return (
              <button
                key={level.value}
                type="button"
                onClick={() => handleChange('ornamentLevel', level.value)}
                title={level.hint}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: active ? '2px solid var(--accent-primary, #ff6b35)' : '1px solid var(--border-primary)',
                  background: active ? 'rgba(255, 107, 53, 0.12)' : 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {level.label}
              </button>
            );
          })}
        </div>
        <p className="setting-description" style={{ margin: '8px 0 0', opacity: 0.55, fontSize: '11px' }}>
          {ORNAMENT_LEVELS.find((l) => l.value === prefs.ornamentLevel)?.hint || ''}
        </p>
      </div>

      <div className="interface-group" style={{ marginTop: '14px' }}>
        <h4 style={{ margin: '8px 0 6px' }}>Accent color</h4>
        <p className="setting-description" style={{ margin: '0 0 8px', opacity: 0.72, fontSize: '12px' }}>
          Override the accent color for buttons and links. Does not change your theme.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {ACCENT_PRESETS.map((preset) => {
            const active = prefs.accentOverride === preset.value;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleAccent(preset.value)}
                className={`accent-swatch ${active ? 'active' : ''}`}
                style={accentSwatchColumn}
                title={preset.label}
                aria-pressed={active}
              >
                <span
                  aria-hidden
                  style={{
                    ...accentSwatchCircle(active),
                    background: preset.value || FOLLOW_THEME_SWATCH,
                  }}
                >
                  {active && activeCheck}
                </span>
                {preset.label}
              </button>
            );
          })}
          <label
            className="accent-swatch accent-swatch-custom"
            style={accentSwatchColumn}
            title="Pick a custom accent color"
          >
            <span
              aria-hidden
              style={{
                ...accentSwatchCircle(customAccentActive),
                background: prefs.accentOverride || 'var(--bg-secondary)',
              }}
            >
              {customAccentActive ? activeCheck : <Pipette size={13} />}
            </span>
            Custom
            <input
              type="color"
              aria-label="Custom accent color"
              value={prefs.accentOverride || '#ff6b35'}
              onChange={(e) => handleCustomAccent(e.target.value)}
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                opacity: 0,
                pointerEvents: 'none',
              }}
            />
          </label>
        </div>
        {recentAccents.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px' }}>
            <span style={{ fontSize: 11, opacity: 0.55 }}>Recent:</span>
            {recentAccents.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => handleCustomAccent(hex)}
                title={hex}
                aria-label={`Recent accent ${hex}`}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: hex,
                  border:
                    prefs.accentOverride === hex
                      ? '2px solid var(--accent-primary, #ff6b35)'
                      : '1px solid var(--border-primary)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginTop: '12px',
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid var(--border-primary)',
            background: 'var(--bg-secondary)',
            width: 'fit-content',
          }}
        >
          <button
            type="button"
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--accent-primary, #ff6b35)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'default',
            }}
          >
            Sample button
          </button>
          <span className="toggle-switch" aria-hidden="true">
            <input type="checkbox" checked readOnly disabled tabIndex={-1} />
            <span className="toggle-slider" />
          </span>
          <a
            href="#accent-preview"
            onClick={(e) => e.preventDefault()}
            style={{ color: 'var(--link-primary, #ff6b35)', fontSize: 12 }}
          >
            Sample link
          </a>
        </div>
      </div>
    </div>
  );
}
