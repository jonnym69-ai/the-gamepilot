import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Crown, Lock } from 'lucide-react';
import EntitlementService, { FREE_FEATURES, PRO_FEATURES } from '../services/EntitlementService';
import './ProGate.css';

export function EditionComparison() {
  const isPro = EntitlementService.isPro();
  return (
    <section className="edition-comparison" aria-label="GamePilot editions">
      <p className="edition-current">
        Installed edition: <strong>{EntitlementService.getEditionName()}</strong>
      </p>
      <h2>Your games. Your habits. Your gaming story.</h2>
      <p>Start with GamePilot for free. Choose Pro for more depth, not because Free stops working.</p>
      <div className="edition-grid">
        <section className="edition-card">
          <h3>GamePilot</h3>
          <p>Free to keep using. Find your next game and discover your gaming identity.</p>
          <ul>
            {Object.values(FREE_FEATURES).map(({ label }) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </section>
        <section className="edition-card">
          <h3>GamePilot Pro</h3>
          <p>Everything in Free, plus more control and richer visual exports.</p>
          <ul>
            {Object.values(PRO_FEATURES).map(({ label, description }) => (
              <li key={label}>
                <strong>{label}</strong>
                <p>{description}</p>
              </li>
            ))}
          </ul>
          {isPro ? (
            <p>These tools are included in your installed edition. No key or online activation is needed.</p>
          ) : (
            <>
              <button type="button" className="pro-gate-upgrade" disabled>
                Pro sales coming soon
              </button>
              <p>
                Pro is planned as a separate, one-time paid download. Checkout, pricing and the update policy are not
                yet available.
              </p>
            </>
          )}
        </section>
      </div>
      <p>
        Both editions use the same local data folder. Back up your data before changing editions, close GamePilot, and
        install the other edition in the same location. Changing editions does not delete saved data or earned rewards.
      </p>
      <p>
        Supporter recognition is separate from Pro. Early-user upgrade arrangements will be announced before the paid
        release.
      </p>
      <Link to="/">Return to GamePilot</Link>
    </section>
  );
}

/**
 * Gates a Pro feature. When unlocked, renders children untouched. When locked,
 * renders a placeholder card advertising the feature with an upgrade path.
 *
 * feature: key from PRO_FEATURES in EntitlementService.
 * compact: renders a slim banner instead of a card (for inline sections).
 */
export default function ProGate({ feature, title, teaser, compact = false, children }) {
  const navigate = useNavigate();
  const meta = Object.prototype.hasOwnProperty.call(PRO_FEATURES, feature) ? PRO_FEATURES[feature] : null;
  const label = title || meta?.label || 'This feature';
  const description = teaser || meta?.description || 'This feature is unavailable in this build.';

  if (EntitlementService.hasFeature(feature)) return children;

  return (
    <div className={`pro-gate${compact ? ' pro-gate--compact' : ''}`} data-pro-feature={feature}>
      <div className="pro-gate-icon" aria-hidden="true">
        <Lock size={compact ? 16 : 22} />
      </div>
      <div className="pro-gate-body">
        <div className="pro-gate-title-row">
          <span className="pro-gate-title">{label}</span>
          <span className="pro-gate-badge">
            <Crown size={12} />
            Pro
          </span>
        </div>
        {!compact && <p className="pro-gate-teaser">{description}</p>}
      </div>
      <div className="pro-gate-actions">
        <button type="button" className="pro-gate-upgrade" onClick={() => navigate('/editions')}>
          Explore Pro
        </button>
      </div>
    </div>
  );
}
