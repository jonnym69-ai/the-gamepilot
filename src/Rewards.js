import React, { useState, useMemo } from 'react';
import NavBar from './NavBar';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';
import { Gamepad2, Sparkles, Library, LayoutGrid, Zap, Gift, PlayCircle, Image } from 'lucide-react';
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

// Sidebar sections matching the screenshot
const CUSTOMIZE_SECTIONS = [
  { id: 'cardStyles', label: 'Card Styles', icon: Gamepad2, count: { current: 6, total: 7 } },
  { id: 'transitions', label: 'Transitions', icon: Sparkles, count: { current: 4, total: 6 } },
  { id: 'libraryView', label: 'Library View', icon: Library, count: { current: 3, total: 4 } },
  { id: 'homeLayout', label: 'Home Layout', icon: LayoutGrid, count: { current: 2, total: 3 } },
  { id: 'recommendationStyle', label: 'Recommendation Style', icon: Zap, count: { current: 3, total: 4 } },
  { id: 'surpriseMe', label: 'Surprise Me', icon: Gift, count: { current: 5, total: 7 } },
  { id: 'logoAnimation', label: 'Logo Animation', icon: PlayCircle, count: { current: 4, total: 8 } }
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

// Placeholder panels for other sections
const PlaceholderPanel = ({ title, description }) => (
  <div className="rewards-panel">
    <div className="rewards-panel-header">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
    <div className="rewards-placeholder">
      <Image size={48} style={{ opacity: 0.3 }} />
      <p>Coming soon</p>
    </div>
  </div>
);

function Rewards() {
  const [activeSection, setActiveSection] = useState('cardStyles');
  
  const summary = useMemo(() => ProgressionUnlockService.getRewardCatalogSummary(), []);

  const renderPanel = () => {
    switch (activeSection) {
      case 'cardStyles':
        return <CardStylesPanel />;
      case 'transitions':
        return <PlaceholderPanel title="Transitions" description="Customize animations between screens" />;
      case 'libraryView':
        return <PlaceholderPanel title="Library View" description="Change how your library is organized" />;
      case 'homeLayout':
        return <PlaceholderPanel title="Home Layout" description="Customize your home dashboard layout" />;
      case 'recommendationStyle':
        return <PlaceholderPanel title="Recommendation Style" description="Change how recommendations appear" />;
      case 'surpriseMe':
        return <PlaceholderPanel title="Surprise Me" description="Configure your surprise game feature" />;
      case 'logoAnimation':
        return <PlaceholderPanel title="Logo Animation" description="Choose your startup animation" />;
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
            {CUSTOMIZE_SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  className={`rewards-section-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <Icon size={18} />
                  <span className="rewards-section-label">{section.label}</span>
                  <span className="rewards-section-count">
                    {section.count.current}/{section.count.total}
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
