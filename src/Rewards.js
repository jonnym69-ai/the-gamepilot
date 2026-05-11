import React, { useState, useMemo, useCallback } from 'react';
import NavBar from './NavBar';
import { useToast } from './components/Toast';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';
import { audioManager } from './services/AudioManager';
import { Gamepad2, Library, LayoutGrid, Zap, PlayCircle, Check, Waves, Music2 } from 'lucide-react';
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

const AudioRewardsPanel = ({
  ambientEnabled,
  ambientSoundPack,
  ambientVolume,
  musicEnabled,
  musicPack,
  musicVolume,
  sfxEnabled,
  sfxVolume,
  buttonSoundPack,
  currentAmbientPackMeta,
  currentMusicPackMeta,
  currentButtonPackMeta,
  ambientUnlocked,
  musicUnlocked,
  ambientRequirement,
  musicRequirement,
  ambientPackOptions,
  musicPackOptions,
  buttonPackOptions,
  ambientPackProgress,
  musicPackProgress,
  buttonPackProgress,
  nextAudioUnlock,
  isSampleButtonPack,
  sampleEntries,
  currentSampleSelection,
  onToggleAmbient,
  onChangeAmbientPack,
  onChangeAmbientVolume,
  onPreviewAmbient,
  onToggleSfx,
  onChangeButtonPack,
  onChangeSfxVolume,
  onPreviewButtonSample,
  onSelectButtonSample,
  onToggleMusic,
  onChangeMusicPack,
  onChangeMusicVolume,
  onPreviewMusic
}) => (
  <div className="rewards-panel">
    <div className="rewards-panel-header">
      <h2>Audio Rewards</h2>
      <p>Equip your unlocked atmosphere, music, and button sound packs here.</p>
    </div>

    <div className="rewards-info-box" style={{ marginBottom: '20px', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
      <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.85 }}>
        {nextAudioUnlock
          ? `Next audio unlock: ${nextAudioUnlock.label} (${nextAudioUnlock.category}) at ${Number(nextAudioUnlock.requiredXP || 0).toLocaleString()} XP.`
          : 'All current audio rewards are unlocked.'}
      </p>
    </div>

    <div className="rewards-list" style={{ gap: '16px', display: 'flex', flexDirection: 'column' }}>
      <div className="rewards-list-item" style={{ alignItems: 'stretch', cursor: 'default' }}>
        <div className="rewards-list-icon"><Waves size={20} /></div>
        <div className="rewards-list-info" style={{ width: '100%' }}>
          <h3>Ambient Atmosphere</h3>
          <p>{ambientUnlocked
            ? `${ambientRequirement.unlockedCount}/${ambientRequirement.totalCount} atmosphere packs unlocked.`
            : `First atmosphere pack unlocks at ${Number(ambientRequirement.requiredXP || 0).toLocaleString()} XP.`}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={ambientEnabled} onChange={(e) => onToggleAmbient(e.target.checked)} disabled={!ambientUnlocked} />
              <span>Enable ambient atmosphere</span>
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <select value={ambientSoundPack} onChange={(e) => onChangeAmbientPack(e.target.value)} disabled={!ambientEnabled || !ambientUnlocked} className="settings-select">
                <option value="dynamic">Match Theme (Dynamic)</option>
                {ambientPackOptions.map((pack) => (
                  <option key={pack.id} value={pack.id} disabled={!pack.unlocked}>
                    {`${pack.label} — ${Number(pack.requiredXP || 0).toLocaleString()} XP${pack.unlocked ? '' : ' (Locked)'}`}
                  </option>
                ))}
              </select>
              <button type="button" className="data-button" disabled={!ambientEnabled || ambientSoundPack === 'dynamic' || !currentAmbientPackMeta?.unlocked} onClick={onPreviewAmbient}>
                Preview
              </button>
            </div>
            <p style={{ margin: 0, opacity: 0.7 }}>{ambientSoundPack === 'dynamic' ? 'Dynamic mode follows your current theme.' : (currentAmbientPackMeta?.description || 'Custom atmosphere selection.')}</p>
            {ambientPackProgress.nextUnlock && ambientUnlocked && (
              <p style={{ margin: 0, opacity: 0.7 }}>{`Next atmosphere pack: ${ambientPackProgress.nextUnlock.label} at ${Number(ambientPackProgress.nextUnlock.requiredXP || 0).toLocaleString()} XP.`}</p>
            )}
            <label>Ambient Volume: {Math.round(ambientVolume * 100)}%</label>
            <input type="range" min="0" max="1" step="0.05" value={ambientVolume} onChange={(e) => onChangeAmbientVolume(parseFloat(e.target.value))} disabled={!ambientEnabled || !ambientUnlocked} />
          </div>
        </div>
      </div>

      <div className="rewards-list-item" style={{ alignItems: 'stretch', cursor: 'default' }}>
        <div className="rewards-list-icon"><Music2 size={20} /></div>
        <div className="rewards-list-info" style={{ width: '100%' }}>
          <h3>Background Music</h3>
          <p>{musicUnlocked
            ? `${musicRequirement.unlockedCount}/${musicRequirement.totalCount} music packs unlocked.`
            : `First music pack unlocks at ${Number(musicRequirement.requiredXP || 0).toLocaleString()} XP.`}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={musicEnabled} onChange={(e) => onToggleMusic(e.target.checked)} disabled={!musicUnlocked} />
              <span>Enable background music</span>
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <select value={musicPack} onChange={(e) => onChangeMusicPack(e.target.value)} disabled={!musicEnabled || !musicUnlocked} className="settings-select">
                {musicPackOptions.map((pack) => (
                  <option key={pack.id} value={pack.id} disabled={!pack.unlocked}>
                    {`${pack.label} — ${Number(pack.requiredXP || 0).toLocaleString()} XP${pack.unlocked ? '' : ' (Locked)'}`}
                  </option>
                ))}
              </select>
              <button type="button" className="data-button" disabled={!musicEnabled || !currentMusicPackMeta?.unlocked} onClick={onPreviewMusic}>
                Preview
              </button>
            </div>
            <p style={{ margin: 0, opacity: 0.7 }}>{currentMusicPackMeta?.description || 'XP-unlocked background music for browsing GamePilot.'}</p>
            {musicPackProgress.nextUnlock && musicUnlocked && (
              <p style={{ margin: 0, opacity: 0.7 }}>{`Next music pack: ${musicPackProgress.nextUnlock.label} at ${Number(musicPackProgress.nextUnlock.requiredXP || 0).toLocaleString()} XP.`}</p>
            )}
            <label>Music Volume: {Math.round(musicVolume * 100)}%</label>
            <input type="range" min="0" max="1" step="0.05" value={musicVolume} onChange={(e) => onChangeMusicVolume(parseFloat(e.target.value))} disabled={!musicEnabled || !musicUnlocked} />
          </div>
        </div>
      </div>

      <div className="rewards-list-item" style={{ alignItems: 'stretch', cursor: 'default' }}>
        <div className="rewards-list-icon"><PlayCircle size={20} /></div>
        <div className="rewards-list-info" style={{ width: '100%' }}>
          <h3>Button Sound Packs</h3>
          <p>{buttonPackProgress.unlockedCount}/{buttonPackProgress.totalCount} button packs unlocked.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={sfxEnabled} onChange={(e) => onToggleSfx(e.target.checked)} />
              <span>Enable UI button sounds</span>
            </label>
            <select value={buttonSoundPack} onChange={(e) => onChangeButtonPack(e.target.value)} disabled={!sfxEnabled} className="settings-select">
              {buttonPackOptions.map((pack) => (
                <option key={pack.id} value={pack.id} disabled={!pack.unlocked}>
                  {pack.label} {pack.type === 'synth' ? '(Synth)' : '(Sample)'}{` — ${Number(pack.requiredXP || 0).toLocaleString()} XP${pack.unlocked ? '' : ' (Locked)'}`}
                </option>
              ))}
            </select>
            <p style={{ margin: 0, opacity: 0.7 }}>{currentButtonPackMeta?.description || 'Choose from curated sample packs or synth-based clicks.'}</p>
            {!currentButtonPackMeta?.unlocked && (
              <p style={{ margin: 0, opacity: 0.7 }}>{`Unlocks at ${Number(currentButtonPackMeta?.requiredXP || 0).toLocaleString()} XP (${Number(currentButtonPackMeta?.currentXP || 0).toLocaleString()} XP earned).`}</p>
            )}
            {buttonPackProgress.nextUnlock && currentButtonPackMeta?.unlocked && (
              <p style={{ margin: 0, opacity: 0.7 }}>{`Next button pack: ${buttonPackProgress.nextUnlock.label} at ${Number(buttonPackProgress.nextUnlock.requiredXP || 0).toLocaleString()} XP.`}</p>
            )}
            {isSampleButtonPack && currentButtonPackMeta?.unlocked && sampleEntries.length > 0 && (
              <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                {sampleEntries.map((sample) => {
                  const isSelected = currentSampleSelection === sample.file;
                  return (
                    <div key={sample.file} style={{ border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-primary)'}`, borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontWeight: 600 }}>{sample.label}</div>
                      <div style={{ fontSize: '11px', opacity: 0.65, wordBreak: 'break-all' }}>{sample.file}</div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => onPreviewButtonSample(sample.file)} disabled={!sfxEnabled || !currentButtonPackMeta?.unlocked} className="data-button" style={{ flex: 1 }}>
                          Preview
                        </button>
                        <button type="button" onClick={() => onSelectButtonSample(sample.file)} disabled={!sfxEnabled || !currentButtonPackMeta?.unlocked || isSelected} className="data-button" style={{ flex: 1 }}>
                          {isSelected ? 'Selected' : 'Use this sample'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <label>SFX Volume: {Math.round(sfxVolume * 100)}%</label>
            <input type="range" min="0" max="1" step="0.05" value={sfxVolume} onChange={(e) => onChangeSfxVolume(parseFloat(e.target.value))} disabled={!sfxEnabled} />
          </div>
        </div>
      </div>
    </div>
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
  const [presentationCustomization, setPresentationCustomization] = useState(() => ProgressionUnlockService.getRewardPresentationCustomization());
  const [ambientEnabled, setAmbientEnabled] = useState(() => audioManager.getSettings().ambientEnabled);
  const [ambientSoundPack, setAmbientSoundPack] = useState(() => audioManager.getSettings().ambientSoundPack);
  const [ambientVolume, setAmbientVolume] = useState(() => audioManager.getSettings().ambientVolume);
  const [sfxEnabled, setSfxEnabled] = useState(() => audioManager.getSettings().sfxEnabled);
  const [buttonSoundPack, setButtonSoundPack] = useState(() => audioManager.getSettings().buttonSoundPack);
  const [buttonSampleSelection, setButtonSampleSelection] = useState(() => audioManager.getButtonSampleSelection());
  const [sfxVolume, setSfxVolume] = useState(() => audioManager.getSettings().sfxVolume);
  const [musicEnabled, setMusicEnabled] = useState(() => audioManager.getSettings().musicEnabled);
  const [musicPack, setMusicPack] = useState(() => audioManager.getSettings().musicPack);
  const [musicVolume, setMusicVolume] = useState(() => audioManager.getSettings().musicVolume);
  const [ambientUnlocked, setAmbientUnlocked] = useState(() => audioManager.isAmbientUnlocked());
  const [musicUnlocked, setMusicUnlocked] = useState(() => audioManager.isMusicUnlocked());
  const [ambientRequirement, setAmbientRequirement] = useState(() => ProgressionUnlockService.getAmbientRequirement());
  const [musicRequirement, setMusicRequirement] = useState(() => ProgressionUnlockService.getMusicRequirement());
  const [ambientPackOptions, setAmbientPackOptions] = useState(() => audioManager.getAmbientPacks());
  const [musicPackOptions, setMusicPackOptions] = useState(() => audioManager.getMusicPacks());
  const [buttonPackOptions, setButtonPackOptions] = useState(() => audioManager.getButtonPacks());
  
  const summary = useMemo(() => ProgressionUnlockService.getRewardCatalogSummary(), []);
  const nextUnlockPath = summary?.upcomingUnlocks || [];
  const roadmapUnlocks = summary?.nextUnlock ? nextUnlockPath.slice(1) : nextUnlockPath;
  const currentAmbientPackMeta = ambientPackOptions.find((pack) => pack.id === ambientSoundPack) || null;
  const currentMusicPackMeta = musicPackOptions.find((pack) => pack.id === musicPack) || null;
  const currentButtonPackMeta = buttonPackOptions.find((pack) => pack.id === buttonSoundPack) || null;
  const isSampleButtonPack = currentButtonPackMeta?.type === 'sample';
  const currentSampleSelection = buttonSampleSelection[buttonSoundPack] || null;
  const sampleEntries = useMemo(() => (
    isSampleButtonPack && currentButtonPackMeta?.unlocked ? audioManager.getSamplesForPack(buttonSoundPack) : []
  ), [buttonSoundPack, currentButtonPackMeta, isSampleButtonPack]);
  const ambientPackProgress = useMemo(() => ({
    unlockedCount: ambientPackOptions.filter((pack) => pack.unlocked).length,
    totalCount: ambientPackOptions.length,
    nextUnlock: ambientPackOptions.filter((pack) => !pack.unlocked).sort((a, b) => a.requiredXP - b.requiredXP || a.label.localeCompare(b.label))[0] || null
  }), [ambientPackOptions]);
  const musicPackProgress = useMemo(() => ({
    unlockedCount: musicPackOptions.filter((pack) => pack.unlocked).length,
    totalCount: musicPackOptions.length,
    nextUnlock: musicPackOptions.filter((pack) => !pack.unlocked).sort((a, b) => a.requiredXP - b.requiredXP || a.label.localeCompare(b.label))[0] || null
  }), [musicPackOptions]);
  const buttonPackProgress = useMemo(() => ({
    unlockedCount: buttonPackOptions.filter((pack) => pack.unlocked).length,
    totalCount: buttonPackOptions.length,
    nextUnlock: buttonPackOptions.filter((pack) => !pack.unlocked).sort((a, b) => a.requiredXP - b.requiredXP || a.label.localeCompare(b.label))[0] || null
  }), [buttonPackOptions]);
  const nextAudioUnlock = useMemo(() => ([
    ambientPackProgress.nextUnlock ? { ...ambientPackProgress.nextUnlock, category: 'Atmosphere Pack' } : null,
    musicPackProgress.nextUnlock ? { ...musicPackProgress.nextUnlock, category: 'Music Pack' } : null,
    buttonPackProgress.nextUnlock ? { ...buttonPackProgress.nextUnlock, category: buttonPackProgress.nextUnlock.type === 'synth' ? 'Button Synth' : 'Button SFX' } : null
  ].filter(Boolean).sort((a, b) => a.requiredXP - b.requiredXP || a.label.localeCompare(b.label))[0] || null), [ambientPackProgress, musicPackProgress, buttonPackProgress]);
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
    setPresentationCustomization(ProgressionUnlockService.getRewardPresentationCustomization());
  }, []);
  const refreshAudioRewards = useCallback(() => {
    const settings = audioManager.getSettings();
    setAmbientEnabled(settings.ambientEnabled);
    setAmbientSoundPack(settings.ambientSoundPack);
    setAmbientVolume(settings.ambientVolume);
    setSfxEnabled(settings.sfxEnabled);
    setButtonSoundPack(settings.buttonSoundPack);
    setButtonSampleSelection(audioManager.getButtonSampleSelection());
    setSfxVolume(settings.sfxVolume);
    setMusicEnabled(settings.musicEnabled);
    setMusicPack(settings.musicPack);
    setMusicVolume(settings.musicVolume);
    setAmbientUnlocked(audioManager.isAmbientUnlocked());
    setMusicUnlocked(audioManager.isMusicUnlocked());
    setAmbientRequirement(ProgressionUnlockService.getAmbientRequirement());
    setMusicRequirement(ProgressionUnlockService.getMusicRequirement());
    setAmbientPackOptions(audioManager.getAmbientPacks());
    setMusicPackOptions(audioManager.getMusicPacks());
    setButtonPackOptions(audioManager.getButtonPacks());
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
      audioRewards: { current: ambientPackProgress.unlockedCount + musicPackProgress.unlockedCount + buttonPackProgress.unlockedCount, total: ambientPackProgress.totalCount + musicPackProgress.totalCount + buttonPackProgress.totalCount },
      logoAnimation: { current: availableAnims, total: logoAnimations.length }
    };
  }, [ambientPackProgress, buttonPackProgress, cardStyles, homeLayouts, libraryVariants, logoAnimations, musicPackProgress, recommendationPacks]);

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

  const handleAmbientToggle = useCallback((enabled) => {
    audioManager.setAmbientEnabled(enabled);
    refreshAudioRewards();
  }, [refreshAudioRewards]);
  const handleAmbientPackChange = useCallback((packId) => {
    audioManager.setAmbientPack(packId);
    refreshAudioRewards();
  }, [refreshAudioRewards]);
  const handleAmbientVolumeChange = useCallback((value) => {
    audioManager.setAmbientVolume(value);
    refreshAudioRewards();
  }, [refreshAudioRewards]);
  const handlePreviewAmbient = useCallback(() => {
    if (ambientSoundPack === 'dynamic' || !currentAmbientPackMeta?.unlocked) return;
    audioManager.previewAmbient(ambientSoundPack);
  }, [ambientSoundPack, currentAmbientPackMeta]);
  const handleSfxToggle = useCallback((enabled) => {
    audioManager.setSfxEnabled(enabled);
    refreshAudioRewards();
  }, [refreshAudioRewards]);
  const handleButtonPackChange = useCallback((packId) => {
    audioManager.setButtonPack(packId);
    refreshAudioRewards();
  }, [refreshAudioRewards]);
  const handleSfxVolumeChange = useCallback((value) => {
    audioManager.setSfxVolume(value);
    refreshAudioRewards();
  }, [refreshAudioRewards]);
  const handlePreviewButtonSample = useCallback((file) => {
    audioManager.previewButtonSample(buttonSoundPack, file);
  }, [buttonSoundPack]);
  const handleSelectButtonSample = useCallback((file) => {
    audioManager.setButtonSampleSelection(buttonSoundPack, file);
    refreshAudioRewards();
  }, [buttonSoundPack, refreshAudioRewards]);
  const handleMusicToggle = useCallback((enabled) => {
    audioManager.setMusicEnabled(enabled);
    refreshAudioRewards();
  }, [refreshAudioRewards]);
  const handleMusicPackChange = useCallback((packId) => {
    audioManager.setMusicPack(packId);
    refreshAudioRewards();
  }, [refreshAudioRewards]);
  const handleMusicVolumeChange = useCallback((value) => {
    audioManager.setMusicVolume(value);
    refreshAudioRewards();
  }, [refreshAudioRewards]);
  const handlePreviewMusic = useCallback(() => {
    if (!currentMusicPackMeta?.unlocked) return;
    audioManager.previewMusicPack(musicPack);
  }, [currentMusicPackMeta, musicPack]);

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
      case 'audioRewards':
        return <AudioRewardsPanel
          ambientEnabled={ambientEnabled}
          ambientSoundPack={ambientSoundPack}
          ambientVolume={ambientVolume}
          musicEnabled={musicEnabled}
          musicPack={musicPack}
          musicVolume={musicVolume}
          sfxEnabled={sfxEnabled}
          sfxVolume={sfxVolume}
          buttonSoundPack={buttonSoundPack}
          currentAmbientPackMeta={currentAmbientPackMeta}
          currentMusicPackMeta={currentMusicPackMeta}
          currentButtonPackMeta={currentButtonPackMeta}
          ambientUnlocked={ambientUnlocked}
          musicUnlocked={musicUnlocked}
          ambientRequirement={ambientRequirement}
          musicRequirement={musicRequirement}
          ambientPackOptions={ambientPackOptions}
          musicPackOptions={musicPackOptions}
          buttonPackOptions={buttonPackOptions}
          ambientPackProgress={ambientPackProgress}
          musicPackProgress={musicPackProgress}
          buttonPackProgress={buttonPackProgress}
          nextAudioUnlock={nextAudioUnlock}
          isSampleButtonPack={isSampleButtonPack}
          sampleEntries={sampleEntries}
          currentSampleSelection={currentSampleSelection}
          onToggleAmbient={handleAmbientToggle}
          onChangeAmbientPack={handleAmbientPackChange}
          onChangeAmbientVolume={handleAmbientVolumeChange}
          onPreviewAmbient={handlePreviewAmbient}
          onToggleSfx={handleSfxToggle}
          onChangeButtonPack={handleButtonPackChange}
          onChangeSfxVolume={handleSfxVolumeChange}
          onPreviewButtonSample={handlePreviewButtonSample}
          onSelectButtonSample={handleSelectButtonSample}
          onToggleMusic={handleMusicToggle}
          onChangeMusicPack={handleMusicPackChange}
          onChangeMusicVolume={handleMusicVolumeChange}
          onPreviewMusic={handlePreviewMusic}
        />;
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
              { id: 'cardStyles', label: 'Card Styles', icon: Gamepad2 },
              { id: 'libraryView', label: 'Library View', icon: Library },
              { id: 'homeLayout', label: 'Home Layout', icon: LayoutGrid },
              { id: 'recommendationStyle', label: 'Recommendation Style', icon: Zap },
              { id: 'audioRewards', label: 'Audio Rewards', icon: Waves },
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
