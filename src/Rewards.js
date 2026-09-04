import React, { useState, useMemo, useCallback } from 'react';
import NavBar from './NavBar';
import { useToast } from './components/Toast';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';
import { PersonaService } from './services/PersonaService';
import { SpecialEventsService } from './services/SpecialEventsService';
import { SeasonalHideAndSeekService } from './services/SeasonalHideAndSeekService';
import { AchievementTracker } from './AchievementSystem';
import { Gamepad2, Library, LayoutGrid, Zap, PlayCircle, Check, Link2, Sparkles, Calendar, Cake, Snowflake, Ghost, Sun, Flower2, PartyPopper, Award } from 'lucide-react';
import InfoTooltip from './components/InfoTooltip';
import './Rewards.css';

const handleRewardCardKeyDown = (event, unlocked, onSelect) => {
  if (!unlocked || (event.key !== 'Enter' && event.key !== ' ')) return;
  event.preventDefault();
  onSelect();
};

const SECTION_HELP = {
  profileIdentity: 'Equip your profile frame, banner, and title, and pin achievement badges to your showcase.',
  personas: 'One-click identity presets that equip a matching theme, frame, banner, and title together.',
  specialEvents: 'Birthday, holiday, and seasonal events — active events grant XP and challenges.',
  cardStyles: 'Change how game cards look across Home, Library, and recommendations.',
  libraryView: 'Adjust the density and layout of your Library grid.',
  homeLayout: 'Choose which panels appear on your Home page and in what order.',
  recommendationStyle: 'Tune how recommendations are ranked and presented for your playstyle.',
  gamingLinks: 'Enable and arrange the quick-launch gaming links panel.',
  logoAnimation: 'Pick the animated glow treatment for your avatar bubble in the Home hero banner.'
};

// Sample game card for preview
const SampleGameCard = ({ style, isActive }) => (
  <div 
    className={`reward-sample-card ${isActive ? 'active' : ''} ${!style.unlocked ? 'locked' : ''}`}
    style={{
      border: style.preview.border,
      background: style.preview.background,
      boxShadow: style.preview.shadow,
      borderRadius: style.preview.borderRadius || '12px',
      backdropFilter: style.preview.backdropFilter
    }}
  >
    <div className="reward-sample-image">
      <Gamepad2 size={32} style={{ opacity: 0.6 }} />
    </div>
    <div className="reward-sample-info">
      <h4>Sample Game 1</h4>
      <span className="reward-sample-platform">Steam</span>
      <div className="reward-sample-tags">
        <span className="reward-sample-tag">Action</span>
        <span className="reward-sample-tag">Adventure</span>
      </div>
    </div>
    {isActive && (
      <div className="reward-active-badge">Active</div>
    )}
    {!style.unlocked && (
      <div className="reward-locked-overlay">
        <div className="reward-lock-icon">🔒</div>
        <span>Unlocks at {style.requiredXP?.toLocaleString()} XP</span>
      </div>
    )}
  </div>
);

// Card Styles Panel
const CardStylesPanel = ({ styles, selectedCardStyle, onSelect }) => (
  <div className="rewards-panel">
    <div className="rewards-panel-header">
      <h2>Card Styles</h2>
      <p>Change how game cards look in your library</p>
    </div>
    <div className="rewards-card-grid">
      {styles.map((style) => (
        <div 
          key={style.id}
          className={`rewards-card-item ${selectedCardStyle === style.id ? 'active' : ''} ${!style.unlocked ? 'locked' : ''}`}
          onClick={() => style.unlocked && onSelect(style.id)}
          onKeyDown={(event) => handleRewardCardKeyDown(event, style.unlocked, () => onSelect(style.id))}
          role="button"
          tabIndex={style.unlocked ? 0 : -1}
          aria-disabled={!style.unlocked}
          aria-pressed={selectedCardStyle === style.id}
          aria-label={`${style.name}${style.unlocked ? '' : `, locked until ${style.requiredXP?.toLocaleString() || 0} XP`}`}
        >
          <SampleGameCard style={style} isActive={selectedCardStyle === style.id} />
          <div className="rewards-card-info">
            <h3>{style.name}</h3>
            <p>{style.description}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Logo Animation Panel
const LogoAnimationPanel = ({ animations, selectedAnimation, onSelect }) => (
  <div className="rewards-panel">
    <div className="rewards-panel-header">
      <h2>Logo Animation</h2>
      <p>Pick the animated glow treatment for your avatar bubble in the Home page hero banner</p>
    </div>
    <div className="rewards-card-grid">
      {animations.map((anim) => (
        <div 
          key={anim.id} 
          className={`rewards-card-item ${selectedAnimation === anim.id ? 'active' : ''} ${!anim.unlocked ? 'locked' : ''}`}
          onClick={() => anim.unlocked && onSelect(anim.id)}
          onKeyDown={(event) => handleRewardCardKeyDown(event, anim.unlocked, () => onSelect(anim.id))}
          role="button"
          tabIndex={anim.unlocked ? 0 : -1}
          aria-disabled={!anim.unlocked}
          aria-pressed={selectedAnimation === anim.id}
          aria-label={`${anim.name}${anim.unlocked ? '' : `, locked until ${anim.requiredXP?.toLocaleString() || 0} XP`}`}
        >
          <div className="reward-animation-preview" style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '40px 20px',
            textAlign: 'center',
            borderRadius: '12px',
            border: selectedAnimation === anim.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)'
          }}>
            <div className={`reward-logo-stage reward-logo-stage-${anim.id}`}>
              <div className="reward-logo-grid" />
              <div className="reward-logo-orb reward-logo-orb-a" />
              <div className="reward-logo-orb reward-logo-orb-b" />
              <div className="reward-logo-wordmark">
                <span className="reward-logo-kicker">Startup Identity</span>
                <div className="reward-logo-title">GamePilot</div>
                <div className="reward-logo-subtitle">{anim.name}</div>
              </div>
            </div>
            {selectedAnimation === anim.id && (
              <div className="reward-active-badge" style={{ position: 'absolute', top: '10px', right: '10px' }}>
                <Check size={14} />
              </div>
            )}
            {!anim.unlocked && (
              <div className="reward-locked-overlay">
                <div className="reward-lock-icon">🔒</div>
                <span>Unlocks at {anim.requiredXP?.toLocaleString()} XP</span>
              </div>
            )}
          </div>
          <div className="rewards-card-info">
            <h3>{anim.name}</h3>
            <p>{anim.description}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Profile Identity Panel — equip frame, banner, title, and showcase badges
const ProfileIdentityPanel = ({
  frames,
  banners,
  titles,
  showcaseSlots,
  profileCustomization,
  unlockedAchievements,
  onSelectFrame,
  onSelectBanner,
  onSelectTitle,
  onToggleShowcaseAchievement
}) => {
  const selectedFrameId = profileCustomization?.selectedFrame;
  const selectedBannerId = profileCustomization?.selectedBanner;
  const selectedTitleId = profileCustomization?.selectedTitle;
  const showcasedIds = profileCustomization?.showcasedAchievements || [];
  const unlockedSlotCount = showcaseSlots.filter((slot) => slot.unlocked).length;

  return (
    <div className="rewards-panel">
      <div className="rewards-panel-header">
        <h2>Profile Identity</h2>
        <p>Equip the frame, banner, title, and achievement badges displayed on your Profile page.</p>
      </div>

      <h3 className="rewards-identity-subheading">Avatar Frames</h3>
      <div className="rewards-card-grid">
        {frames.map((frame) => (
          <div
            key={frame.id}
            className={`rewards-card-item ${selectedFrameId === frame.id ? 'active' : ''} ${!frame.unlocked ? 'locked' : ''}`}
            onClick={() => frame.unlocked && onSelectFrame(frame.id)}
            onKeyDown={(event) => handleRewardCardKeyDown(event, frame.unlocked, () => onSelectFrame(frame.id))}
            role="button"
            tabIndex={frame.unlocked ? 0 : -1}
            aria-disabled={!frame.unlocked}
            aria-pressed={selectedFrameId === frame.id}
            aria-label={`${frame.name}${frame.unlocked ? '' : `, locked until ${frame.requiredXP?.toLocaleString() || 0} XP`}`}
          >
            <div className="rewards-identity-preview">
              <div
                className="rewards-frame-bubble"
                style={{
                  border: `3px solid ${frame.accentColor || 'var(--border-color)'}`,
                  boxShadow: frame.shadowColor ? `0 0 18px ${frame.shadowColor}` : 'none'
                }}
              >
                <Gamepad2 size={26} />
              </div>
              {selectedFrameId === frame.id && (
                <div className="reward-active-badge" style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  <Check size={14} />
                </div>
              )}
              {!frame.unlocked && (
                <div className="reward-locked-overlay">
                  <div className="reward-lock-icon">🔒</div>
                  <span>Unlocks at {frame.requiredXP?.toLocaleString()} XP</span>
                </div>
              )}
            </div>
            <div className="rewards-card-info">
              <h3>{frame.name}</h3>
              <p>{frame.description}</p>
            </div>
          </div>
        ))}
      </div>

      <h3 className="rewards-identity-subheading">Profile Banners</h3>
      <div className="rewards-card-grid">
        {banners.map((banner) => (
          <div
            key={banner.id}
            className={`rewards-card-item ${selectedBannerId === banner.id ? 'active' : ''} ${!banner.unlocked ? 'locked' : ''}`}
            onClick={() => banner.unlocked && onSelectBanner(banner.id)}
            onKeyDown={(event) => handleRewardCardKeyDown(event, banner.unlocked, () => onSelectBanner(banner.id))}
            role="button"
            tabIndex={banner.unlocked ? 0 : -1}
            aria-disabled={!banner.unlocked}
            aria-pressed={selectedBannerId === banner.id}
            aria-label={`${banner.name}${banner.unlocked ? '' : `, locked until ${banner.requiredXP?.toLocaleString() || 0} XP`}`}
          >
            <div className="rewards-identity-preview">
              <div className="rewards-banner-swatch" style={{ background: banner.preview || 'var(--card-bg)' }}>
                <span className="rewards-banner-swatch-label">{banner.name}</span>
              </div>
              {selectedBannerId === banner.id && (
                <div className="reward-active-badge" style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  <Check size={14} />
                </div>
              )}
              {!banner.unlocked && (
                <div className="reward-locked-overlay">
                  <div className="reward-lock-icon">🔒</div>
                  <span>Unlocks at {banner.requiredXP?.toLocaleString()} XP</span>
                </div>
              )}
            </div>
            <div className="rewards-card-info">
              <h3>{banner.name}</h3>
              <p>{banner.description}</p>
            </div>
          </div>
        ))}
      </div>

      <h3 className="rewards-identity-subheading">Titles</h3>
      <div className="rewards-card-grid">
        {titles.map((title) => (
          <div
            key={title.id}
            className={`rewards-card-item ${selectedTitleId === title.id ? 'active' : ''} ${!title.unlocked ? 'locked' : ''}`}
            onClick={() => title.unlocked && onSelectTitle(title.id)}
            onKeyDown={(event) => handleRewardCardKeyDown(event, title.unlocked, () => onSelectTitle(title.id))}
            role="button"
            tabIndex={title.unlocked ? 0 : -1}
            aria-disabled={!title.unlocked}
            aria-pressed={selectedTitleId === title.id}
            aria-label={`${title.name}${title.unlocked ? '' : `, locked until ${title.requiredXP?.toLocaleString() || 0} XP`}`}
          >
            <div className="rewards-identity-preview">
              <div className={`rewards-title-pill ${selectedTitleId === title.id ? 'equipped' : ''}`}>
                {title.name}
              </div>
              {selectedTitleId === title.id && (
                <div className="reward-active-badge" style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  <Check size={14} />
                </div>
              )}
              {!title.unlocked && (
                <div className="reward-locked-overlay">
                  <div className="reward-lock-icon">🔒</div>
                  <span>Unlocks at {title.requiredXP?.toLocaleString()} XP</span>
                </div>
              )}
            </div>
            <div className="rewards-card-info">
              <h3>{title.name}</h3>
              <p>{title.description}</p>
            </div>
          </div>
        ))}
      </div>

      <h3 className="rewards-identity-subheading">Achievement Showcase</h3>
      <p className="rewards-showcase-sub">
        {unlockedSlotCount} slot{unlockedSlotCount === 1 ? '' : 's'} unlocked — {showcasedIds.length} in use. Tap an unlocked achievement to pin or unpin it on your Profile.
      </p>
      {unlockedAchievements.length === 0 ? (
        <p className="rewards-showcase-empty">No unlocked achievements yet — complete achievements to pin them here.</p>
      ) : (
        <div className="rewards-showcase-chip-row">
          {unlockedAchievements.map((achievement) => {
            const isShowcased = showcasedIds.includes(achievement.id);
            const atLimit = !isShowcased && showcasedIds.length >= unlockedSlotCount;
            return (
              <button
                key={achievement.id}
                className={`rewards-showcase-chip-btn ${isShowcased ? 'showcased' : ''} ${atLimit ? 'at-limit' : ''}`}
                onClick={() => onToggleShowcaseAchievement(achievement.id)}
                aria-pressed={isShowcased}
                title={isShowcased ? 'Unpin from profile' : atLimit ? 'Showcase slots full' : 'Pin to profile'}
              >
                <Award size={13} />
                <span className="rewards-showcase-chip-name">{achievement.name}</span>
                {achievement.points > 0 && <span className="rewards-showcase-chip-points">+{achievement.points} XP</span>}
              </button>
            );
          })}
        </div>
      )}

      <h3 className="rewards-identity-subheading">Showcase Slots</h3>
      <div className="rewards-showcase-slot-row">
        {showcaseSlots.map((slot) => (
          <div key={slot.id} className={`rewards-showcase-slot ${slot.unlocked ? 'unlocked' : 'locked'}`}>
            <span className="rewards-showcase-slot-number">{slot.slotNumber}</span>
            <span className="rewards-showcase-slot-status">
              {slot.unlocked ? 'Unlocked' : `${slot.requiredXP?.toLocaleString()} XP`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Library View Panel
const LibraryViewPanel = ({ variants, selectedId, onSelect }) => (
  <div className="rewards-panel">
    <div className="rewards-panel-header">
      <h2>Library View</h2>
      <p>Customize how your library grid is displayed</p>
    </div>
    <div className="rewards-card-grid">
      {variants.map((variant) => (
        <div
          key={variant.id}
          className={`rewards-card-item ${selectedId === variant.id ? 'active' : ''} ${!variant.unlocked ? 'locked' : ''}`}
          onClick={() => variant.unlocked && onSelect(variant.id)}
          onKeyDown={(event) => handleRewardCardKeyDown(event, variant.unlocked, () => onSelect(variant.id))}
          role="button"
          tabIndex={variant.unlocked ? 0 : -1}
          aria-disabled={!variant.unlocked}
          aria-pressed={selectedId === variant.id}
          aria-label={`${variant.name}${variant.unlocked ? '' : `, locked until ${variant.requiredXP?.toLocaleString() || 0} XP`}`}
        >
          <div className="reward-library-preview" style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '30px 20px',
            textAlign: 'center',
            borderRadius: '12px',
            border: selectedId === variant.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)'
          }}>
            <div className="reward-library-toolbar">
              <span className="reward-library-pill">Library</span>
              <span className="reward-library-pill reward-library-pill-muted">{variant.name}</span>
            </div>
            <div className="reward-library-grid">
              <div className="reward-library-card reward-library-card-featured" />
              <div className="reward-library-card" />
              <div className="reward-library-card" />
              <div className="reward-library-card reward-library-card-wide" />
            </div>
            {selectedId === variant.id && (
              <div className="reward-active-badge" style={{ position: 'absolute', top: '10px', right: '10px' }}>
                <Check size={14} />
              </div>
            )}
            {!variant.unlocked && (
              <div className="reward-locked-overlay">
                <div className="reward-lock-icon">🔒</div>
                <span>Unlocks at {variant.requiredXP?.toLocaleString()} XP</span>
              </div>
            )}
          </div>
          <div className="rewards-card-info">
            <h3>{variant.name}</h3>
            <p>{variant.description}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Home Layout Panel
const HomeLayoutPanel = ({ layouts, selectedId, onSelect }) => (
  <div className="rewards-panel">
    <div className="rewards-panel-header">
      <h2>Home Layout</h2>
      <p>Alternate layouts for the Home dashboard — changes hero size, spacing, widget visibility, and content arrangement.</p>
    </div>
    <div className="rewards-card-grid">
      {layouts.map((layout) => (
        <div
          key={layout.id}
          className={`rewards-card-item ${selectedId === layout.id ? 'active' : ''} ${!layout.unlocked ? 'locked' : ''}`}
          onClick={() => layout.unlocked && onSelect(layout.id)}
          onKeyDown={(event) => handleRewardCardKeyDown(event, layout.unlocked, () => onSelect(layout.id))}
          role="button"
          tabIndex={layout.unlocked ? 0 : -1}
          aria-disabled={!layout.unlocked}
          aria-pressed={selectedId === layout.id}
          aria-label={`${layout.name}${layout.unlocked ? '' : `, locked until ${layout.requiredXP?.toLocaleString() || 0} XP`}`}
        >
          <div className="reward-home-preview" style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '30px 20px',
            textAlign: 'center',
            borderRadius: '12px',
            border: selectedId === layout.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)'
          }}>
            {layout.id === 'focus_finder' || layout.id === 'streamer_overlay' ? (
              <>
                <div className="reward-home-hero" style={{ height: '28px', marginBottom: '10px' }} />
                <div className="reward-home-row" style={{ marginBottom: '6px' }}>
                  <div className="reward-home-widget reward-home-widget-large" style={{ height: '40px' }} />
                </div>
                <div className="reward-home-row reward-home-row-small">
                  <div className="reward-home-widget" style={{ height: '24px' }} />
                  <div className="reward-home-widget" style={{ height: '24px' }} />
                </div>
              </>
            ) : layout.id === 'dashboard_split' ? (
              <>
                <div className="reward-home-hero" style={{ height: '36px', marginBottom: '12px' }} />
                <div className="reward-home-row" style={{ gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className="reward-home-widget reward-home-widget-large" style={{ height: '50px' }} />
                  <div className="reward-home-widget" style={{ height: '50px' }} />
                </div>
                <div className="reward-home-row reward-home-row-small" style={{ marginTop: '8px' }}>
                  <div className="reward-home-widget" style={{ height: '24px' }} />
                  <div className="reward-home-widget" style={{ height: '24px' }} />
                </div>
              </>
            ) : layout.id === 'arcade_cabinet' ? (
              <>
                <div className="reward-home-hero" style={{ height: '52px', marginBottom: '16px', border: '2px solid rgba(255, 107, 53, 0.3)' }} />
                <div className="reward-home-row" style={{ marginBottom: '10px' }}>
                  <div className="reward-home-widget reward-home-widget-large" style={{ height: '56px', borderRadius: '14px' }} />
                  <div className="reward-home-widget" style={{ height: '56px', borderRadius: '14px' }} />
                </div>
                <div className="reward-home-row reward-home-row-small">
                  <div className="reward-home-widget" style={{ height: '32px', borderRadius: '14px' }} />
                  <div className="reward-home-widget" style={{ height: '32px', borderRadius: '14px' }} />
                  <div className="reward-home-widget" style={{ height: '32px', borderRadius: '14px' }} />
                </div>
              </>
            ) : (
              <>
                <div className="reward-home-hero" />
                <div className="reward-home-row">
                  <div className="reward-home-widget reward-home-widget-large" />
                  <div className="reward-home-widget" />
                </div>
                <div className="reward-home-row reward-home-row-small">
                  <div className="reward-home-widget" />
                  <div className="reward-home-widget" />
                  <div className="reward-home-widget" />
                </div>
              </>
            )}
            {selectedId === layout.id && (
              <div className="reward-active-badge" style={{ position: 'absolute', top: '10px', right: '10px' }}>
                <Check size={14} />
              </div>
            )}
            {!layout.unlocked && (
              <div className="reward-locked-overlay">
                <div className="reward-lock-icon">🔒</div>
                <span>Unlocks at {layout.requiredXP?.toLocaleString()} XP</span>
              </div>
            )}
          </div>
          <div className="rewards-card-info">
            <h3>{layout.name}</h3>
            <p>{layout.description}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Combined Gaming Links Panel
const GamingLinksPanel = ({ features, layouts, selectedFeatureId, selectedLayoutId, onSelectFeature, onSelectLayout }) => {
  const totalUnlocked = features.filter((f) => f.unlocked).length + layouts.filter((l) => l.unlocked).length;
  const total = features.length + layouts.length;
  return (
    <div className="rewards-panel">
      <div className="rewards-panel-header">
        <h2>Gaming Links</h2>
        <p>Visual upgrades and layouts for your Gaming Links page. {totalUnlocked}/{total} unlocked.</p>
      </div>
      <div className="rewards-card-grid">
        {features.map((feature) => (
          <div
            key={feature.id}
            className={`rewards-card-item ${selectedFeatureId === feature.id ? 'active' : ''} ${!feature.unlocked ? 'locked' : ''}`}
            onClick={() => feature.unlocked && onSelectFeature(feature.id)}
            onKeyDown={(event) => handleRewardCardKeyDown(event, feature.unlocked, () => onSelectFeature(feature.id))}
            role="button"
            tabIndex={feature.unlocked ? 0 : -1}
            aria-disabled={!feature.unlocked}
            aria-pressed={selectedFeatureId === feature.id}
            aria-label={`${feature.name}${feature.unlocked ? '' : `, locked until ${feature.requiredXP?.toLocaleString() || 0} XP`}`}
          >
            <div
              className="reward-animation-preview"
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '28px 20px',
                textAlign: 'center',
                borderRadius: feature.id === '3d_transforms' ? '18px' : '12px',
                border: selectedFeatureId === feature.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                background: feature.accentColor
                  ? `linear-gradient(135deg, ${feature.accentColor}33, rgba(15, 23, 42, 0.42))`
                  : 'linear-gradient(135deg, rgba(255, 107, 53, 0.16), rgba(15, 23, 42, 0.34))',
                boxShadow: feature.id === 'neon_glow' ? `0 0 22px ${feature.accentColor || '#3dd9ff'}55` : undefined,
                transform: feature.id === '3d_transforms' ? 'perspective(600px) rotateX(4deg) rotateY(-5deg)' : undefined
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <Link2 size={24} />
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '8px' }}>{feature.name}</div>
              <div className="reward-recommendation-tags" style={{ justifyContent: 'center' }}>
                {(feature.features || []).slice(0, 3).map((tag) => (
                  <span key={tag}>{tag.replaceAll('-', ' ')}</span>
                ))}
              </div>
              {selectedFeatureId === feature.id && (
                <div className="reward-active-badge" style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  <Check size={14} />
                </div>
              )}
              {!feature.unlocked && (
                <div className="reward-locked-overlay">
                  <div className="reward-lock-icon">🔒</div>
                  <span>Unlocks at {feature.requiredXP?.toLocaleString()} XP</span>
                </div>
              )}
            </div>
            <div className="rewards-card-info">
              <h3>{feature.name}</h3>
              <p>{feature.description}</p>
            </div>
          </div>
        ))}
        {layouts.map((layout) => (
          <div
            key={layout.id}
            className={`rewards-card-item ${selectedLayoutId === layout.id ? 'active' : ''} ${!layout.unlocked ? 'locked' : ''}`}
            onClick={() => layout.unlocked && onSelectLayout(layout.id)}
            onKeyDown={(event) => handleRewardCardKeyDown(event, layout.unlocked, () => onSelectLayout(layout.id))}
            role="button"
            tabIndex={layout.unlocked ? 0 : -1}
            aria-disabled={!layout.unlocked}
            aria-pressed={selectedLayoutId === layout.id}
            aria-label={`${layout.name}${layout.unlocked ? '' : `, locked until ${layout.requiredXP?.toLocaleString() || 0} XP`}`}
          >
            <div
              className="reward-library-preview"
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '30px 20px',
                textAlign: 'center',
                borderRadius: '12px',
                border: selectedLayoutId === layout.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                background: layout.preview
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                <Link2 size={18} />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{layout.name}</span>
              </div>
              <div className="reward-library-grid">
                <div className="reward-library-card" />
                <div className="reward-library-card" />
                <div className="reward-library-card" />
                <div className="reward-library-card" />
              </div>
              {selectedLayoutId === layout.id && (
                <div className="reward-active-badge" style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  <Check size={14} />
                </div>
              )}
              {!layout.unlocked && (
                <div className="reward-locked-overlay">
                  <div className="reward-lock-icon">🔒</div>
                  <span>Unlocks at {layout.requiredXP?.toLocaleString()} XP</span>
                </div>
              )}
            </div>
            <div className="rewards-card-info">
              <h3>{layout.name}</h3>
              <p>{layout.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Special Events Panel - upcoming/active time-based reward events
const EVENT_ICON_MAP = {
  birthday: Cake,
  christmas: Snowflake,
  halloween: Ghost,
  winter: Snowflake,
  summer: Sun,
  spring: Flower2,
  easter: Sparkles,
  anniversary: PartyPopper
};

const EVENT_ACCENT_MAP = {
  birthday: '#f472b6',
  christmas: '#dc2626',
  halloween: '#ea580c',
  winter: '#3b82f6',
  summer: '#facc15',
  spring: '#22c55e',
  easter: '#f59e0b',
  anniversary: '#8b5cf6'
};

const formatDaysUntil = (event) => {
  if (event.active) return 'ACTIVE TODAY';
  if (event.daysUntil === null || event.daysUntil === undefined) return 'Not configured';
  if (event.daysUntil === 0) return 'Today';
  if (event.daysUntil === 1) return 'Tomorrow';
  if (event.daysUntil < 7) return `In ${event.daysUntil} days`;
  if (event.daysUntil < 30) return `In ${Math.round(event.daysUntil / 7)} week${Math.round(event.daysUntil / 7) === 1 ? '' : 's'}`;
  if (event.daysUntil < 60) return `In about a month`;
  return `In ${Math.round(event.daysUntil / 30)} months`;
};

const SpecialEventsPanel = ({ events }) => {
  const hideSeekProgress = useMemo(() => SeasonalHideAndSeekService.getActiveProgress(), []);

  return (
  <div className="rewards-panel">
    <div className="rewards-panel-header">
      <h2>Special Events</h2>
      <p>Time-based reward events: birthday, holidays, seasonal challenges. Active events grant XP automatically when you check in.</p>
    </div>

    {hideSeekProgress && (
      <div className="rewards-hide-seek-card" style={{
        marginBottom: '20px',
        padding: '16px 20px',
        borderRadius: '14px',
        border: `1px solid ${hideSeekProgress.completed ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
        background: hideSeekProgress.completed
          ? 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))'
          : 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '32px' }}>{hideSeekProgress.icon}</span>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '2px' }}>
            {hideSeekProgress.name}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #9aa0a6)', marginBottom: '8px' }}>
            {hideSeekProgress.completed
              ? `Complete! You found all ${hideSeekProgress.totalItems} ${hideSeekProgress.itemName}s.`
              : `Find ${hideSeekProgress.totalItems - hideSeekProgress.found.length} more hidden ${hideSeekProgress.itemName}s around GamePilot!`}
          </div>
          <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div style={{
              width: `${hideSeekProgress.progressPercent}%`,
              height: '100%',
              borderRadius: 'inherit',
              background: hideSeekProgress.completed ? '#22c55e' : 'linear-gradient(90deg, #ff6b35, #f093fb)',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '120px' }}>
          {Array.from({ length: hideSeekProgress.totalItems }, (_, i) => (
            <span
              key={i}
              style={{
                fontSize: '16px',
                opacity: hideSeekProgress.found.includes(`${hideSeekProgress.id}-item-${i}`) ? 1 : 0.2,
                transition: 'opacity 0.3s ease'
              }}
            >
              {hideSeekProgress.itemEmoji}
            </span>
          ))}
        </div>
      </div>
    )}

    <div className="rewards-card-grid">
      {events.map((event) => {
        const Icon = EVENT_ICON_MAP[event.icon] || Calendar;
        const accent = EVENT_ACCENT_MAP[event.icon] || '#94a3b8';
        return (
          <div
            key={event.id}
            className={`rewards-card-item ${event.active ? 'active' : ''}`}
            style={{ cursor: 'default' }}
          >
            <div
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '24px 20px',
                borderRadius: '12px',
                border: event.active ? `2px solid ${accent}` : '1px solid var(--border-color)',
                background: event.active
                  ? `linear-gradient(135deg, ${accent}33, ${accent}1a)`
                  : `linear-gradient(135deg, ${accent}1a, transparent)`,
                minHeight: '160px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: `${accent}33`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={20} style={{ color: accent }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{event.name}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{event.category}</div>
                </div>
              </div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '999px',
                background: event.active ? `${accent}` : 'rgba(255,255,255,0.08)',
                color: event.active ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                alignSelf: 'flex-start'
              }}>
                {formatDaysUntil(event)}
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.85, lineHeight: 1.4 }}>
                {event.description}
              </div>
              <div style={{
                marginTop: 'auto',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.78rem'
              }}>
                <span style={{ fontWeight: 700, color: accent }}>+{event.xpReward.toLocaleString()} XP</span>
                {event.bonus && (
                  <span style={{ opacity: 0.7, textAlign: 'right' }}>{event.bonus}</span>
                )}
              </div>
              {event.challenge && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>
                    Theme challenge: {event.challenge.plays}/{event.challenge.required} games
                    {event.challenge.unlocked ? ' — unlocked!' : ''}
                  </div>
                  <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${event.challenge.progressPercent}%`,
                      height: '100%',
                      background: event.challenge.unlocked ? '#22c55e' : accent
                    }} />
                  </div>
                </div>
              )}
              {event.actionHint && (
                <div style={{ fontSize: '0.72rem', opacity: 0.6, fontStyle: 'italic' }}>
                  {event.actionHint}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
  );
};

// Pilot Personas Panel - one-click bundles that equip multiple cosmetics together
const PilotPersonasPanel = ({ personas, onApply }) => (
  <div className="rewards-panel">
    <div className="rewards-panel-header">
      <h2>Pilot Personas</h2>
      <p>One-click identity presets. Equips a coherent theme + frame + banner + title + recommendation pack + gaming links layout. Locked parts are skipped.</p>
    </div>
    <div className="rewards-card-grid">
      {personas.map((persona) => (
        <div
          key={persona.id}
          className={`rewards-card-item ${persona.fullyUnlocked ? '' : 'persona-partial'}`}
        >
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: '24px 20px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              background: persona.preview,
              minHeight: '140px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: persona.accentColor }} />
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                {persona.name}
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              fontSize: '0.78rem',
              color: 'rgba(255,255,255,0.85)',
              textShadow: '0 1px 3px rgba(0,0,0,0.5)'
            }}>
              <span>{persona.unlockedParts}/{persona.totalParts} parts unlocked</span>
              {persona.fullyUnlocked && (
                <span style={{
                  background: 'rgba(34, 197, 94, 0.85)',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                  fontWeight: 600
                }}>
                  COMPLETE
                </span>
              )}
            </div>
            <div style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '4px',
              background: 'rgba(0,0,0,0.25)'
            }}>
              <div style={{
                width: `${persona.progressPercent}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${persona.accentColor}, ${persona.secondaryColor})`,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
          <div className="rewards-card-info">
            <h3>{persona.name}</h3>
            <p>{persona.description}</p>
            <button
              type="button"
              className="action-button primary"
              style={{ marginTop: '10px', width: '100%' }}
              onClick={() => onApply(persona.id)}
              disabled={persona.unlockedParts === 0}
            >
              {persona.unlockedParts === 0
                ? 'Locked — keep playing!'
                : persona.fullyUnlocked
                  ? 'Equip Persona'
                  : `Equip ${persona.unlockedParts} part${persona.unlockedParts === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Recommendation Pack Panel
const RecommendationPackPanel = ({ packs, selectedId, onSelect }) => (
  <div className="rewards-panel">
    <div className="rewards-panel-header">
      <h2>Recommendation Style</h2>
      <p>Visual styles for recommendation cards</p>
    </div>
    <div className="rewards-card-grid">
      {packs.map((pack) => (
        <div
          key={pack.id}
          className={`rewards-card-item ${selectedId === pack.id ? 'active' : ''} ${!pack.unlocked ? 'locked' : ''}`}
          onClick={() => pack.unlocked && onSelect(pack.id)}
        >
          <div className="reward-animation-preview" style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '30px 20px',
            textAlign: 'center',
            borderRadius: '12px',
            border: selectedId === pack.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)'
          }}>
            <div className="reward-recommendation-preview">
              <div className="reward-recommendation-badge">
                <Zap size={14} />
                <span>Smart Pick</span>
              </div>
              <div className="reward-recommendation-card">
                <div className="reward-recommendation-cover" />
                <div className="reward-recommendation-copy">
                  <div className="reward-recommendation-line reward-recommendation-line-title" />
                  <div className="reward-recommendation-line" />
                  <div className="reward-recommendation-tags">
                    <span>Quick</span>
                    <span>Cozy</span>
                    <span>Focus</span>
                  </div>
                </div>
              </div>
            </div>
            {selectedId === pack.id && (
              <div className="reward-active-badge" style={{ position: 'absolute', top: '10px', right: '10px' }}>
                <Check size={14} />
              </div>
            )}
            {!pack.unlocked && (
              <div className="reward-locked-overlay">
                <div className="reward-lock-icon">🔒</div>
                <span>Unlocks at {pack.requiredXP?.toLocaleString()} XP</span>
              </div>
            )}
          </div>
          <div className="rewards-card-info">
            <h3>{pack.name}</h3>
            <p>{pack.description}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

function Rewards() {
  const [activeSection, setActiveSection] = useState('cardStyles');
  const { success, error: toastError } = useToast();
  
  // Presentation rewards state
  const [cardStyles, setCardStyles] = useState(() => ProgressionUnlockService.getCardStyles());
  const [logoAnimations, setLogoAnimations] = useState(() => ProgressionUnlockService.getLogoAnimations());
  const [libraryVariants, setLibraryVariants] = useState(() => ProgressionUnlockService.getLibraryPresentationVariants());
  const [homeLayouts, setHomeLayouts] = useState(() => ProgressionUnlockService.getHomeLayoutVariants());
  const [recommendationPacks, setRecommendationPacks] = useState(() => ProgressionUnlockService.getRecommendationPacks());
  const [gamingLinksFeatures, setGamingLinksFeatures] = useState(() => ProgressionUnlockService.getGamingLinksFeatures());
  const [gamingLinksLayouts, setGamingLinksLayouts] = useState(() => ProgressionUnlockService.getGamingLinksLayouts());
  const [personas, setPersonas] = useState(() => PersonaService.getPersonas());
  const [specialEvents, setSpecialEvents] = useState(() => SpecialEventsService.getUpcomingEvents());
  const [presentationCustomization, setPresentationCustomization] = useState(() => ProgressionUnlockService.getRewardPresentationCustomization());
  const [profileCatalog, setProfileCatalog] = useState(() => ProgressionUnlockService.getProfileRewardCatalog());

  const summary = useMemo(() => ProgressionUnlockService.getRewardCatalogSummary(), []);
  const nextUnlockPath = summary?.upcomingUnlocks || [];
  const roadmapUnlocks = summary?.nextUnlock ? nextUnlockPath.slice(1) : nextUnlockPath;
  const resolvedSelectedCardStyle = useMemo(() => {
    const selectedStyle = cardStyles.find((style) => style.id === presentationCustomization?.selectedCardStyle && style.unlocked);
    if (selectedStyle) {
      return selectedStyle.id;
    }

    return cardStyles.find((style) => style.unlocked)?.id || cardStyles[0]?.id || 'standard';
  }, [cardStyles, presentationCustomization]);
  const resolvedSelectedAnimation = useMemo(() => {
    const selectedLogoAnimation = logoAnimations.find((animation) => animation.id === presentationCustomization?.selectedLogoAnimation && animation.unlocked);
    if (selectedLogoAnimation) {
      return selectedLogoAnimation.id;
    }

    return logoAnimations.find((animation) => animation.unlocked)?.id || logoAnimations[0]?.id || 'synthwave-runway';
  }, [logoAnimations, presentationCustomization]);

  const unlockedAchievementOptions = useMemo(() => {
    const pointsMap = AchievementTracker.getAchievementPoints();
    return (AchievementTracker.getUnlockedAchievements() || []).map((achievementId) => {
      const achievement = AchievementTracker.getAchievementById(achievementId);
      if (!achievement) return null;
      return {
        id: achievementId,
        name: achievement.name,
        description: achievement.description,
        points: pointsMap[achievementId] || 0
      };
    }).filter(Boolean);
  }, []);
  
  // Refresh presentation rewards data
  const refreshPresentationRewards = useCallback(() => {
    setCardStyles(ProgressionUnlockService.getCardStyles());
    setLogoAnimations(ProgressionUnlockService.getLogoAnimations());
    setLibraryVariants(ProgressionUnlockService.getLibraryPresentationVariants());
    setHomeLayouts(ProgressionUnlockService.getHomeLayoutVariants());
    setRecommendationPacks(ProgressionUnlockService.getRecommendationPacks());
    setGamingLinksFeatures(ProgressionUnlockService.getGamingLinksFeatures());
    setGamingLinksLayouts(ProgressionUnlockService.getGamingLinksLayouts());
    setPersonas(PersonaService.getPersonas());
    setSpecialEvents(SpecialEventsService.getUpcomingEvents());
    setPresentationCustomization(ProgressionUnlockService.getRewardPresentationCustomization());
    setProfileCatalog(ProgressionUnlockService.getProfileRewardCatalog());
  }, []);
  // Get dynamic counts
  const sectionCounts = useMemo(() => {
    const availableAnims = logoAnimations.filter((a) => a.unlocked).length;
    const identityFrames = profileCatalog?.frames || [];
    const identityBanners = profileCatalog?.banners || [];
    const identityTitles = profileCatalog?.titles || [];
    const identitySlots = profileCatalog?.showcaseSlots || [];
    const identityItems = [...identityFrames, ...identityBanners, ...identityTitles, ...identitySlots];
    return {
      cardStyles: {
        current: cardStyles.filter((style) => style.unlocked).length,
        total: cardStyles.length
      },
      libraryView: { 
        current: libraryVariants.filter(v => v.unlocked).length, 
        total: libraryVariants.length 
      },
      homeLayout: { 
        current: homeLayouts.filter(l => l.unlocked).length, 
        total: homeLayouts.length 
      },
      recommendationStyle: { 
        current: recommendationPacks.filter(p => p.unlocked).length, 
        total: recommendationPacks.length 
      },
      gamingLinks: {
        current: gamingLinksFeatures.filter(f => f.unlocked).length + gamingLinksLayouts.filter(l => l.unlocked).length,
        total: gamingLinksFeatures.length + gamingLinksLayouts.length
      },
      personas: {
        current: personas.filter(p => p.fullyUnlocked).length,
        total: personas.length
      },
      specialEvents: {
        current: specialEvents.filter(e => e.active).length,
        total: specialEvents.length
      },
      logoAnimation: { current: availableAnims, total: logoAnimations.length },
      profileIdentity: {
        current: identityItems.filter((item) => item.unlocked).length,
        total: identityItems.length
      }
    };
  }, [cardStyles, gamingLinksFeatures, gamingLinksLayouts, homeLayouts, libraryVariants, logoAnimations, personas, profileCatalog, recommendationPacks, specialEvents]);

  const handleSelectAnimation = useCallback((id) => {
    const result = ProgressionUnlockService.selectLogoAnimation(id);
    if (result.success) {
      success(result.message);
      refreshPresentationRewards();
    } else {
      toastError(result.message);
    }
  }, [refreshPresentationRewards, success, toastError]);

  const handleSelectCardStyle = useCallback((id) => {
    const result = ProgressionUnlockService.selectCardStyle(id);
    if (result.success) {
      success(result.message);
      refreshPresentationRewards();
    } else {
      toastError(result.message);
    }
  }, [refreshPresentationRewards, success, toastError]);

  const handleSelectLibraryVariant = useCallback((variantId) => {
    const result = ProgressionUnlockService.selectLibraryPresentationVariant(variantId);
    if (result.success) {
      success(result.message);
      refreshPresentationRewards();
    } else {
      toastError(result.message);
    }
  }, [success, toastError, refreshPresentationRewards]);

  const handleSelectHomeLayout = useCallback((layoutId) => {
    const result = ProgressionUnlockService.selectHomeLayoutVariant(layoutId);
    if (result.success) {
      success(result.message);
      refreshPresentationRewards();
    } else {
      toastError(result.message);
    }
  }, [success, toastError, refreshPresentationRewards]);

  const handleSelectRecommendationPack = useCallback((packId) => {
    const result = ProgressionUnlockService.selectRecommendationPack(packId);
    if (result.success) {
      success(result.message);
      refreshPresentationRewards();
    } else {
      toastError(result.message);
    }
  }, [success, toastError, refreshPresentationRewards]);

  const handleSelectGamingLinksFeature = useCallback((featureId) => {
    const result = ProgressionUnlockService.selectGamingLinksFeatures(featureId);
    if (result.success) {
      success(result.message);
      refreshPresentationRewards();
    } else {
      toastError(result.message);
    }
  }, [success, toastError, refreshPresentationRewards]);

  const handleSelectGamingLinksLayout = useCallback((layoutId) => {
    const result = ProgressionUnlockService.selectGamingLinksLayout(layoutId);
    if (result.success) {
      success(result.message);
      refreshPresentationRewards();
    } else {
      toastError(result.message);
    }
  }, [success, toastError, refreshPresentationRewards]);

  const handleApplyPersona = useCallback((personaId) => {
    const result = PersonaService.applyPersona(personaId);
    if (result.success) {
      success(result.message);
      refreshPresentationRewards();
    } else {
      toastError(result.message);
    }
  }, [success, toastError, refreshPresentationRewards]);

  const handleSelectProfileFrame = useCallback((frameId) => {
    const result = ProgressionUnlockService.selectProfileFrame(frameId);
    if (result.success) {
      success(result.message);
      refreshPresentationRewards();
    } else {
      toastError(result.message);
    }
  }, [success, toastError, refreshPresentationRewards]);

  const handleSelectProfileBanner = useCallback((bannerId) => {
    const result = ProgressionUnlockService.selectProfileBanner(bannerId);
    if (result.success) {
      success(result.message);
      refreshPresentationRewards();
    } else {
      toastError(result.message);
    }
  }, [success, toastError, refreshPresentationRewards]);

  const handleSelectProfileTitle = useCallback((titleId) => {
    const result = ProgressionUnlockService.selectProfileTitle(titleId);
    if (result.success) {
      success(result.message);
      refreshPresentationRewards();
    } else {
      toastError(result.message);
    }
  }, [success, toastError, refreshPresentationRewards]);

  const handleToggleShowcaseAchievement = useCallback((achievementId) => {
    const current = profileCatalog?.customization?.showcasedAchievements || [];
    const maxSlots = (profileCatalog?.showcaseSlots || []).filter((slot) => slot.unlocked).length;
    let next;

    if (current.includes(achievementId)) {
      next = current.filter((id) => id !== achievementId);
    } else {
      if (current.length >= maxSlots) {
        toastError(`Only ${maxSlots} showcase slot${maxSlots === 1 ? '' : 's'} unlocked. Keep earning XP to pin more badges.`);
        return;
      }
      next = [...current, achievementId];
    }

    ProgressionUnlockService.setShowcasedAchievements(next);
    success(next.includes(achievementId) ? 'Badge pinned to profile.' : 'Badge unpinned.');
    refreshPresentationRewards();
  }, [profileCatalog, success, toastError, refreshPresentationRewards]);

  const renderPanel = () => {
    switch (activeSection) {
      case 'cardStyles':
        return <CardStylesPanel styles={cardStyles} selectedCardStyle={resolvedSelectedCardStyle} onSelect={handleSelectCardStyle} />;
      case 'libraryView':
        return <LibraryViewPanel 
          variants={libraryVariants} 
          selectedId={presentationCustomization?.selectedLibraryVariant}
          onSelect={handleSelectLibraryVariant}
        />;
      case 'homeLayout':
        return <HomeLayoutPanel 
          layouts={homeLayouts} 
          selectedId={presentationCustomization?.selectedHomeLayout}
          onSelect={handleSelectHomeLayout}
        />;
      case 'recommendationStyle':
        return <RecommendationPackPanel 
          packs={recommendationPacks} 
          selectedId={presentationCustomization?.selectedRecommendationPack}
          onSelect={handleSelectRecommendationPack}
        />;
      case 'gamingLinks':
        return <GamingLinksPanel
          features={gamingLinksFeatures}
          layouts={gamingLinksLayouts}
          selectedFeatureId={presentationCustomization?.selectedGamingLinksFeatures}
          selectedLayoutId={presentationCustomization?.selectedGamingLinksLayout}
          onSelectFeature={handleSelectGamingLinksFeature}
          onSelectLayout={handleSelectGamingLinksLayout}
        />;
      case 'personas':
        return <PilotPersonasPanel personas={personas} onApply={handleApplyPersona} />;
      case 'profileIdentity':
        return (
          <ProfileIdentityPanel
            frames={profileCatalog?.frames || []}
            banners={profileCatalog?.banners || []}
            titles={profileCatalog?.titles || []}
            showcaseSlots={profileCatalog?.showcaseSlots || []}
            profileCustomization={profileCatalog?.customization}
            unlockedAchievements={unlockedAchievementOptions}
            onSelectFrame={handleSelectProfileFrame}
            onSelectBanner={handleSelectProfileBanner}
            onSelectTitle={handleSelectProfileTitle}
            onToggleShowcaseAchievement={handleToggleShowcaseAchievement}
          />
        );
      case 'specialEvents':
        return <SpecialEventsPanel events={specialEvents} />;
      case 'logoAnimation':
        return <LogoAnimationPanel animations={logoAnimations} selectedAnimation={resolvedSelectedAnimation} onSelect={handleSelectAnimation} />;
      default:
        return <CardStylesPanel styles={cardStyles} selectedCardStyle={resolvedSelectedCardStyle} onSelect={handleSelectCardStyle} />;
    }
  };

  return (
    <div className="rewards-page">
      <NavBar />
      
      <div className="rewards-container">
        {/* Header */}
        <div className="rewards-header">
          <div>
            <span className="rewards-kicker">CUSTOMIZE & PROGRESSION</span>
            <h1>Rewards & Presentation</h1>
            <p>Equip and activate your unlocked styles, preview live theme roadmaps, and track seasonal events.</p>
          </div>
          <div className="rewards-header-stats">
            <div className="rewards-stat-pill">
              <span className="rewards-stat-value">Level {summary?.level ?? 0}</span>
              <span className="rewards-stat-sub">{summary?.xp?.toLocaleString() ?? 0} XP</span>
            </div>
            <div className="rewards-stat-pill">
              <span className="rewards-stat-value">{summary?.unlockedCounts?.total ?? 0}/{summary?.totalCounts?.total ?? 0}</span>
              <span className="rewards-stat-sub">Unlocked</span>
            </div>
          </div>
        </div>

        {summary?.nextUnlock && (
          <div className="rewards-roadmap-card">
            <div className="rewards-roadmap-header">
              <div>
                <span className="rewards-roadmap-kicker">Unlock Path</span>
                <h2>{summary.nextUnlock.name}</h2>
                <p>{summary.nextUnlock.description}</p>
              </div>
              <div className="rewards-roadmap-badges">
                <span className="rewards-roadmap-badge">{summary.nextUnlock.category}</span>
                {summary.nextUnlock.unlockStep ? <span className="rewards-roadmap-badge accent">Step {summary.nextUnlock.unlockStep}</span> : null}
                <span className="rewards-roadmap-badge">{summary.nextUnlock.remainingXP.toLocaleString()} XP left</span>
              </div>
            </div>
            <div className="rewards-roadmap-progress">
              <div className="rewards-roadmap-progress-fill" style={{ width: `${summary.nextUnlock.progressPercent}%` }}></div>
            </div>
            {roadmapUnlocks.length > 0 && (
              <div className="rewards-roadmap-list">
                {roadmapUnlocks.map((unlock) => (
                  <div key={`${unlock.category}-${unlock.id}`} className="rewards-roadmap-item">
                    <span className="rewards-roadmap-step">{unlock.unlockStep || '•'}</span>
                    <div className="rewards-roadmap-copy">
                      <strong>{unlock.name}</strong>
                      <span>{unlock.description}</span>
                      <span>{unlock.category} • {unlock.requiredXP.toLocaleString()} XP</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="rewards-layout">
          {/* Left Sidebar */}
          <div className="rewards-sidebar">
            {[
              { id: 'profileIdentity', label: 'Profile Identity', icon: Award },
              { id: 'personas', label: 'Pilot Personas', icon: Sparkles },
              { id: 'specialEvents', label: 'Special Events', icon: Calendar },
              { id: 'cardStyles', label: 'Card Styles', icon: Gamepad2 },
              { id: 'libraryView', label: 'Library View', icon: Library },
              { id: 'homeLayout', label: 'Home Layout', icon: LayoutGrid },
              { id: 'recommendationStyle', label: 'Recommendation Style', icon: Zap },
              { id: 'gamingLinks', label: 'Gaming Links', icon: Link2 },
              { id: 'logoAnimation', label: 'Logo Animation', icon: PlayCircle }
            ].map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              const counts = sectionCounts[section.id];

              return (
                <InfoTooltip
                  key={section.id}
                  title={section.label}
                  description={SECTION_HELP[section.id]}
                  placement="right"
                  className="rewards-section-tooltip"
                >
                  <button
                    className={`rewards-section-btn ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveSection(section.id)}
                  >
                    <Icon size={18} />
                    <span className="rewards-section-label">{section.label}</span>
                    <span className="rewards-section-count">
                      {counts?.current ?? 0}/{counts?.total ?? 0}
                    </span>
                  </button>
                </InfoTooltip>
              );
            })}
          </div>

          {/* Main Content */}
          <div className="rewards-content">
            {renderPanel()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Rewards;
