import React, { useState, useMemo, useCallback } from 'react';
import NavBar from './NavBar';
import { useToast } from './components/Toast';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';
import { PersonaService } from './services/PersonaService';
import { SpecialEventsService } from './services/SpecialEventsService';
import EntitlementService from './services/EntitlementService';
import { Gamepad2, Library, LayoutGrid, Zap, PlayCircle, Check, Link2, Sparkles, Calendar, Cake, Snowflake, Ghost, Sun, Flower2, PartyPopper, ShoppingBag } from 'lucide-react';
import './Rewards.css';

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
      <p>Choose your startup title animation style</p>
    </div>
    <div className="rewards-card-grid">
      {animations.map((anim) => (
        <div 
          key={anim.id} 
          className={`rewards-card-item ${selectedAnimation === anim.id ? 'active' : ''} ${!anim.unlocked ? 'locked' : ''}`}
          onClick={() => anim.unlocked && onSelect(anim.id)}
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
      <p>Alternate layouts for the Home dashboard</p>
    </div>
    <div className="rewards-card-grid">
      {layouts.map((layout) => (
        <div
          key={layout.id}
          className={`rewards-card-item ${selectedId === layout.id ? 'active' : ''} ${!layout.unlocked ? 'locked' : ''}`}
          onClick={() => layout.unlocked && onSelect(layout.id)}
        >
          <div className="reward-home-preview" style={{
            position: 'relative',
            overflow: 'hidden',
            padding: '30px 20px',
            textAlign: 'center',
            borderRadius: '12px',
            border: selectedId === layout.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)'
          }}>
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

const UNLOCK_BENEFITS = {
  gamepilot_pro: 'Unlocks everything: Theme Builder, Layout Pack, Widget Pack, Power Tools, and Premium Themes.',
  advanced_theme_builder: 'Access the Advanced Theme Builder with extra polish options and future builder upgrades.',
  layout_pack: 'Unlock premium layout and presentation packs for the Library and dashboard.',
  widget_pack: 'Unlocks weekly retention quests and GamePilot Picks widgets on the Home dashboard.',
  power_tools: 'Unlocks Bulk Mode + Library Analytics + Recommendation Engine Tuner with tunable weights for power users.',
  premium_theme_pack: 'Unlocks premium theme drops and exclusive colour palettes.',
};

// Premium Unlocks Panel — discover one-off store purchases
const PremiumUnlocksPanel = ({ catalog, onNavigate }) => (
  <div className="rewards-panel">
    <div className="rewards-panel-header">
      <h2>Premium Unlocks</h2>
      <p>Permanent one-off upgrades that support GamePilot development.</p>
    </div>
    <div className="rewards-card-grid">
      {catalog.map((product) => (
        <div
          key={product.id}
          className={`rewards-card-item ${product.unlocked ? 'unlocked' : 'locked'}`}
        >
          <div
            className="reward-library-preview"
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: '30px 20px',
              textAlign: 'center',
              borderRadius: '12px',
              border: product.unlocked ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
              background: product.unlocked
                ? 'linear-gradient(135deg, rgba(0,210,211,0.12), rgba(0,180,148,0.08))'
                : 'var(--bg-secondary)'
            }}
          >
            <ShoppingBag size={22} style={{ opacity: 0.7, marginBottom: '8px' }} />
            <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>{product.name}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.75, lineHeight: 1.3 }}>{product.description}</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '8px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)' }}>
              {UNLOCK_BENEFITS[product.id] || 'Permanent unlock.'}
            </div>
            {product.unlocked ? (
              <div className="reward-active-badge" style={{ position: 'absolute', top: '10px', right: '10px' }}>
                Owned
              </div>
            ) : (
              <div className="reward-locked-overlay" style={{ opacity: 0.55 }}>
                <div className="reward-lock-icon">🔒</div>
              </div>
            )}
          </div>
          {!product.unlocked && (
            <button
              className="action-button primary"
              style={{ marginTop: '10px', width: '100%', padding: '8px', fontSize: '13px' }}
              onClick={onNavigate}
            >
              Open Founder Lounge
            </button>
          )}
        </div>
      ))}
    </div>
  </div>
);

// Gaming Links Layout Panel - earnable layouts/box styles for Gaming Links page
const GamingLinksLayoutPanel = ({ layouts, selectedId, onSelect }) => (
  <div className="rewards-panel">
    <div className="rewards-panel-header">
      <h2>Gaming Links Layouts</h2>
      <p>Unlock new layouts and box shapes for your Gaming Links page.</p>
    </div>
    <div className="rewards-card-grid">
      {layouts.map((layout) => (
        <div
          key={layout.id}
          className={`rewards-card-item ${selectedId === layout.id ? 'active' : ''} ${!layout.unlocked ? 'locked' : ''}`}
          onClick={() => layout.unlocked && onSelect(layout.id)}
        >
          <div
            className="reward-library-preview"
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: '30px 20px',
              textAlign: 'center',
              borderRadius: '12px',
              border: selectedId === layout.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
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

const GamingLinksFeaturesPanel = ({ features, selectedId, onSelect }) => (
  <div className="rewards-panel">
    <div className="rewards-panel-header">
      <h2>Gaming Links Rewards</h2>
      <p>Base and premium visual upgrades for your Gaming Links cards.</p>
    </div>
    <div className="rewards-card-grid">
      {features.map((feature) => (
        <div
          key={feature.id}
          className={`rewards-card-item ${selectedId === feature.id ? 'active' : ''} ${!feature.unlocked ? 'locked' : ''}`}
          onClick={() => feature.unlocked && onSelect(feature.id)}
        >
          <div
            className="reward-animation-preview"
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: '28px 20px',
              textAlign: 'center',
              borderRadius: feature.id === '3d_transforms' ? '18px' : '12px',
              border: selectedId === feature.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
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
            {selectedId === feature.id && (
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
    </div>
  </div>
);

// Special Events Panel - upcoming/active time-based reward events
const EVENT_ICON_MAP = {
  birthday: Cake,
  christmas: Snowflake,
  halloween: Ghost,
  winter: Snowflake,
  summer: Sun,
  spring: Flower2,
  anniversary: PartyPopper
};

const EVENT_ACCENT_MAP = {
  birthday: '#f472b6',
  christmas: '#dc2626',
  halloween: '#ea580c',
  winter: '#3b82f6',
  summer: '#facc15',
  spring: '#22c55e',
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

const SpecialEventsPanel = ({ events }) => (
  <div className="rewards-panel">
    <div className="rewards-panel-header">
      <h2>Special Events</h2>
      <p>Time-based reward events: birthday, holidays, seasonal challenges. Active events grant XP automatically when you check in.</p>
    </div>
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
  const [premiumCatalog, setPremiumCatalog] = useState(() => EntitlementService.getCatalog());
  const [personas, setPersonas] = useState(() => PersonaService.getPersonas());
  const [specialEvents, setSpecialEvents] = useState(() => SpecialEventsService.getUpcomingEvents());
  const [presentationCustomization, setPresentationCustomization] = useState(() => ProgressionUnlockService.getRewardPresentationCustomization());

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
  
  // Refresh presentation rewards data
  const refreshPresentationRewards = useCallback(() => {
    setCardStyles(ProgressionUnlockService.getCardStyles());
    setLogoAnimations(ProgressionUnlockService.getLogoAnimations());
    setLibraryVariants(ProgressionUnlockService.getLibraryPresentationVariants());
    setHomeLayouts(ProgressionUnlockService.getHomeLayoutVariants());
    setRecommendationPacks(ProgressionUnlockService.getRecommendationPacks());
    setGamingLinksFeatures(ProgressionUnlockService.getGamingLinksFeatures());
    setGamingLinksLayouts(ProgressionUnlockService.getGamingLinksLayouts());
    setPremiumCatalog(EntitlementService.getCatalog());
    setPersonas(PersonaService.getPersonas());
    setSpecialEvents(SpecialEventsService.getUpcomingEvents());
    setPresentationCustomization(ProgressionUnlockService.getRewardPresentationCustomization());
  }, []);
  // Get dynamic counts
  const sectionCounts = useMemo(() => {
    const availableAnims = logoAnimations.filter((a) => a.unlocked).length;
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
      gamingLinksFeatures: {
        current: gamingLinksFeatures.filter(f => f.unlocked).length,
        total: gamingLinksFeatures.length
      },
      gamingLinksLayouts: {
        current: gamingLinksLayouts.filter(l => l.unlocked).length,
        total: gamingLinksLayouts.length
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
      premiumUnlocks: {
        current: premiumCatalog.filter((p) => p.unlocked).length,
        total: premiumCatalog.length
      }
    };
  }, [cardStyles, gamingLinksFeatures, gamingLinksLayouts, homeLayouts, libraryVariants, logoAnimations, personas, recommendationPacks, specialEvents, premiumCatalog]);

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
      case 'gamingLinksFeatures':
        return <GamingLinksFeaturesPanel
          features={gamingLinksFeatures}
          selectedId={presentationCustomization?.selectedGamingLinksFeatures}
          onSelect={handleSelectGamingLinksFeature}
        />;
      case 'gamingLinksLayouts':
        return <GamingLinksLayoutPanel
          layouts={gamingLinksLayouts}
          selectedId={presentationCustomization?.selectedGamingLinksLayout}
          onSelect={handleSelectGamingLinksLayout}
        />;
      case 'personas':
        return <PilotPersonasPanel personas={personas} onApply={handleApplyPersona} />;
      case 'specialEvents':
        return <SpecialEventsPanel events={specialEvents} />;
      case 'logoAnimation':
        return <LogoAnimationPanel animations={logoAnimations} selectedAnimation={resolvedSelectedAnimation} onSelect={handleSelectAnimation} />;
      case 'premiumUnlocks':
        return <PremiumUnlocksPanel catalog={premiumCatalog} onNavigate={() => window.location.hash = '#/donate'} />;
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
            <span className="rewards-kicker">CUSTOMIZE</span>
            <h1>Presentation</h1>
            <p>Equip and activate your unlocked rewards to customize GamePilot's look and feel.</p>
          </div>
          <div className="rewards-level-badge">
            <span className="rewards-level">Level {summary?.level ?? 0}</span>
            <span className="rewards-xp">{summary?.xp?.toLocaleString() ?? 0} XP</span>
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
              { id: 'personas', label: 'Pilot Personas', icon: Sparkles },
              { id: 'specialEvents', label: 'Special Events', icon: Calendar },
              { id: 'cardStyles', label: 'Card Styles', icon: Gamepad2 },
              { id: 'libraryView', label: 'Library View', icon: Library },
              { id: 'homeLayout', label: 'Home Layout', icon: LayoutGrid },
              { id: 'recommendationStyle', label: 'Recommendation Style', icon: Zap },
              { id: 'gamingLinksFeatures', label: 'Gaming Links Rewards', icon: Link2 },
              { id: 'gamingLinksLayouts', label: 'Gaming Links Layouts', icon: LayoutGrid },
              { id: 'logoAnimation', label: 'Logo Animation', icon: PlayCircle },
              { id: 'premiumUnlocks', label: 'Premium Unlocks', icon: ShoppingBag }
            ].map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              const counts = sectionCounts[section.id];

              return (
                <button
                  key={section.id}
                  className={`rewards-section-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <Icon size={18} />
                  <span className="rewards-section-label">{section.label}</span>
                  <span className="rewards-section-count">
                    {counts?.current ?? 0}/{counts?.total ?? 0}
                  </span>
                </button>
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
