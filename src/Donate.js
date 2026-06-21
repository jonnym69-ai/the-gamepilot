import React, { useState, useRef, useMemo } from 'react';
import { Heart, ExternalLink, Play, Star, Crown, Gem, Trophy, Check, AlertCircle, Key, Sparkles, Shield, Palette, Image as ImageIcon, Layers3, LockKeyhole, FileText } from 'lucide-react';
import NavBar from './NavBar';
import { AchievementTracker } from './AchievementSystem';
import CollapsibleSection from './components/CollapsibleSection';
import PatreonTiersPanel from './components/PatreonTiersPanel';
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
  const [patreonCode, setPatreonCode] = useState('');
  const [founderName, setFounderName] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [storeCode, setStoreCode] = useState('');
  const [storeMessage, setStoreMessage] = useState('');
  const [storeSuccess, setStoreSuccess] = useState(false);
  const [storeCatalog, setStoreCatalog] = useState(() => EntitlementService.getCatalog());

  // Unified code redemption
  const [unifiedCode, setUnifiedCode] = useState('');
  const [unifiedMessage, setUnifiedMessage] = useState('');
  const [unifiedSuccess, setUnifiedSuccess] = useState(false);
  const codeFormRef = useRef(null);

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
      name: 'YouTube',
      url: 'https://youtube.com/@mozog91?si=rJyzBqLF3-4arDhU',
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

  const userFounders = StorageService.get('userFounders', []);

  // Founders data - merge static founders with user-added Patreon supporters
  const founders = [
    ...staticFounders,
    ...userFounders
  ];

  const savedUsername = StorageService.getString('profileUsername', '');
  const activeBoostProfile = AchievementTracker.getPatreonBoostProfile();
  const currentFounder = founders.find((founder) => founder.name?.toLowerCase() === savedUsername.trim().toLowerCase()) || null;
  const effectiveTier = currentFounder?.tier || activeBoostProfile.tier || null;
  const loungeUnlocked = Boolean(effectiveTier);
  const activeFounderName = currentFounder?.name || savedUsername || 'Pilot';
  const founderJoinDate = currentFounder?.date || activeBoostProfile.activatedAt || null;
  const xpMultiplierLabel = activeBoostProfile?.multiplier > 1 ? `${activeBoostProfile.multiplier}x XP boost active` : 'No XP boost active';

  const tierOrder = ['Platinum', 'Gold', 'Silver', 'Bronze'];
  const tierBreakdown = tierOrder.map(tier => ({
    tier,
    count: founders.filter(founder => founder.tier === tier).length
  }));

  const founderStats = [
    { label: 'Founding Members', value: founders.length.toString() },
    { label: 'Your Founder Tier', value: effectiveTier || 'Visitor' },
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
      summary: 'Bronze support: a 2x XP boost to speed up free progression, plus your name on the Founders Wall as a thank you.',
      checkoutUrl: tierCheckoutLinks.Bronze
    },
    {
      tier: 'Silver',
      summary: 'Silver support: a 3x XP boost to speed up free progression, plus Silver founder recognition and bonus themes.',
      checkoutUrl: tierCheckoutLinks.Silver
    },
    {
      tier: 'Gold',
      summary: 'Gold support: a 4x XP boost to speed up free progression, plus Gold founder recognition and premium export styling.',
      checkoutUrl: tierCheckoutLinks.Gold
    },
    {
      tier: 'Platinum',
      summary: 'Platinum support: the maximum 5x XP boost to speed up free progression, plus Platinum founder recognition and the full cosmetic pack.',
      checkoutUrl: tierCheckoutLinks.Platinum
    }
  ];

  const tierBenefits = {
    Platinum: ['5x XP boost multiplier', 'Platinum founder recognition on the Founders Wall', 'Supports new local-first polish and reward drops'],
    Gold: ['4x XP boost multiplier', 'Gold founder recognition on the Founders Wall', 'Supports new progression rewards and identity features'],
    Silver: ['3x XP boost multiplier', 'Silver founder recognition on the Founders Wall', 'Supports ongoing cockpit polish and quality-of-life updates'],
    Bronze: ['2x XP boost multiplier', 'Bronze founder recognition on the Founders Wall', 'Supports ongoing local-first development']
  };

  const founderLoungeFeatures = [
    {
      title: 'Founder Identity Pack',
      description: 'Exclusive founder badge, profile frame, banner styling, and title direction that make support feel permanent and visible.',
      icon: <Shield size={22} />,
      tier: 'Bronze+',
      tags: ['Founder badge', 'Profile frame', 'Founder title'],
      unlocked: loungeUnlocked
    },
    {
      title: 'Founder Atmosphere',
      description: 'A prestige presentation pack for the lounge itself with richer lighting, premium ambiance, and a supporters-only tone.',
      icon: <Palette size={22} />,
      tier: 'Silver+',
      tags: ['Prestige theme', 'Lounge styling', 'Founder mood'],
      unlocked: ['Silver', 'Gold', 'Platinum'].includes(effectiveTier)
    },
    {
      title: 'Founder Year in Review Style',
      description: 'Premium recap/export treatment with a Founding Supporter stamp, elevated card polish, and collector-style identity framing.',
      icon: <ImageIcon size={22} />,
      tier: 'Gold+',
      tags: ['Recap stamp', 'Premium export styling', 'Collector polish'],
      unlocked: ['Gold', 'Platinum'].includes(effectiveTier)
    },
    {
      title: 'Founder Showcase Shelf',
      description: 'A lounge-style identity shelf for spotlighting your support era, your founder tier, and the kind of cockpit you helped fund.',
      icon: <Layers3 size={22} />,
      tier: 'Platinum',
      tags: ['Founder shelf', 'Support timeline', 'Identity plaque'],
      unlocked: effectiveTier === 'Platinum'
    }
  ];

  const founderLoungeMoments = [
    {
      title: 'Founder Crest',
      detail: loungeUnlocked ? `${effectiveTier} crest active for ${activeFounderName}.` : 'Unlock your crest by redeeming a Patreon founder code.',
      status: loungeUnlocked ? 'Active' : 'Locked'
    },
    {
      title: 'Support Timeline',
      detail: founderJoinDate ? `Founder since ${new Date(founderJoinDate).toLocaleDateString()}.` : 'Your founder join date will appear here once the lounge is unlocked.',
      status: founderJoinDate ? 'Tracked' : 'Waiting'
    },
    {
      title: 'Export Signature',
      detail: ['Gold', 'Platinum'].includes(effectiveTier) ? 'Founder export styling is eligible for premium recap treatment.' : 'Higher founder tiers can unlock premium recap/export styling.',
      status: ['Gold', 'Platinum'].includes(effectiveTier) ? 'Eligible' : 'Preview'
    }
  ];

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

  const redeemStoreUnlock = () => {
    const result = EntitlementService.redeemCode(storeCode);
    setStoreMessage(result.message);
    setStoreSuccess(result.success);

    if (result.success) {
      setStoreCode('');
      setStoreCatalog(EntitlementService.getCatalog());
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
      // 1. Try store unlock codes first
      const storeResult = EntitlementService.redeemCode(code);
      if (storeResult.success) {
        setUnifiedMessage(storeResult.message);
        setUnifiedSuccess(true);
        setUnifiedCode('');
        setStoreCatalog(EntitlementService.getCatalog());
        setIsValidating(false);
        return;
      }

      // 2. Try Patreon / founder codes
      const codeData = validPatreonCodes[code];
      if (codeData) {
        const existingFounders = StorageService.get('userFounders', []);
        const codeAlreadyUsed = existingFounders.some(founder => founder.code === code);

        if (codeAlreadyUsed) {
          setUnifiedMessage('This code has already been used!');
          setUnifiedSuccess(false);
        } else {
          const boostMeta = AchievementTracker.validatePatreonBoostCode(code);
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
        const existingFounders = StorageService.get('userFounders', []);
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
          StorageService.set('userFounders', existingFounders);
          
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

  return (
    <div className={`App ${theme}`}>
      <NavBar />
      <div className="donate-container">
        <section className="founder-hero">
          <div className="hero-text">
            <div className="hero-badge">
              <Sparkles size={16} /> Founder Lounge
            </div>
            <h1>The private lounge for the players helping build GamePilot.</h1>
            <p>
              The Founder Lounge is where supporter identity, founder cosmetics, premium recap style, and your support timeline come together. Everyone still progresses through play. Founders just get a more personal cockpit layer.
            </p>
            <div className="hero-actions">
              <button className="hero-primary" onClick={scrollToCodeForm}>
                Unlock Founder Lounge
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
            <h3>{loungeUnlocked ? `${activeFounderName}'s Lounge Access` : 'Founder Lounge Access'}</h3>
            <div className={`lounge-status-card ${loungeUnlocked ? 'unlocked' : 'locked'}`}>
              <div>
                <span className="lounge-status-label">Status</span>
                <strong>{loungeUnlocked ? `${effectiveTier} Founder active` : 'Locked until founder code is redeemed'}</strong>
              </div>
              <div>
                <span className="lounge-status-label">Progression</span>
                <strong>{xpMultiplierLabel}</strong>
              </div>
            </div>
            <ul>
              <li>Founder badge, title, and identity pack direction</li>
              <li>Founder-only atmosphere and prestige page styling</li>
              <li>Premium Year in Review / export presentation roadmap</li>
              <li>All stored locally with no account dependency</li>
            </ul>
            <p>{loungeUnlocked ? 'Your founder tier is now part of your local identity layer inside GamePilot.' : 'Redeem a valid founder code to turn this page into your personalized founder space.'}</p>
          </div>
        </section>

        <section className="founder-lounge-overview">
          <div className="lounge-overview-copy">
            <div className="updates-pill">
              <Shield size={14} /> Lounge Identity
            </div>
            <h2>{loungeUnlocked ? `Welcome back, ${activeFounderName}.` : 'Founder Lounge preview'}</h2>
            <p>
              {loungeUnlocked
                ? `Your ${effectiveTier} founder access is active. This lounge highlights the identity, prestige styling, and supporter recognition your local profile now carries.`
                : 'Preview the founder-only identity layer before you unlock it. Support stays local-first, tasteful, and focused on prestige instead of gating the core experience.'}
            </p>
          </div>
          <div className="lounge-moment-grid">
            {founderLoungeMoments.map((moment) => (
              <div key={moment.title} className="lounge-moment-card">
                <span>{moment.title}</span>
                <strong>{moment.status}</strong>
                <p>{moment.detail}</p>
              </div>
            ))}
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
          title="Founder Lounge Perks"
          subtitle="A prestige identity layer for supporters: founder cosmetics, recap styling, and a private lounge feel without pay-to-win unlocks."
          badge={`${tierPerks.length} tiers`}
          icon={<Heart size={18} />}
          className="donate-folder"
        >
          <section className="founder-feature-section tier-perks">
            <div className="feature-heading">
              <h2>Founder Lounge Perks</h2>
              <p>
                Support unlocks a founder-only identity layer built around prestige, atmosphere, and supporter recognition.
                It complements progression instead of replacing it, and keeps the app local-first with no online account requirement.
              </p>
            </div>
            <div className="feature-grid founder-lounge-grid">
              {founderLoungeFeatures.map((feature) => (
                <div key={feature.title} className={`feature-card ${feature.unlocked ? 'animated' : ''}`}>
                  <div className="feature-card-header">
                    <div className="feature-icon">{feature.unlocked ? feature.icon : <LockKeyhole size={22} />}</div>
                    <div>
                      <h3>{feature.title}</h3>
                      <p>{feature.description}</p>
                    </div>
                  </div>
                  <div className="feature-meta">
                    <span className={`tier-pill ${(effectiveTier || 'bronze').toLowerCase()}`}>{feature.tier}</span>
                    <span className="coming-soon">{feature.unlocked ? 'Unlocked for your lounge' : 'Tier preview'}</span>
                  </div>
                  <div className="feature-tags-inline">
                    {feature.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
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

        {/* Unified Code Redemption */}
        <div ref={codeFormRef}>
          <CollapsibleSection
            title="Redeem a Code"
            subtitle="Enter any GamePilot code — store unlock, Patreon tier, or founder code — and we'll handle the rest."
            badge="One box"
            icon={<Key size={18} />}
            className="donate-folder"
          >
            <div className="become-founder-section">
              <h2><Key size={24} /> Redeem Any Code</h2>
              <p className="founder-signup-intro">
                One field for every code type. Paste your unlock code, Patreon tier code, or founder code here and GamePilot will sort it out automatically.
              </p>

              <div className="unified-code-form">
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
                      placeholder="Paste your unlock or founder code"
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

                <div className="unified-code-hints">
                  <span><Key size={12} /> Store codes unlock product packs</span>
                  <span><Star size={12} /> Founder codes activate supporter perks</span>
                </div>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="One-Off Store Unlocks"
            subtitle="Redeem permanent GamePilot unlocks bought through Patreon shop products or supporter drops."
            badge={storeCatalog.filter((product) => product.unlocked).length ? `${storeCatalog.filter((product) => product.unlocked).length} unlocked` : 'Store codes'}
            icon={<Sparkles size={18} />}
            className="donate-folder"
          >
            <div className="become-founder-section">
              <h2><Sparkles size={24} /> Permanent Unlocks</h2>
              <p className="founder-signup-intro">
                One-off unlocks are separate from monthly XP boosts. Buy once, redeem once, and keep the feature pack permanently on this device.
              </p>

              <div className="store-unlock-grid">
                {storeCatalog.map((product) => {
                  const entitlement = product.unlocked ? EntitlementService.getEntitlements()[product.id] : null;
                  const hasPro = EntitlementService.hasEntitlement('gamepilot_pro');
                  const includedInPro = product.id !== 'gamepilot_pro' && hasPro;
                  return (
                    <div key={product.id} className={`store-unlock-card ${product.unlocked ? 'unlocked' : ''}`}>
                      <div className="store-unlock-meta">
                        <span className="store-unlock-type">{product.type}</span>
                        {product.unlocked && (
                          <span className="store-unlock-owned"><Check size={14} /> Owned</span>
                        )}
                        {!product.unlocked && includedInPro && (
                          <span className="store-unlock-included"><Check size={14} /> In Pro</span>
                        )}
                      </div>
                      <h3>{product.name}</h3>
                      <p>{product.description}</p>
                      {!product.unlocked && !includedInPro && (
                        <div className="store-unlock-price">
                          <span className="price-gbp">£{product.priceGBP}</span>
                          <span className="price-usd">${product.priceUSD}</span>
                          {product.id !== 'gamepilot_pro' && (
                            <span className="price-bundle-note">or Pro bundle</span>
                          )}
                        </div>
                      )}
                      {entitlement?.unlockedAt && (
                        <span className="store-unlock-date">
                          Unlocked {new Date(entitlement.unlockedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="code-entry-form store-code-form">
                <div className="code-input-group">
                  <label htmlFor="store-code">One-Off Unlock Code</label>
                  <div className="code-input-wrapper">
                    <input
                      id="store-code"
                      type="text"
                      value={storeCode}
                      onChange={(e) => {
                        setStoreCode(e.target.value.toUpperCase());
                        setStoreMessage('');
                        setStoreSuccess(false);
                      }}
                      placeholder="Enter your unlock code"
                      className="code-input"
                      maxLength={40}
                    />
                    <button
                      onClick={redeemStoreUnlock}
                      disabled={!storeCode.trim()}
                      className="validate-button"
                    >
                      Redeem Unlock
                    </button>
                  </div>
                </div>

                {storeMessage && (
                  <div className={`validation-message ${storeSuccess ? 'success' : 'error'}`}>
                    {storeSuccess ? <Check size={16} /> : <AlertCircle size={16} />}
                    <span>{storeMessage}</span>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Patreon Monthly Tiers"
            subtitle="Support ongoing development with a monthly subscription and unlock rotating exclusive perks."
            badge="Monthly"
            icon={<Heart size={18} />}
            className="donate-folder patreon-tiers-folder"
          >
            <PatreonTiersPanel />
          </CollapsibleSection>

          <CollapsibleSection
            title="Unlock Your Founder Lounge"
            subtitle="Redeem your founder code to activate your supporter tier, founder recognition, and any included XP multiplier."
            badge={validationSuccess ? 'Code accepted' : 'Redeem code'}
            icon={<Key size={18} />}
            className="donate-folder"
          >
            <div className="become-founder-section">
              <h2><Key size={24} /> Unlock Your Founder Lounge</h2>
              <p className="founder-signup-intro">
                Redeem your founder code to unlock the lounge, add your display name to the founders wall,
                and activate any included XP multiplier.
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
                      onChange={(e) => {
                        setPatreonCode(e.target.value.toUpperCase());
                        setValidationMessage('');
                        setValidationSuccess(false);
                      }}
                      placeholder="Enter your Patreon code"
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
                    <li>Subscribe to our <a href="https://www.patreon.com/cw/GamePilot" target="_blank" rel="noopener noreferrer">Patreon</a></li>
                    <li>Check your welcome email/message for your unique founder code</li>
                    <li>Enter your display name and code above</li>
                    <li>Click "Validate Code" to unlock your Founder Lounge access and activate XP boosts (if included)</li>
                  </ol>
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Founders Section */}
        <CollapsibleSection
          title="Founders Wall"
          subtitle="Browse the current founders wall, supporter tiers, and the players helping shape the cockpit." 
          badge={`${founders.length} founders`}
          icon={<Trophy size={18} />}
          className="donate-folder"
        >
          <div className="founders-section">
            <h2>🏆 Founders Wall</h2>
            <p className="founders-intro">
              These are the supporters helping fund the lounge, new reward polish, and the local-first future of GamePilot.
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
              <h3>🌟 Step into the Founder Lounge</h3>
              <p>
                Founder access is about identity, prestige, and supporting the roadmap without locking core play-driven progression.
              </p>
              <div className="tier-info">
                <div className="tier-item">
                  <Crown size={16} /> <strong>Platinum:</strong> Full founder lounge package + top-tier prestige
                </div>
                <div className="tier-item">
                  <Trophy size={16} /> <strong>Gold:</strong> Premium recap/export styling direction + founder prestige
                </div>
                <div className="tier-item">
                  <Star size={16} /> <strong>Silver:</strong> Founder atmosphere and upgraded lounge identity
                </div>
                <div className="tier-item">
                  <Gem size={16} /> <strong>Bronze:</strong> Founder badge, wall placement, and lounge access
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <div className="donate-footer">
          <p>
            Your support helps maintain GamePilot and develop new features like:
          </p>
          <ul>
            <li>Founder identity packs and profile prestige styling</li>
            <li>Expanded Year in Review and export presentation polish</li>
            <li>New local-first reward drops, themes, and audio atmosphere</li>
            <li>Core reliability and launcher polish for everyone</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Donate;
