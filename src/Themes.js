import React, { useMemo, useState, useEffect } from 'react';
import NavBar from './NavBar';
import { useTheme } from './ThemeContext';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';
import { SeasonalRewardService } from './services/SeasonalRewardService';
import StorageService from './services/StorageService';
import EntitlementService from './services/EntitlementService';
import moodThemes from './themes/moodThemes.json';
import './Home.css';

const SEASONAL_THEMES = {
  spring: 'spring-bloom',
  summer: 'summer-heat',
  autumn: 'autumn-harvest',
  winter: 'winter-frost'
};

const getCurrentSeason = () => {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
};

const SEASON_LABELS = {
  spring: 'Spring Bloom',
  summer: 'Summer Heat',
  autumn: 'Autumn Harvest',
  winter: 'Winter Frost'
};

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
    hasPatreonAccess
  } = useTheme();

  const hasPremiumAccess = React.useCallback(() => hasPatreonAccess() || EntitlementService.hasEntitlement('premium_theme_pack') || EntitlementService.hasEntitlement('gamepilot_pro'), [hasPatreonAccess]);

  const [autoSeasonal, setAutoSeasonal] = useState(() => {
    return StorageService.getString('autoSeasonalTheme') !== 'false';
  });

  const currentSeason = useMemo(() => getCurrentSeason(), []);
  const seasonalThemeId = SEASONAL_THEMES[currentSeason];

  useEffect(() => {
    StorageService.setString('autoSeasonalTheme', autoSeasonal);
  }, [autoSeasonal]);

  const handleToggleAutoSeasonal = () => {
    if (!autoSeasonal) {
      setTheme(seasonalThemeId);
    }
    setAutoSeasonal(!autoSeasonal);
  };

  const rewardSummary = useMemo(() => ProgressionUnlockService.getRewardCatalogSummary(), []);
  const themeTierProgression = useMemo(() => ProgressionUnlockService.getThemeTierProgression(), []);
  const unlockableThemes = useMemo(() => ProgressionUnlockService.getUnlockableThemes(), []);
  const seasonalChallenges = useMemo(() => SeasonalRewardService.getActiveChallenges(), []);
  const currentChallenge = seasonalChallenges.find(c => c.isActive);

  const themeCards = useMemo(() => {
    const coreThemes = Object.values(availableThemes || {})
      .filter((themeMeta) => themeMeta.id === 'light' || themeMeta.id === 'dark')
      .map((themeMeta) => ({
      id: themeMeta.id,
      name: themeMeta.name,
      description: 'Core theme available immediately.',
      preview: moodThemes.find((entry) => entry.id === themeMeta.id)?.palette?.card
        ? `linear-gradient(135deg, ${moodThemes.find((entry) => entry.id === themeMeta.id).palette.primary}, ${moodThemes.find((entry) => entry.id === themeMeta.id).palette.accent})`
        : null,
      unlocked: true,
      requiredXP: 0,
      isCore: true
    }));

    const unlockableThemeCards = unlockableThemes.map((themeMeta) => ({
      id: themeMeta.id,
      name: themeMeta.name,
      description: themeMeta.description || 'XP-gated theme unlock.',
      preview: themeMeta.preview || `linear-gradient(135deg, ${themeMeta.palette?.primary || '#ff6b35'}, ${themeMeta.palette?.accent || '#f093fb'})`,
      unlocked: Boolean(themeMeta.unlocked),
      requiredXP: themeMeta.requiredXP || 0,
      isCore: false
    }));

    const patreonThemeCards = moodThemes
      .filter((themeMeta) => themeMeta.patreonExclusive === true)
      .map((themeMeta) => ({
        id: themeMeta.id,
        name: themeMeta.name,
        description: themeMeta.description || 'Patreon-exclusive supporter theme.',
        preview: themeMeta.palette?.background || `linear-gradient(135deg, ${themeMeta.palette?.primary || '#ff6b35'}, ${themeMeta.palette?.accent || '#f093fb'})`,
        unlocked: hasPremiumAccess(),
        requiredXP: 0,
        isCore: false,
        patreonExclusive: true
      }));

    const seen = new Set();
    return [...coreThemes, ...unlockableThemeCards, ...patreonThemeCards].filter((themeMeta) => {
      if (seen.has(themeMeta.id)) {
        return false;
      }
      seen.add(themeMeta.id);
      return true;
    });
  }, [availableThemes, unlockableThemes, hasPremiumAccess]);

  return (
    <div className="themes-page" style={pageStyle}>
      <NavBar />

      <section style={heroStyle}>
        <p style={{ opacity: 0.7, marginBottom: '8px' }}>Appearance</p>
        <h1 style={{ margin: 0, marginBottom: '8px' }}>Themes</h1>
        <p style={{ margin: 0, opacity: 0.82 }}>
          Browse your current themes, see what is still locked, and swap the app look without digging through Settings.
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
          <span className="confidence-badge">Current: {currentTheme}</span>
          <span className="match-score">Unlocked Themes: {rewardSummary?.unlockedCounts?.themes ?? 0}/{rewardSummary?.totalCounts?.themes ?? 0}</span>
        </div>

        {/* Seasonal Theme Toggle */}
        <div style={{ 
          marginTop: '20px', 
          padding: '16px', 
          background: 'var(--bg-secondary)', 
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>Seasonal Themes</h3>
            <p style={{ margin: 0, opacity: 0.7, fontSize: '13px' }}>
              Auto-switch to {SEASON_LABELS[currentSeason]} based on the current month
            </p>
          </div>
          <button
            onClick={handleToggleAutoSeasonal}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: autoSeasonal ? 'var(--button-primary-bg)' : 'var(--border)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            {autoSeasonal ? 'Auto: On' : 'Auto: Off'}
          </button>
        </div>

        {/* Seasonal Challenge Progress */}
        {currentChallenge && !currentChallenge.unlocked && (
          <div style={{ 
            marginTop: '16px', 
            padding: '16px', 
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2))', 
            borderRadius: '12px',
            border: '1px solid rgba(139, 92, 246, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', color: '#a78bfa' }}>Limited Time: {currentChallenge.name}</h3>
              <span style={{ fontSize: '12px', opacity: 0.7 }}>{currentChallenge.plays}/{currentChallenge.requirement.count} games</span>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', opacity: 0.8 }}>{currentChallenge.description}</p>
            <div className="weekly-quest-progress-bar" style={{ height: '8px' }}>
              <span style={{ width: `${currentChallenge.progressPercent}%`, background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)' }} />
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: '11px', opacity: 0.6 }}>
              Play {currentChallenge.requirement.count - currentChallenge.plays} more to unlock the theme!
            </p>
          </div>
        )}

        {/* Unlocked Seasonal Reward */}
        {currentChallenge?.unlocked && (
          <div style={{ 
            marginTop: '16px', 
            padding: '16px', 
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(59, 130, 246, 0.2))', 
            borderRadius: '12px',
            border: '1px solid rgba(34, 197, 94, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>🎉 unlocked!</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#4ade80' }}>{currentChallenge.name} Theme Unlocked!</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.8 }}>You can now use this theme anytime.</p>
              </div>
            </div>
          </div>
        )}
      </section>

      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Theme Gallery</h2>
        <div style={gridStyle}>
          {themeCards.map((themeMeta) => {
            const isCurrent = currentTheme === themeMeta.id;
            const isLocked = !themeMeta.unlocked;
            return (
              <div key={themeMeta.id} style={cardStyle} className={`theme-gallery-card ${isCurrent ? 'active' : ''} ${isLocked ? 'locked' : ''}`}>
                <div style={previewStyle(themeMeta.preview)} className="theme-gallery-preview" />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 6px 0' }}>{themeMeta.name}</h3>
                    <p style={{ margin: 0, opacity: 0.75, fontSize: '0.92rem' }}>{themeMeta.description}</p>
                  </div>
                  <div className="theme-gallery-badges">
                    {themeMeta.isCore && <span className="confidence-badge theme-gallery-badge">Core</span>}
                    {themeMeta.patreonExclusive && <span className="confidence-badge theme-gallery-badge supporter">Patreon</span>}
                    {isCurrent && <span className="confidence-badge theme-gallery-badge active">Active</span>}
                  </div>
                </div>
                <p className={`theme-gallery-status ${themeMeta.unlocked ? 'unlocked' : 'locked'}`}>
                  {themeMeta.unlocked ? 'Unlocked' : themeMeta.patreonExclusive ? 'Patreon Exclusive' : `Unlocks at ${themeMeta.requiredXP} XP`}
                </p>
                <button
                  className={`action-button primary theme-gallery-action ${isLocked ? 'locked' : ''}`}
                  disabled={isLocked || isCurrent}
                  onClick={() => setTheme(themeMeta.id)}
                >
                  {isCurrent ? 'Currently Active' : themeMeta.unlocked ? 'Apply Theme' : themeMeta.patreonExclusive ? 'Supporter Only' : 'Locked'}
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
              <p style={{ opacity: 0.8 }}>{tier.description || 'Unlocks more XP-gated themes.'}</p>
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
