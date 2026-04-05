import React, { useMemo } from 'react';
import NavBar from './NavBar';
import { useTheme } from './ThemeContext';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';
import moodThemes from './themes/moodThemes.json';
import './Home.css';

const pageStyle = {
  minHeight: '100vh',
  padding: '24px',
  color: 'var(--text)'
};

const heroStyle = {
  maxWidth: '1200px',
  margin: '0 auto 24px',
  background: 'var(--card-bg)',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: 'var(--shadow)'
};

const sectionStyle = {
  maxWidth: '1200px',
  margin: '0 auto 24px',
  background: 'var(--card-bg)',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: 'var(--shadow)'
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px'
};

const cardStyle = {
  border: '1px solid var(--border-color)',
  borderRadius: '14px',
  padding: '16px',
  background: 'var(--bg-secondary)'
};

const previewStyle = (preview) => ({
  height: '84px',
  borderRadius: '12px',
  marginBottom: '12px',
  background: preview || 'linear-gradient(135deg, rgba(255, 107, 53, 0.24), rgba(34, 40, 104, 0.2))',
  border: '1px solid rgba(255,255,255,0.08)'
});

function Themes() {
  const {
    currentTheme,
    setTheme,
    availableThemes,
    isThemeUnlocked
  } = useTheme();

  const rewardSummary = useMemo(() => ProgressionUnlockService.getRewardCatalogSummary(), []);
  const themeTierProgression = useMemo(() => ProgressionUnlockService.getThemeTierProgression(), []);
  const premiumThemes = useMemo(() => ProgressionUnlockService.getPremiumThemes(), []);

  const themeCards = useMemo(() => {
    const basicThemes = Object.values(availableThemes || {}).map((themeMeta) => ({
      id: themeMeta.id,
      name: themeMeta.name,
      description: themeMeta.id === 'light' || themeMeta.id === 'dark'
        ? 'Core theme available immediately.'
        : 'Available from your unlocked theme collection.',
      preview: moodThemes.find((entry) => entry.id === themeMeta.id)?.palette?.card
        ? `linear-gradient(135deg, ${moodThemes.find((entry) => entry.id === themeMeta.id).palette.primary}, ${moodThemes.find((entry) => entry.id === themeMeta.id).palette.accent})`
        : null,
      unlocked: true,
      requiredXP: 0,
      isPremium: false
    }));

    const premiumCards = premiumThemes.map((themeMeta) => ({
      id: themeMeta.id,
      name: themeMeta.name,
      description: themeMeta.description || 'Progression-unlocked premium theme.',
      preview: themeMeta.preview || `linear-gradient(135deg, ${themeMeta.palette?.primary || '#ff6b35'}, ${themeMeta.palette?.accent || '#f093fb'})`,
      unlocked: Boolean(themeMeta.unlocked || isThemeUnlocked(themeMeta.id)),
      requiredXP: themeMeta.requiredXP || 0,
      isPremium: true
    }));

    const seen = new Set();
    return [...basicThemes, ...premiumCards].filter((themeMeta) => {
      if (seen.has(themeMeta.id)) {
        return false;
      }
      seen.add(themeMeta.id);
      return true;
    });
  }, [availableThemes, premiumThemes, isThemeUnlocked]);

  return (
    <div className="home-page" style={pageStyle}>
      <NavBar />

      <section style={heroStyle}>
        <p style={{ opacity: 0.7, marginBottom: '8px' }}>Appearance</p>
        <h1 style={{ margin: 0, marginBottom: '8px' }}>Themes</h1>
        <p style={{ margin: 0, opacity: 0.82 }}>
          Browse your current themes, see what is still locked, and swap the app look without digging through Settings.
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
          <span className="confidence-badge">Current: {currentTheme}</span>
          <span className="match-score">Unlocked Themes: {rewardSummary?.unlockedCounts?.premiumThemes ?? 0}/{rewardSummary?.totalCounts?.premiumThemes ?? 0}</span>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Theme Gallery</h2>
        <div style={gridStyle}>
          {themeCards.map((themeMeta) => {
            const isCurrent = currentTheme === themeMeta.id;
            return (
              <div key={themeMeta.id} style={cardStyle}>
                <div style={previewStyle(themeMeta.preview)} />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0' }}>{themeMeta.name}</h3>
                    <p style={{ margin: 0, opacity: 0.75, fontSize: '0.92rem' }}>{themeMeta.description}</p>
                  </div>
                  {themeMeta.isPremium && <span className="confidence-badge">Premium</span>}
                </div>
                <p style={{ marginTop: '12px', marginBottom: '12px', fontSize: '0.85rem', opacity: 0.8 }}>
                  {themeMeta.unlocked ? 'Unlocked' : `Unlocks at ${themeMeta.requiredXP} XP`}
                </p>
                <button
                  className="action-button primary"
                  style={{ width: '100%', opacity: themeMeta.unlocked ? 1 : 0.6 }}
                  disabled={!themeMeta.unlocked || isCurrent}
                  onClick={() => setTheme(themeMeta.id)}
                >
                  {isCurrent ? 'Currently Active' : themeMeta.unlocked ? 'Apply Theme' : 'Locked'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Theme Progression</h2>
        <div style={gridStyle}>
          {themeTierProgression.map((tier) => (
            <div key={tier.id} style={cardStyle}>
              <h3 style={{ marginTop: 0, textTransform: 'capitalize' }}>{tier.tier} Tier</h3>
              <p style={{ opacity: 0.8 }}>{tier.description || 'Unlocks more premium visual styles.'}</p>
              <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                {tier.unlocked ? 'Unlocked' : `Requires ${tier.requiredXP} XP`}
              </p>
              <div className="weekly-quest-progress-bar">
                <span style={{ width: `${tier.progressPercent || 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Themes;
