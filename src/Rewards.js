import React, { useState, useMemo, useCallback } from 'react';
import NavBar from './NavBar';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';
import { Gamepad2, Sparkles, Library, LayoutGrid, Zap, Gift, PlayCircle, Check, Dices } from 'lucide-react';
import './Rewards.css';

// Card style definitions with preview data
const CARD_STYLES = [
  {
    id: 'standard',
    name: 'Standard Cards',
    description: 'Clean, classic game cards with subtle shadows.',
    locked: false,
    preview: {
      border: '1px solid var(--border-color)',
      background: 'var(--card-bg)',
      shadow: '0 2px 8px rgba(0,0,0,0.1)'
    }
  },
  {
    id: 'neon',
    name: 'Neon Frames',
    description: 'Glowing neon borders that pulse on hover.',
    locked: false,
    preview: {
      border: '2px solid #00d4ff',
      background: 'linear-gradient(135deg, rgba(0,212,255,0.1) 0%, transparent 100%)',
      shadow: '0 0 20px rgba(0,212,255,0.3), inset 0 0 20px rgba(0,212,255,0.1)'
    }
  },
  {
    id: 'glass',
    name: 'Glass Prism',
    description: 'Frosted glass cards with backdrop blur and sheen.',
    locked: false,
    preview: {
      border: '1px solid rgba(255,255,255,0.2)',
      background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
      shadow: '0 8px 32px rgba(0,0,0,0.3)',
      backdropFilter: 'blur(10px)'
    }
  },
  {
    id: 'retro',
    name: 'Retro Pixels',
    description: '8-bit inspired borders with pixelated corners.',
    locked: false,
    active: true,
    preview: {
      border: '3px solid #4ade80',
      background: 'var(--card-bg)',
      shadow: '4px 4px 0 #1f2937',
      borderRadius: '4px'
    }
  },
  {
    id: 'holographic',
    name: 'Holographic',
    description: 'Shifting rainbow sheen on premium cards.',
    locked: true,
    requiredXP: 17180,
    preview: {
      border: '2px solid transparent',
      background: 'linear-gradient(135deg, rgba(255,0,128,0.2) 0%, rgba(0,255,255,0.2) 50%, rgba(255,255,0,0.2) 100%)',
      shadow: '0 0 30px rgba(255,0,128,0.3)',
      borderImage: 'linear-gradient(135deg, #ff0080, #00ffff, #ffff00) 1'
    }
  }
];

// Logo Animation (Doodle) Library
const LOGO_ANIMATIONS = [
  { id: 'synthwave-runway', name: 'Neon Runway', description: 'Cyberpunk neon aesthetic', accent: '🚀', unlocked: true },
  { id: 'pixel-parade', name: 'Pixel Parade', description: 'Retro 8-bit style', accent: '🕹️', unlocked: true },
  { id: 'sunset-brush', name: 'Sunset Brush', description: 'Warm gradient flows', accent: '🌅', unlocked: true },
  { id: 'circuit-glow', name: 'Circuit Glow', description: 'Tech grid pattern', accent: '⚡', unlocked: true },
  { id: 'nebula-script', name: 'Nebula Script', description: 'Cosmic space theme', accent: '🌌', unlocked: false, requiredXP: 2500 },
  { id: 'golden-shine', name: 'Golden Shine', description: 'Prestige gold accent', accent: '👑', unlocked: false, requiredXP: 10000 }
];

// Transition Styles
const TRANSITION_STYLES = [
  { id: 'slide-up', name: 'Slide Up', description: 'Smooth upward transition' },
  { id: 'slide-right', name: 'Slide Right', description: 'Rightward slide effect' },
  { id: 'zoom-pop', name: 'Zoom Pop', description: 'Pop in with zoom' },
  { id: 'tilt-drop', name: 'Tilt Drop', description: '3D tilt and drop' },
  { id: 'fade-glow', name: 'Fade Glow', description: 'Soft fade with glow' }
];

// Surprise Me Modes
const SURPRISE_MODES = [
  { id: 'random', name: 'Pure Random', description: 'Completely random from all games' },
  { id: 'unplayed', name: 'Hidden Gems', description: 'Only games you haven\'t played' },
  { id: 'favorites', name: 'Favorites Mix', description: 'Random from your favorites' },
  { id: 'short', name: 'Quick Sessions', description: 'Games under 2 hours playtime' },
  { id: 'nostalgia', name: 'Nostalgia Hit', description: 'Games not played in 30+ days' }
];

// Sample game card for preview
const SampleGameCard = ({ style, isActive }) => (
  <div 
    className={`reward-sample-card ${isActive ? 'active' : ''} ${style.locked ? 'locked' : ''}`}
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
    {style.locked && (
      <div className="reward-locked-overlay">
        <div className="reward-lock-icon">🔒</div>
        <span>Unlocks at {style.requiredXP?.toLocaleString()} XP</span>
      </div>
    )}
  </div>
);

// Card Styles Panel
const CardStylesPanel = () => (
  <div className="rewards-panel">
    <div className="rewards-panel-header">
      <h2>Card Styles</h2>
      <p>Change how game cards look in your library</p>
    </div>
    <div className="rewards-card-grid">
      {CARD_STYLES.map((style) => (
        <div key={style.id} className="rewards-card-item">
          <SampleGameCard style={style} isActive={style.active} />
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
const LogoAnimationPanel = ({ selectedAnimation, onSelect }) => (
  <div className="rewards-panel">
    <div className="rewards-panel-header">
      <h2>Logo Animation</h2>
      <p>Choose your startup title animation style</p>
    </div>
    <div className="rewards-card-grid">
      {LOGO_ANIMATIONS.map((anim) => (
        <div 
          key={anim.id} 
          className={`rewards-card-item ${selectedAnimation === anim.id ? 'active' : ''} ${!anim.unlocked ? 'locked' : ''}`}
          onClick={() => anim.unlocked && onSelect(anim.id)}
        >
          <div className="reward-animation-preview" style={{
            padding: '40px 20px',
            textAlign: 'center',
            background: 'var(--card-bg)',
            borderRadius: '12px',
            border: selectedAnimation === anim.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>{anim.accent}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>GamePilot</div>
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

// Transitions Panel
const TransitionsPanel = ({ selectedTransition, onSelect }) => (
  <div className="rewards-panel">
    <div className="rewards-panel-header">
      <h2>Transitions</h2>
      <p>Customize screen transition animations</p>
    </div>
    <div className="rewards-list">
      {TRANSITION_STYLES.map((transition) => (
        <div 
          key={transition.id}
          className={`rewards-list-item ${selectedTransition === transition.id ? 'active' : ''}`}
          onClick={() => onSelect(transition.id)}
        >
          <div className="rewards-list-icon">
            <Sparkles size={20} />
          </div>
          <div className="rewards-list-info">
            <h3>{transition.name}</h3>
            <p>{transition.description}</p>
          </div>
          {selectedTransition === transition.id && (
            <div className="rewards-list-check"><Check size={18} /></div>
          )}
        </div>
      ))}
    </div>
  </div>
);

// Placeholder panel for sections not yet implemented
const PlaceholderPanel = ({ title, description }) => (
  <div className="rewards-panel">
    <div className="rewards-panel-header">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
    <div className="rewards-placeholder" style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.6 }}>
      <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🎨</div>
      <p>Configure this in Settings &gt; Reward Presentation</p>
    </div>
  </div>
);

// Surprise Me Panel
const SurpriseMePanel = ({ selectedMode, onSelect }) => (
  <div className="rewards-panel">
    <div className="rewards-panel-header">
      <h2>Surprise Me</h2>
      <p>Configure how the surprise game feature works</p>
    </div>
    <div className="rewards-list">
      {SURPRISE_MODES.map((mode) => (
        <div 
          key={mode.id}
          className={`rewards-list-item ${selectedMode === mode.id ? 'active' : ''}`}
          onClick={() => onSelect(mode.id)}
        >
          <div className="rewards-list-icon">
            <Dices size={20} />
          </div>
          <div className="rewards-list-info">
            <h3>{mode.name}</h3>
            <p>{mode.description}</p>
          </div>
          {selectedMode === mode.id && (
            <div className="rewards-list-check"><Check size={18} /></div>
          )}
        </div>
      ))}
    </div>
    <div className="rewards-info-box" style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
      <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>
        💡 The "Feeling Lucky" button in your Library uses this mode to pick games
      </p>
    </div>
  </div>
);

function Rewards() {
  const [activeSection, setActiveSection] = useState('cardStyles');
  
  // Load saved preferences
  const [selectedAnimation, setSelectedAnimation] = useState(() => {
    return localStorage.getItem('gamepilot_logo_animation') || 'synthwave-runway';
  });
  const [selectedTransition, setSelectedTransition] = useState(() => {
    return localStorage.getItem('gamepilot_transition_style') || 'slide-up';
  });
  const [selectedSurpriseMode, setSelectedSurpriseMode] = useState(() => {
    return localStorage.getItem('gamepilot_surprise_mode') || 'random';
  });
  
  const summary = useMemo(() => ProgressionUnlockService.getRewardCatalogSummary(), []);
  
  // Get dynamic counts
  const sectionCounts = useMemo(() => {
    const availableAnims = LOGO_ANIMATIONS.filter(a => a.unlocked).length;
    return {
      cardStyles: { current: 4, total: 5 },
      transitions: { current: 5, total: 5 },
      libraryView: { current: 4, total: 4 },
      homeLayout: { current: 3, total: 3 },
      recommendationStyle: { current: 4, total: 4 },
      surpriseMe: { current: 5, total: 5 },
      logoAnimation: { current: availableAnims, total: LOGO_ANIMATIONS.length }
    };
  }, []);

  const handleSelectAnimation = useCallback((id) => {
    setSelectedAnimation(id);
    localStorage.setItem('gamepilot_logo_animation', id);
  }, []);

  const handleSelectTransition = useCallback((id) => {
    setSelectedTransition(id);
    localStorage.setItem('gamepilot_transition_style', id);
  }, []);

  const handleSelectSurpriseMode = useCallback((id) => {
    setSelectedSurpriseMode(id);
    localStorage.setItem('gamepilot_surprise_mode', id);
  }, []);

  const renderPanel = () => {
    switch (activeSection) {
      case 'cardStyles':
        return <CardStylesPanel />;
      case 'transitions':
        return <TransitionsPanel selectedTransition={selectedTransition} onSelect={handleSelectTransition} />;
      case 'libraryView':
        return <PlaceholderPanel title="Library View" description="Library presentation variants available in Settings" />;
      case 'homeLayout':
        return <PlaceholderPanel title="Home Layout" description="Home layout options available in Settings" />;
      case 'recommendationStyle':
        return <PlaceholderPanel title="Recommendation Style" description="Recommendation packs available in Settings" />;
      case 'surpriseMe':
        return <SurpriseMePanel selectedMode={selectedSurpriseMode} onSelect={handleSelectSurpriseMode} />;
      case 'logoAnimation':
        return <LogoAnimationPanel selectedAnimation={selectedAnimation} onSelect={handleSelectAnimation} />;
      default:
        return <CardStylesPanel />;
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

        <div className="rewards-layout">
          {/* Left Sidebar */}
          <div className="rewards-sidebar">
            {[
            { id: 'cardStyles', label: 'Card Styles', icon: Gamepad2 },
            { id: 'transitions', label: 'Transitions', icon: Sparkles },
            { id: 'libraryView', label: 'Library View', icon: Library },
            { id: 'homeLayout', label: 'Home Layout', icon: LayoutGrid },
            { id: 'recommendationStyle', label: 'Recommendation Style', icon: Zap },
            { id: 'surpriseMe', label: 'Surprise Me', icon: Gift },
            { id: 'logoAnimation', label: 'Logo Animation', icon: PlayCircle }
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
