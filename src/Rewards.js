import React, { useMemo } from 'react';
import NavBar from './NavBar';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';
import './Home.css';

const pageStyle = {
  minHeight: '100vh',
  padding: '24px',
  color: 'var(--text)'
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
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '16px'
};

const cardStyle = {
  border: '1px solid var(--border-color)',
  borderRadius: '14px',
  padding: '16px',
  background: 'var(--bg-secondary)'
};

const getRewardCount = (items = []) => Array.isArray(items) ? items.filter((item) => item?.unlocked).length : 0;

function Rewards() {
  const summary = useMemo(() => ProgressionUnlockService.getRewardCatalogSummary(), []);
  const catalog = useMemo(() => ProgressionUnlockService.getProfileRewardCatalog(), []);

  const sections = useMemo(() => ([
    {
      id: 'themes',
      title: 'Themes',
      description: 'Premium visual themes unlocked through progression.',
      items: catalog.premiumThemes || []
    },
    {
      id: 'profile',
      title: 'Profile Cosmetics',
      description: 'Frames, banners, and titles for your profile identity.',
      items: [...(catalog.frames || []), ...(catalog.banners || []), ...(catalog.titles || [])]
    },
    {
      id: 'presentation',
      title: 'Presentation Rewards',
      description: 'Library variants, home layouts, and recommendation packs.',
      items: [...(catalog.libraryVariants || []), ...(catalog.homeLayouts || []), ...(catalog.recommendationPacks || [])]
    },
    {
      id: 'audio',
      title: 'Audio Rewards',
      description: 'Music, ambient packs, and button audio unlocks.',
      items: [...(catalog.musicPacks || []), ...(catalog.ambientPacks || []), ...(catalog.buttonPacks || [])]
    },
    {
      id: 'utility',
      title: 'Utility Unlocks',
      description: 'Showcase slots and Gaming Links feature upgrades.',
      items: [
        ...(catalog.showcaseSlots || []).map((slot) => ({
          id: slot.id,
          name: `Showcase Slot ${slot.slotNumber}`,
          description: 'Adds another achievement showcase slot to your profile.',
          requiredXP: slot.requiredXP,
          unlocked: slot.unlocked,
          progressPercent: slot.progressPercent
        })),
        ...(catalog.gamingLinks || [])
      ]
    }
  ]), [catalog]);

  return (
    <div className="home-page" style={pageStyle}>
      <NavBar />

      <section style={sectionStyle}>
        <p style={{ opacity: 0.7, marginBottom: '8px' }}>Progression</p>
        <h1 style={{ margin: 0, marginBottom: '8px' }}>Rewards</h1>
        <p style={{ margin: 0, opacity: 0.82 }}>
          See what you have unlocked, what is still locked, and what each reward actually changes in GamePilot.
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
          <span className="confidence-badge">Level {summary?.level ?? 0}</span>
          <span className="match-score">XP: {summary?.xp ?? 0}</span>
          {summary?.nextUnlock && (
            <span className="confidence-badge">Next: {summary.nextUnlock.name} ({summary.nextUnlock.remainingXP} XP)</span>
          )}
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Reward Categories</h2>
        <div style={gridStyle}>
          {sections.map((section) => (
            <div key={section.id} style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>{section.title}</h3>
              <p style={{ opacity: 0.8 }}>{section.description}</p>
              <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                Unlocked {getRewardCount(section.items)} / {section.items.length}
              </p>
              <div className="weekly-quest-progress-bar">
                <span style={{ width: `${section.items.length > 0 ? (getRewardCount(section.items) / section.items.length) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {sections.map((section) => (
        <section key={section.id} style={sectionStyle}>
          <h2 style={{ marginTop: 0 }}>{section.title}</h2>
          <div style={gridStyle}>
            {section.items.map((reward) => (
              <div key={reward.id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'start' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '8px' }}>{reward.name}</h3>
                  <span className="confidence-badge">{reward.unlocked ? 'Unlocked' : 'Locked'}</span>
                </div>
                <p style={{ marginTop: 0, opacity: 0.8 }}>{reward.description || 'Progression reward.'}</p>
                <p style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                  {reward.unlocked ? 'Ready to use now.' : `Unlocks at ${reward.requiredXP || 0} XP`}
                </p>
                {typeof reward.progressPercent === 'number' && (
                  <div className="weekly-quest-progress-bar">
                    <span style={{ width: `${reward.progressPercent}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default Rewards;
