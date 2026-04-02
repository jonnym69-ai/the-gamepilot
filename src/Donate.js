import React, { useState, useRef, useMemo } from 'react';
import { Heart, Coffee, ExternalLink, Play, Star, Crown, Gem, Trophy, Check, AlertCircle, Key, Download, Upload, FileText, Sparkles, Shield } from 'lucide-react';
import NavBar from './NavBar';
import { AchievementTracker } from './AchievementSystem';
import CollapsibleSection from './components/CollapsibleSection';
import { openExternalUrl } from './services/ElectronBridge';
import './Donate.css';

const TIER_LABEL_MAP = {
  Bronze: 'Bronze Patreon Supporter',
  Silver: 'Silver Patreon Supporter',
  Gold: 'Gold Patreon Supporter',
  Platinum: 'Platinum Patreon Supporter'
};

const LEGACY_PATREON_CODES = {
  'GP4001': { tier: 'Platinum', contribution: 'Platinum Patreon Supporter' },
  'GP4002': { tier: 'Platinum', contribution: 'Platinum Patreon Supporter' },
  'GP4003': { tier: 'Platinum', contribution: 'Platinum Patreon Supporter' },
  'GP4004': { tier: 'Platinum', contribution: 'Platinum Patreon Supporter' },
  'GP4005': { tier: 'Platinum', contribution: 'Platinum Patreon Supporter' },
  'GP1001': { tier: 'Gold', contribution: 'Gold Patreon Supporter' },
  'GP1002': { tier: 'Gold', contribution: 'Gold Patreon Supporter' },
  'GP1003': { tier: 'Gold', contribution: 'Gold Patreon Supporter' },
  'GP1004': { tier: 'Gold', contribution: 'Gold Patreon Supporter' },
  'GP1005': { tier: 'Gold', contribution: 'Gold Patreon Supporter' },
  'GP2001': { tier: 'Silver', contribution: 'Silver Patreon Supporter' },
  'GP2002': { tier: 'Silver', contribution: 'Silver Patreon Supporter' },
  'GP2003': { tier: 'Silver', contribution: 'Silver Patreon Supporter' },
  'GP2004': { tier: 'Silver', contribution: 'Silver Patreon Supporter' },
  'GP2005': { tier: 'Silver', contribution: 'Silver Patreon Supporter' },
  'GP3001': { tier: 'Bronze', contribution: 'Bronze Patreon Supporter' },
  'GP3002': { tier: 'Bronze', contribution: 'Bronze Patreon Supporter' },
  'GP3003': { tier: 'Bronze', contribution: 'Bronze Patreon Supporter' },
  'GP3004': { tier: 'Bronze', contribution: 'Bronze Patreon Supporter' },
  'GP3005': { tier: 'Bronze', contribution: 'Bronze Patreon Supporter' }
};

function Donate({ theme }) {
  const [patreonCode, setPatreonCode] = useState('');
  const [founderName, setFounderName] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const codeFormRef = useRef(null);
  const fileInputRef = useRef(null);

  const canonicalPatreonCodes = useMemo(() => {
    const codes = {};
    const boostCatalog = AchievementTracker.getPatreonBoostCatalog();
    Object.entries(boostCatalog).forEach(([code, meta]) => {
      const tier = meta?.tier && TIER_LABEL_MAP[meta.tier] ? meta.tier : 'Bronze';
      codes[code.toUpperCase()] = {
        tier,
        contribution: TIER_LABEL_MAP[tier] || 'Patreon Supporter'
      };
    });
    return codes;
  }, []);

  const validPatreonCodes = useMemo(() => ({
    ...LEGACY_PATREON_CODES,
    ...canonicalPatreonCodes
  }), [canonicalPatreonCodes]);

  const officialUpdatesUrl = 'https://moz91.itch.io/';

  const supportLinks = [
    {
      name: 'Patreon',
      url: 'https://www.patreon.com/15465959/join',
      description: 'Become a patron',
      icon: <Heart size={24} />
    },
    {
      name: 'Buy Me a Coffee',
      url: 'https://buymeacoffee.com/GamepilotDev',
      description: 'Buy me a coffee',
      icon: <Coffee size={24} />
    },
    {
      name: 'YouTube',
      url: 'https://youtube.com/@mozmakesstuff?si=VKNpHeMBWJcTStFd',
      description: 'Subscribe for updates',
      icon: <Play size={24} />
    },
    {
      name: 'itch.io',
      url: officialUpdatesUrl,
      description: 'Download builds & version notes',
      icon: <FileText size={24} />
    }
  ];

  const staticFounders = [
    {
      name: "Moz",
      tier: "Platinum",
      date: "2026-01-15",
      contribution: "Lead Developer & Project Founder"
    },
    {
      name: "Dom",
      tier: "Platinum",
      date: "2026-01-20",
      contribution: "Community Supporter & Beta Tester"
    },
    {
      name: "Yasmin",
      tier: "Platinum",
      date: "2026-01-25",
      contribution: "Family Founder"
    },
    {
      name: "Jenson",
      tier: "Platinum",
      date: "2026-01-25",
      contribution: "Family Founder"
    },
    {
      name: "Jackson",
      tier: "Platinum",
      date: "2026-01-25",
      contribution: "Family Founder"
    },
    {
      name: "Esmae",
      tier: "Platinum",
      date: "2026-01-25",
      contribution: "Family Founder"
    },
    {
      name: "Penelope",
      tier: "Platinum",
      date: "2026-01-25",
      contribution: "Family Founder"
    },
    {
      name: "Dudley",
      tier: "Platinum",
      date: "2026-01-25",
      contribution: "Family Founder"
    },
    {
      name: "Winnie",
      tier: "Platinum",
      date: "2026-01-25",
      contribution: "Family Founder"
    }
  ];

  const userFounders = JSON.parse(localStorage.getItem('userFounders') || '[]');

  // Founders data - merge static founders with user-added Patreon supporters
  const founders = [
    ...staticFounders,
    ...userFounders
  ];

  const tierOrder = ['Platinum', 'Gold', 'Silver', 'Bronze'];
  const tierBreakdown = tierOrder.map(tier => ({
    tier,
    count: founders.filter(founder => founder.tier === tier).length
  }));

  const founderStats = [
    { label: 'Founding Members', value: founders.length.toString() },
    { label: 'Founder Codes Redeemed', value: userFounders.length.toString() },
    { label: 'Progression Model', value: 'Play to unlock • Local-first' }
  ];

  const tierPriceMap = {
    Bronze: '£3/mo',
    Silver: '£5/mo',
    Gold: '£8/mo',
    Platinum: '£10/mo'
  };

  const tierCheckoutLinks = {
    Bronze: 'https://www.patreon.com/checkout/GamePilot?rid=27801627&vanity=15465959',
    Silver: 'https://www.patreon.com/checkout/GamePilot?rid=27792237&vanity=15465959',
    Gold: 'https://www.patreon.com/checkout/GamePilot?rid=28142503&vanity=15465959',
    Platinum: 'https://www.patreon.com/checkout/GamePilot?rid=27792268&vanity=15465959'
  };

  const tierPerks = [
    {
      tier: 'Bronze',
      summary: 'Bronze support activates a 2x XP multiplier and adds your name to the Founders Wall.',
      checkoutUrl: tierCheckoutLinks.Bronze
    },
    {
      tier: 'Silver',
      summary: 'Silver support upgrades your progression to a 3x XP multiplier with Silver founder recognition.',
      checkoutUrl: tierCheckoutLinks.Silver
    },
    {
      tier: 'Gold',
      summary: 'Gold support grants a 4x XP multiplier and Gold founder recognition across the app.',
      checkoutUrl: tierCheckoutLinks.Gold
    },
    {
      tier: 'Platinum',
      summary: 'Platinum support maxes out progression at 5x XP and highlights you as a Platinum founder.',
      checkoutUrl: tierCheckoutLinks.Platinum
    }
  ];

  const tierBenefits = {
    Platinum: ['5x XP boost multiplier', 'Platinum founder recognition on the Founders Wall', 'Supports new local-first polish and reward drops'],
    Gold: ['4x XP boost multiplier', 'Gold founder recognition on the Founders Wall', 'Supports new progression rewards and identity features'],
    Silver: ['3x XP boost multiplier', 'Silver founder recognition on the Founders Wall', 'Supports ongoing cockpit polish and quality-of-life updates'],
    Bronze: ['2x XP boost multiplier', 'Bronze founder recognition on the Founders Wall', 'Supports ongoing local-first development']
  };

  const scrollToCodeForm = () => {
    if (codeFormRef.current) {
      const detailsElement = codeFormRef.current.querySelector('details');
      if (detailsElement) {
        detailsElement.open = true;
      }
      codeFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getTierIcon = (tier) => {
    switch(tier) {
      case 'Platinum': return <Crown size={20} />;
      case 'Gold': return <Trophy size={20} />;
      case 'Silver': return <Star size={20} />;
      case 'Bronze': return <Gem size={20} />;
      default: return <Heart size={20} />;
    }
  };

  const getTierColor = (tier) => {
    switch(tier) {
      case 'Platinum': return 'linear-gradient(45deg, #e5e5e5, #ffffff)';
      case 'Gold': return 'linear-gradient(45deg, #ffd700, #ffed4e)';
      case 'Silver': return 'linear-gradient(45deg, #c0c0c0, #e8e8e8)';
      case 'Bronze': return 'linear-gradient(45deg, #cd7f32, #e8a55d)';
      default: return 'linear-gradient(45deg, #ff6b35, #ff8c42)';
    }
  };

  const handleLinkClick = async (url) => {
    try {
      await openExternalUrl(url);
    } catch (error) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Function to validate Patreon code and add founder
  const validateAndAddFounder = () => {
    if (!patreonCode.trim()) {
      setValidationMessage('Please enter a Patreon code');
      setValidationSuccess(false);
      return;
    }

    if (!founderName.trim()) {
      setValidationMessage('Please enter your display name');
      setValidationSuccess(false);
      return;
    }

    setIsValidating(true);
    setValidationMessage('');

    // Simulate API call delay
    setTimeout(() => {
      const normalizedCode = patreonCode.toUpperCase().trim();
      const codeData = validPatreonCodes[normalizedCode];
      
      if (codeData) {
        // Check if this code has already been used
        const existingFounders = JSON.parse(localStorage.getItem('userFounders') || '[]');
        const codeAlreadyUsed = existingFounders.some(founder => 
          founder.code === normalizedCode
        );
        
        if (codeAlreadyUsed) {
          setValidationMessage('This code has already been used!');
          setValidationSuccess(false);
        } else {
          const boostMeta = AchievementTracker.validatePatreonBoostCode(normalizedCode);
          let boostMessage = '';

          if (boostMeta) {
            const boostResult = AchievementTracker.activatePatreonXPBoost(normalizedCode);
            if (boostResult.success) {
              boostMessage = ` XP boost ${boostResult.multiplierLabel || `${boostResult.multiplier}x`} activated.`;
            } else {
              boostMessage = ` ${boostResult.message}`;
            }
          } else {
            boostMessage = ' Legacy founder code redeemed for Hall of Fame recognition.';
          }

          // Add user as founder with custom name
          const newFounder = {
            name: founderName.trim(),
            tier: codeData.tier,
            date: new Date().toISOString().split('T')[0],
            contribution: codeData.contribution,
            code: normalizedCode
          };
          
          existingFounders.push(newFounder);
          localStorage.setItem('userFounders', JSON.stringify(existingFounders));
          
          setValidationMessage(`Welcome to the founders club! You've been added as a ${codeData.tier} founder.${boostMessage}`);
          setValidationSuccess(true);
          setPatreonCode('');
          setFounderName('');
          
          // Trigger page refresh to show new founder
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
      } else {
        setValidationMessage('Invalid Patreon code. Please check your welcome message and try again.');
        setValidationSuccess(false);
      }
      
      setIsValidating(false);
    }, 1000);
  };

  // Export founders data as JSON file
  const exportFoundersData = () => {
    // Get all founders (static + user-added)
    const allFounders = [
      ...staticFounders,
      ...JSON.parse(localStorage.getItem('userFounders') || '[]')
    ];

    const exportData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      totalFounders: allFounders.length,
      founders: allFounders
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gamepilot-founders-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    setImportMessage('Founders data exported successfully!');
    setTimeout(() => setImportMessage(''), 3000);
  };

  // Handle file drop for importing founders data
  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const importData = JSON.parse(event.target.result);
            
            // Validate import data structure
            if (!importData.founders || !Array.isArray(importData.founders)) {
              setImportMessage('Invalid file format. Expected founders array.');
              return;
            }
            
            // Validate each founder has required fields
            const validFounders = importData.founders.filter(founder => 
              founder.name && founder.tier && founder.date && founder.contribution
            );
            
            if (validFounders.length !== importData.founders.length) {
              setImportMessage('Some founders data is invalid. Only valid entries will be imported.');
            }
            
            // Separate static founders from user-added ones
            // Filter out user-added founders that match static ones
            const userFounders = validFounders.filter(founder => 
              !staticFounders.some(staticFounder => staticFounder.name === founder.name)
            );
            
            // Save user founders
            localStorage.setItem('userFounders', JSON.stringify(userFounders));
            
            setImportMessage(`Successfully imported ${userFounders.length} founder entries!`);
            setTimeout(() => {
              window.location.reload(); // Refresh to show new founders
            }, 2000);
            
          } catch (error) {
            setImportMessage('Error parsing JSON file. Please check the file format.');
          }
        };
        reader.readAsText(file);
      } else {
        setImportMessage('Please drop a valid JSON file.');
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const fakeEvent = {
      preventDefault: () => {},
      dataTransfer: { files: [file] }
    };
    handleFileDrop(fakeEvent);
  };

  return (
    <div className={`App ${theme}`}>
      <NavBar />
      <div className="donate-container">
        <section className="founder-hero">
          <div className="hero-text">
            <div className="hero-badge">
              <Sparkles size={16} /> Founder Recognition & XP Boosts
            </div>
            <h1>Help build the cockpit gamers actually want.</h1>
            <p>
              Progression unlocks content through playtime and achievements. Patreon codes add optional XP boosts, while founders get permanent recognition on the Hall of Fame wall.
            </p>
            <div className="hero-actions">
              <button className="hero-primary" onClick={scrollToCodeForm}>
                Redeem Patreon Code
              </button>
              <button className="hero-secondary" onClick={() => handleLinkClick(supportLinks[0].url)}>
                Visit Patreon
              </button>
            </div>
            <div className="hero-stats-grid">
              {founderStats.map((stat, index) => (
                <div key={stat.label} className="hero-stat-card">
                  <Shield size={16} />
                  <div>
                    <span>{stat.label}</span>
                    <strong>{stat.value}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hero-card">
            <h3>Supporter Benefits</h3>
            <ul>
              <li>Optional XP boost multipliers from Patreon codes</li>
              <li>Founder Hall recognition with your display name</li>
              <li>Support helps fund new themes, audio, and polish for everyone</li>
              <li>Everything still unlocks through play inside the app</li>
            </ul>
            <p>Everything is stored locally. No accounts. No telemetry. Just your cockpit.</p>
          </div>
        </section>

        <div className="support-links">
          {supportLinks.map((link, index) => (
            <div key={index} className="support-card" onClick={() => handleLinkClick(link.url)}>
              <div className="support-icon">
                {link.icon}
              </div>
              <div className="support-info">
                <h3>{link.name}</h3>
                <p>{link.description}</p>
              </div>
              <ExternalLink size={16} className="external-icon" />
            </div>
          ))}
        </div>

        <div className="updates-cta">
          <div className="updates-copy">
            <div className="updates-pill">
              <Sparkles size={14} /> Release Channel
            </div>
            <h3>Need the latest build, support notes, or version info?</h3>
            <p>
              The itch.io hub is the source of truth for GamePilot releases, troubleshooting posts, and
              detailed about/version changelogs. Bookmark it to stay in sync with every cockpit drop.
            </p>
          </div>
          <button className="updates-button" onClick={() => handleLinkClick(officialUpdatesUrl)}>
            Open itch.io Hub
            <ExternalLink size={16} />
          </button>
        </div>

        <CollapsibleSection
          title="Supporter Tiers & XP Boosts"
          subtitle="Optional Patreon multipliers, founder recognition, and local-only supporter rewards."
          badge={`${tierPerks.length} tiers`}
          icon={<Heart size={18} />}
          className="donate-folder"
        >
          <section className="founder-feature-section tier-perks">
            <div className="feature-heading">
              <h2>Supporter Tiers & XP Boosts</h2>
              <p>
                Progression unlocks themes, audio, and presentation rewards through XP for everyone. Patreon tiers add optional
                XP boost multipliers, founder recognition, and help fund new content without bypassing the progression system.
                100% local — no online accounts, ever.
              </p>
            </div>
            <div className="tier-perks-grid">
              {tierPerks.map((tierInfo) => (
                <div key={tierInfo.tier} className={`tier-perk-card ${tierInfo.tier.toLowerCase()}`}>
                  <div className="tier-card-header">
                    <div>
                      <h3>{tierInfo.tier} Founder</h3>
                      <p>{tierInfo.summary}</p>
                    </div>
                    <span className="tier-price">{tierPriceMap[tierInfo.tier]}</span>
                  </div>
                  <button
                    className="tier-cta"
                    onClick={() => handleLinkClick(tierInfo.checkoutUrl)}
                  >
                    Support at {tierInfo.tier}
                    <ExternalLink size={16} />
                  </button>

                  <div className="tier-section">
                    <div className="tier-section-title">Included with this tier</div>
                    <ul className="tier-benefit-list">
                      {tierBenefits[tierInfo.tier].map((benefit) => (
                        <li key={benefit}>{benefit}</li>
                      ))}
                    </ul>
                    <p className="tier-note">All themes, audio packs, and presentation rewards still unlock through play inside the app.</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </CollapsibleSection>

        {/* Become a Founder Section */}
        <div ref={codeFormRef}>
          <CollapsibleSection
            title="Redeem Founder / Patreon Code"
            subtitle="Join the founders wall and activate any included XP multiplier from your code."
            badge={validationSuccess ? 'Code accepted' : 'Redeem code'}
            icon={<Key size={18} />}
            className="donate-folder"
          >
            <div className="become-founder-section">
              <h2><Key size={24} /> Redeem Founder / Patreon Code</h2>
              <p className="founder-signup-intro">
                Redeem your code to join the founders wall.
                Patreon XP boost codes also activate your progression multiplier.
              </p>

              <div className="code-entry-form">
                <div className="code-input-group">
                  <label htmlFor="founder-name">Display Name</label>
                  <input
                    id="founder-name"
                    type="text"
                    value={founderName}
                    onChange={(e) => setFounderName(e.target.value)}
                    placeholder="Your display name"
                    className="code-input"
                    disabled={isValidating}
                    maxLength={30}
                  />
                </div>

                <div className="code-input-group">
                  <label htmlFor="patreon-code">Patreon Code</label>
                  <div className="code-input-wrapper">
                    <input
                      id="patreon-code"
                      type="text"
                      value={patreonCode}
                      onChange={(e) => setPatreonCode(e.target.value.toUpperCase())}
                      placeholder="THEME8_2026"
                      className="code-input"
                      disabled={isValidating}
                      maxLength={30}
                    />
                    <button
                      onClick={validateAndAddFounder}
                      disabled={isValidating || !patreonCode.trim() || !founderName.trim()}
                      className="validate-button"
                    >
                      {isValidating ? 'Validating...' : 'Validate Code'}
                    </button>
                  </div>
                </div>

                {validationMessage && (
                  <div className={`validation-message ${validationSuccess ? 'success' : 'error'}`}>
                    {validationSuccess ? <Check size={16} /> : <AlertCircle size={16} />}
                    <span>{validationMessage}</span>
                  </div>
                )}

                <div className="code-info">
                  <h4>How to get your code:</h4>
                  <ol>
                    <li>Subscribe to our <a href="https://patreon.com/GamePilot" target="_blank" rel="noopener noreferrer">Patreon</a></li>
                    <li>Check your welcome email/message for your unique founder code</li>
                    <li>Enter your display name and code above</li>
                    <li>Click "Validate Code" to join the founders wall and activate XP boosts (if included)</li>
                  </ol>
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Founders Section */}
        <CollapsibleSection
          title="GamePilot Founders"
          subtitle="Browse the founders wall, contribution tiers, and supporter recognition."
          badge={`${founders.length} founders`}
          icon={<Trophy size={18} />}
          className="donate-folder"
        >
          <div className="founders-section">
            <h2>🏆 GamePilot Founders</h2>
            <p className="founders-intro">
              Special thanks to our founding members who made GamePilot possible!
              Their support helps us continue developing and improving your favorite gaming library manager.
            </p>
            
            {founders.length > 0 ? (
              <div className="founders-grid">
                {founders.map((founder, index) => (
                  <div key={index} className="founder-card" style={{ background: getTierColor(founder.tier) }}>
                    <div className="founder-header">
                      <div className="founder-icon">
                        {getTierIcon(founder.tier)}
                      </div>
                      <div className="founder-tier">{founder.tier}</div>
                    </div>
                    <div className="founder-info">
                      <h3>{founder.name}</h3>
                      <p className="founder-contribution">{founder.contribution}</p>
                      <p className="founder-date">Since {new Date(founder.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-founders">
                <p>Be the first to become a GamePilot Founder!</p>
                <p>Your support will be featured here for all to see.</p>
              </div>
            )}

            <div className="tier-breakdown">
              {tierBreakdown.map(({ tier, count }) => (
                <div key={tier} className="tier-breakdown-card">
                  <div className="tier-breakdown-count">{count || '—'}</div>
                  <div className="tier-breakdown-info">
                    <div className="tier-breakdown-label">
                      {getTierIcon(tier)} {tier} Tier
                    </div>
                    <ul>
                      {tierBenefits[tier].map((benefit) => (
                        <li key={benefit}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            <div className="founders-footer">
              <h3>🌟 Become a Founder</h3>
              <p>
                Founders receive special recognition and help shape the future of GamePilot.
                All supporters are featured here based on their contribution level.
              </p>
              <div className="tier-info">
                <div className="tier-item">
                  <Crown size={16} /> <strong>Platinum:</strong> Major contributors
                </div>
                <div className="tier-item">
                  <Trophy size={16} /> <strong>Gold:</strong> Generous supporters
                </div>
                <div className="tier-item">
                  <Star size={16} /> <strong>Silver:</strong> Regular contributors
                </div>
                <div className="tier-item">
                  <Gem size={16} /> <strong>Bronze:</strong> Appreciated supporters
                </div>
              </div>

              {/* Admin Data Management Section */}
              <CollapsibleSection
                title="Admin: Founders Data Management"
                subtitle="Export or import founders wall data from local JSON files."
                badge="Import / export"
                icon={<FileText size={18} />}
                className="donate-folder donate-subfolder"
              >
                <div className="admin-data-section">
                  <h4><FileText size={16} /> Admin: Founders Data Management</h4>
                  <div className="data-management-controls">
                    <button onClick={exportFoundersData} className="data-button export">
                      <Download size={16} />
                      Export Founders Data
                    </button>
                    
                    <div 
                      className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
                      onDrop={handleFileDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={24} />
                      <p>Drop founders JSON file here to import</p>
                      <small>Or click to select file</small>
                      <input 
                        type="file" 
                        accept=".json" 
                        ref={fileInputRef}
                        onChange={handleFileInputChange}
                        style={{ display: 'none' }}
                      />
                    </div>
                  </div>
                  
                  {importMessage && (
                    <div className={`import-message ${importMessage.includes('success') ? 'success' : 'error'}`}>
                      {importMessage.includes('success') ? <Check size={16} /> : <AlertCircle size={16} />}
                      <span>{importMessage}</span>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            </div>
          </div>
        </CollapsibleSection>

        <div className="donate-footer">
          <p>
            Your support helps maintain GamePilot and develop new features like:
          </p>
          <ul>
            <li>Advanced game recommendations</li>
            <li>Cross-platform game library sync</li>
            <li>Performance optimizations</li>
            <li>Mobile app version</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Donate;
