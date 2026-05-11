import React from 'react';
import { Eye, EyeOff, Focus, RotateCcw, BookOpen, Scale, Sparkles } from 'lucide-react';
import InterfacePreferencesService from '../services/InterfacePreferencesService';
import useInterfacePreferences from '../hooks/useInterfacePreferences';

const NAV_TOGGLES = [
  { key: 'showDailyButton', label: 'Show Daily button', hint: 'Hides the Daily spin button in the navbar.' },
  { key: 'showStreakBadge', label: 'Show streak count', hint: 'Hides the small streak number on the Daily button.' }
];

const HOME_TOGGLES = [
  { key: 'showHomeHeroSummary', label: 'Library summary line', hint: 'Shows "X games tracked across Y platforms" in the hero.' },
  { key: 'showHomeRewardStrip', label: 'Hero reward strip', hint: 'Home Layout / Recommendation Pack pills at the top.' },
  { key: 'showHomeCheckinPill', label: 'Check-in pill', hint: 'Daily check-in shortcut inside the hero.' },
  { key: 'showHomeRetentionQuests', label: 'Weekly challenge & GamePilot Picks', hint: 'Curated recommendations and your weekly focused challenge card.' },
  { key: 'showHomeDailyMissions', label: 'Daily missions card', hint: 'Engagement pulse daily mission card.' },
  { key: 'showHomeBacklogRescue', label: 'Backlog rescue card', hint: 'Recommendation of a backlog game to finish.' },
  { key: 'showHomeShelves', label: 'Curated shelves', hint: 'Tonight\u2019s pick / Continue / Rediscover / Favourite cards.' },
  { key: 'showHomeLauncherSummary', label: 'Launcher summary grid', hint: 'Platform badges and scan status row.' }
];

const DENSITY_TOGGLES = [
  { key: 'compactMode', label: 'Compact mode', hint: 'Tighter spacing, smaller headers across the whole app.' },
  { key: 'reducedMotion', label: 'Reduced motion', hint: 'Disables theme animations, shimmers, and easing.' },
  { key: 'showThemedPageTitles', label: 'Themed page titles', hint: 'Playful per-theme page headings (e.g. \u201cChill Library\u201d).' },
  { key: 'showQuickLaunchHotbar', label: 'Quick-launch hotbar', hint: 'Floating bar at the bottom for your most-played and pinned games.' }
];

const ORNAMENT_LEVELS = [
  { value: 'plain', label: 'Plain', hint: 'Clean, system-font, no decorative effects. Most professional.' },
  { value: 'balanced', label: 'Balanced', hint: 'Theme colors and gradients, no animations or decorative fonts.' },
  { value: 'full', label: 'Full', hint: 'Everything on \u2014 shimmer, sweeps, themed fonts, gradients.' }
];

const ACCENT_PRESETS = [
  { label: 'Follow theme', value: null },
  { label: 'Orange', value: '#ff6b35' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Sky', value: '#38bdf8' },
  { label: 'Rose', value: '#f43f5e' },
  { label: 'Amber', value: '#f59e0b' }
];

const ToggleRow = ({ pref, prefKey, label, hint, onChange }) => (
  <div className="setting-item" style={{ alignItems: 'flex-start' }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <label>{label}</label>
      <p className="setting-description" style={{ margin: '4px 0 0', opacity: 0.72, fontSize: '12px' }}>{hint}</p>
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
  const handleFocusHome = () => InterfacePreferencesService.applyFocusHomePreset();
  const handleReset = () => InterfacePreferencesService.resetAll();
  const experienceMode = InterfacePreferencesService.getExperienceMode();

  const EXPERIENCE_PRESETS = [
    { id: 'librarian', label: 'Librarian', Icon: BookOpen, hint: 'Pure tool mode. No streaks, no daily, no quests. Compact, plain fonts.', apply: () => InterfacePreferencesService.applyLibrarianPreset() },
    { id: 'balanced', label: 'Balanced', Icon: Scale, hint: 'Tool-first with light gamification. Streak visible, weekly challenges hidden.', apply: () => InterfacePreferencesService.applyBalancedPreset() },
    { id: 'full', label: 'Full experience', Icon: Sparkles, hint: 'Everything on: quests, streak, themed titles, flourishes.', apply: () => InterfacePreferencesService.applyFullPreset() }
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
                  fontWeight: active ? 600 : 400
                }}
              >
                <Icon size={15} />
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="interface-presets" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
        <button type="button" className="save-btn" onClick={handleFocusHome} title="Minimal Home with just recommendations and continue-playing">
          <Focus size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Focus Home preset
        </button>
        <button type="button" className="data-button reset" onClick={handleReset} title="Reset all interface preferences to defaults">
          <RotateCcw size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Reset interface
        </button>
      </div>

      <div className="interface-group">
        <h4 style={{ margin: '8px 0 6px' }}><Eye size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Navbar</h4>
        {NAV_TOGGLES.map((t) => (
          <ToggleRow key={t.key} pref={prefs} prefKey={t.key} label={t.label} hint={t.hint} onChange={handleChange} />
        ))}
      </div>

      <div className="interface-group" style={{ marginTop: '14px' }}>
        <h4 style={{ margin: '8px 0 6px' }}><EyeOff size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />Home sections</h4>
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
                  cursor: 'pointer'
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: active ? '2px solid var(--accent-primary, #ff6b35)' : '1px solid var(--border-primary)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: 12
                }}
                title={preset.label}
              >
                <span
                  aria-hidden
                  style={{
                    display: 'inline-block',
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: preset.value || 'conic-gradient(#ff6b35,#10b981,#8b5cf6,#38bdf8,#ff6b35)',
                    border: '1px solid rgba(255,255,255,0.25)'
                  }}
                />
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
