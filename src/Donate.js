import React, { useState, useRef, useMemo } from 'react';
import { Heart, ExternalLink, Play, Star, Crown, Gem, Trophy, Check, AlertCircle, Key, Sparkles, Shield, Palette, FileText, Database } from 'lucide-react';
import NavBar from './NavBar';
import { AchievementTracker } from './AchievementSystem';
import CollapsibleSection from './components/CollapsibleSection';
import { openExternalUrl } from './services/ElectronBridge';
import StorageService from './services/StorageService';
import EntitlementService from './services/EntitlementService';
import './Donate.css';

const TIER_LABEL_MAP = {
  Bronze: 'Bronze Patreon Supporter',
  Silver: 'Silver Patreon Supporter',
  Gold: 'Gold Patreon Supporter',
  Platinum: 'Platinum Patreon Supporter'
};

const LEGACY_PATREON_CODES = {
  'GP100': { tier: 'Platinum', contribution: 'First 100 Founder' },
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
  const [isValidating, setIsValidating] = useState(false);
  const [unifiedCode, setUnifiedCode] = useState('');
  const [founderName, setFounderName] = useState('');
  const [unifiedMessage, setUnifiedMessage] = useState('');
  const [unifiedSuccess, setUnifiedSuccess] = useState(false);
  const codeFormRef = useRef(null);

  const canonicalPatreonCodes = useMemo(() => {
    const codes = {};
    const boostCatalog = AchievementTracker.getPatreonBoostCatalog() || {};
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
      name: 'YouTube',
      url: 'https://youtube.com/@mozog91?si=rJyzBqLF3-4arDhU',
      description: 'Subscribe for updates',
      icon: <Play size={24} />
    },
    {
      name: 'itch.io',
      url: officialUpdatesUrl,
      description: 'Donate, download builds, and view updates',
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

  const userFounders = StorageService.get('userFounders', []);

  // Founders data - merge static founders with user-added Patreon supporters
  const founders = [
    ...staticFounders,
    ...userFounders
  ];

  const savedUsername = StorageService.getString('profileUsername', '');
  const activeBoostProfile = AchievementTracker.getPatreonBoostProfile() || null;
  const currentFounder = founders.find((founder) => founder.name?.toLowerCase() === savedUsername.trim().toLowerCase()) || null;
  const effectiveTier = currentFounder?.tier || activeBoostProfile?.tier || null;
  const loungeUnlocked = EntitlementService.isSupporter() || Boolean(effectiveTier);
  const xpMultiplierLabel = activeBoostProfile?.multiplier > 1 ? `${activeBoostProfile.multiplier}x XP boost active` : 'No XP boost active';

  const supportOptions = [
    {
      id: 'one-time',
      name: 'Choose Your Amount',
      price: 'Pay what you want',
      priceNote: 'choose on itch.io',
      description: 'Every GamePilot feature stays free. If the app helps you, choose any one-time amount you feel comfortable contributing.',
      icon: <Heart size={28} />,
      highlight: false,
      cta: 'Donate What You Want',
      url: officialUpdatesUrl
    }
  ];

  const allPerks = [
    {
      title: 'Better Recommendations',
      description: 'Support continued work on smarter play-next decisions, recommendation learning, and more reliable explanations.',
      icon: <Sparkles size={22} />,
      tags: ['Recommendations', 'Learning', 'Backlog help']
    },
    {
      title: 'Library Reliability',
      description: 'Help improve launcher scanning, session tracking, metadata quality, backups, and compatibility across more libraries.',
      icon: <Database size={22} />,
      tags: ['Scanning', 'Tracking', 'Metadata']
    },
    {
      title: 'Polish & Accessibility',
      description: 'Fund continued interface polish, controller support, responsive layouts, accessibility, and desktop reliability.',
      icon: <Palette size={22} />,
      tags: ['Polish', 'Accessibility', 'Desktop']
    },
    {
      title: 'Independent Development',
      description: 'Give GamePilot more time to grow without ads, subscriptions, or artificial feature restrictions.',
      icon: <Heart size={22} />,
      tags: ['No ads', 'No subscription', 'Independent']
    }
  ];

  const founderStats = [
    { label: 'Supporters', value: founders.length.toString() },
    { label: 'Your Status', value: loungeUnlocked ? 'Recognized supporter' : 'Optional support' },
    { label: 'Model', value: 'Pay what you want · Everything free' }
  ];

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

  const redeemUnifiedCode = () => {
    const code = unifiedCode.trim().toUpperCase();
    if (!code) {
      setUnifiedMessage('Please enter a code');
      setUnifiedSuccess(false);
      return;
    }

    setIsValidating(true);
    setUnifiedMessage('');

    setTimeout(() => {
      const codeData = validPatreonCodes[code];
      if (codeData) {
        const existingFounders = StorageService.get('userFounders', []);
        const codeAlreadyUsed = existingFounders.some(founder => founder.code === code);

        if (codeAlreadyUsed) {
          setUnifiedMessage('This code has already been used!');
          setUnifiedSuccess(false);
        } else {
          const boostMeta = AchievementTracker.validatePatreonBoostCode(code) || null;
          let boostMessage = '';
          if (boostMeta) {
            const boostResult = AchievementTracker.activatePatreonXPBoost(code);
            if (boostResult.success) {
              boostMessage = ` XP boost ${boostResult.multiplierLabel || `${boostResult.multiplier}x`} activated.`;
            } else {
              boostMessage = ` ${boostResult.message}`;
            }
          } else {
            boostMessage = ' Legacy founder code redeemed for Hall of Fame recognition.';
          }

          // Add user as founder
          const newFounder = {
            name: founderName.trim() || 'Anonymous',
            tier: codeData.tier,
            date: new Date().toISOString().split('T')[0],
            contribution: codeData.contribution,
            code
          };
          existingFounders.push(newFounder);
          StorageService.set('userFounders', existingFounders);

          setUnifiedMessage(`Welcome to the founders club! You've been added as a ${codeData.tier} founder.${boostMessage}`);
          setUnifiedSuccess(true);
          setUnifiedCode('');
          setFounderName('');

          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
        setIsValidating(false);
        return;
      }

      // 3. Nothing matched
      setUnifiedMessage('Invalid code. Please check your code and try again.');
      setUnifiedSuccess(false);
      setIsValidating(false);
    }, 800);
  };

  return (
    <div className={`App ${theme}`}>
      <NavBar />
      <div className="donate-container">
        {/* Hero */}
        <section className="donate-hero">
          <div className="donate-hero-text">
            <div className="hero-badge">
              <Sparkles size={16} /> Support GamePilot
            </div>
            <h1>Everything is free. Support is optional.</h1>
            <p>
              GamePilot does not lock features behind donations. If it helps you decide what to play
              or makes your library more useful, you can contribute any one-time amount you choose.
              No subscription is required, there are no feature tiers, and there is no pressure to pay.
            </p>
          </div>

          {/* Pricing cards */}
          <div className="donate-pricing-grid">
            {supportOptions.map((opt) => (
              <div key={opt.id} className={`donate-price-card ${opt.highlight ? 'highlighted' : ''}`}>
                {opt.highlight && <div className="donate-price-badge">Best value</div>}
                <div className="donate-price-icon">{opt.icon}</div>
                <h3>{opt.name}</h3>
                <div className="donate-price-amount">
                  <span className="donate-price-value">{opt.price}</span>
                  <span className="donate-price-note">{opt.priceNote}</span>
                </div>
                <p>{opt.description}</p>
                <button
                  className={`donate-price-cta ${opt.highlight ? 'primary' : 'secondary'}`}
                  onClick={() => handleLinkClick(opt.url)}
                >
                  {opt.cta}
                  <ExternalLink size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Status strip */}
          {loungeUnlocked && (
            <div className="donate-status-strip">
              <Check size={18} />
              <span>You're recognized as a supporter{effectiveTier ? ` (${effectiveTier})` : ''}. Every app feature remains available to everyone. {xpMultiplierLabel}.</span>
            </div>
          )}

          <div className="hero-stats-grid">
            {founderStats.map((stat) => (
              <div key={stat.label} className="hero-stat-card">
                <Shield size={16} />
                <div>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* All perks — visible, not hidden in collapsible */}
        <section className="donate-perks-section">
          <div className="feature-heading">
            <h2>What your support helps fund</h2>
            <p>
              Donations support continued development. They do not change which GamePilot features you can use.
            </p>
          </div>
          <div className="feature-grid">
            {allPerks.map((perk) => (
              <div key={perk.title} className="feature-card animated">
                <div className="feature-card-header">
                  <div className="feature-icon">{perk.icon}</div>
                  <div>
                    <h3>{perk.title}</h3>
                    <p>{perk.description}</p>
                  </div>
                </div>
                <div className="feature-tags-inline">
                  {perk.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Code redemption — for existing Patreon supporters */}
        <div ref={codeFormRef}>
          <CollapsibleSection
            title="Legacy supporter recognition"
            subtitle="Existing Patreon supporters can redeem a legacy code for local Founders Wall recognition."
            badge="Patreon"
            icon={<Key size={18} />}
            className="donate-folder"
          >
            <div className="become-founder-section">
              <div className="unified-code-form">
                <div className="code-input-group">
                  <label htmlFor="founder-name">Display Name</label>
                  <input
                    id="founder-name"
                    type="text"
                    value={founderName}
                    onChange={(e) => setFounderName(e.target.value)}
                    placeholder="Your display name for the Founders Wall"
                    className="code-input"
                    disabled={isValidating}
                    maxLength={30}
                  />
                </div>

                <div className="code-input-group">
                  <label htmlFor="unified-code">Your Code</label>
                  <div className="code-input-wrapper">
                    <input
                      id="unified-code"
                      type="text"
                      value={unifiedCode}
                      onChange={(e) => {
                        setUnifiedCode(e.target.value.toUpperCase());
                        setUnifiedMessage('');
                        setUnifiedSuccess(false);
                      }}
                      placeholder="Paste your Patreon code"
                      className="code-input"
                      maxLength={40}
                    />
                    <button
                      onClick={redeemUnifiedCode}
                      disabled={!unifiedCode.trim() || isValidating}
                      className="validate-button"
                    >
                      {isValidating ? 'Checking...' : 'Redeem Code'}
                    </button>
                  </div>
                </div>

                {unifiedMessage && (
                  <div className={`validation-message ${unifiedSuccess ? 'success' : 'error'} unified-result`}>
                    {unifiedSuccess ? <Check size={16} /> : <AlertCircle size={16} />}
                    <span>{unifiedMessage}</span>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Founders Wall */}
        <CollapsibleSection
          title="Founders Wall"
          subtitle="The people backing GamePilot's local-first future."
          badge={`${founders.length} supporters`}
          icon={<Trophy size={18} />}
          className="donate-folder"
        >
          <div className="founders-section">
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
                <p>Be the first supporter on the wall.</p>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Support links */}
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

        <div className="donate-footer">
          <p>
            Your support funds development, new features, and keeps GamePilot local-first with no ads,
            no tracking, and no online account required.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Donate;
