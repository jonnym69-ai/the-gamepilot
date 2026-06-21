import React from 'react';
import { Heart, Star, Crown, Zap, Check, ExternalLink } from 'lucide-react';
import './PatreonTiersPanel.css';

const TIERS = [
  {
    name: 'Supporter',
    priceGBP: 2,
    priceUSD: 3,
    icon: <Heart size={20} />,
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.35)',
    perks: [
      'Name in app credits',
      'Discord supporter role',
      'Early access to theme drops',
      'Vote on upcoming features'
    ]
  },
  {
    name: 'Insider',
    priceGBP: 5,
    priceUSD: 7,
    icon: <Star size={20} />,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.35)',
    perks: [
      'Everything in Supporter',
      'All one-off unlocks included',
      'Beta branch access',
      'Monthly exclusive widget skins'
    ]
  },
  {
    name: 'Founder',
    priceGBP: 10,
    priceUSD: 12,
    icon: <Crown size={20} />,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.35)',
    perks: [
      'Everything in Insider',
      'Monthly exclusive themes',
      '1.5x XP boost active',
      'Personal feature request channel',
      'Founder badge on wall'
    ]
  }
];

export default function PatreonTiersPanel() {
  return (
    <div className="patreon-tiers-panel">
      <p className="patreon-tiers-intro">
        Monthly subscriptions help fund ongoing development. All perks are local-first extras
        — never gated core functionality.
      </p>

      <div className="patreon-tiers-grid">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className="patreon-tier-card"
            style={{ background: tier.bg, borderColor: tier.border }}
          >
            <div className="patreon-tier-header">
              <div className="patreon-tier-icon" style={{ color: tier.color }}>
                {tier.icon}
              </div>
              <h3 className="patreon-tier-name" style={{ color: tier.color }}>
                {tier.name}
              </h3>
            </div>
            <div className="patreon-tier-price">
              <span className="patreon-tier-amount">£{tier.priceGBP}</span>
              <span className="patreon-tier-sep"> / </span>
              <span className="patreon-tier-amount">${tier.priceUSD}</span>
              <span className="patreon-tier-period">per month</span>
            </div>
            <ul className="patreon-tier-perks">
              {tier.perks.map((perk, i) => (
                <li key={i}>
                  <Check size={14} style={{ color: tier.color }} />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="patreon-tiers-cta">
        <a
          href="https://www.patreon.com/cw/GamePilot"
          target="_blank"
          rel="noopener noreferrer"
          className="patreon-tiers-link"
        >
          <Zap size={16} />
          Subscribe on Patreon
          <ExternalLink size={14} />
        </a>
        <p className="patreon-tiers-note">
          Subscriptions are handled through Patreon. Codes are emailed after signup.
        </p>
      </div>
    </div>
  );
}
