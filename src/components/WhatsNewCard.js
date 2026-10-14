import React from 'react';
import { Sparkles, X } from 'lucide-react';
import StorageService from '../services/StorageService';
import { APP_VERSION } from '../appVersion';
import { WHATS_NEW } from '../whatsNew';
import './WhatsNewCard.css';

const SEEN_KEY = 'whatsNewSeenVersion';

/**
 * "What's new" card for returning users — shows once per app version on
 * Today, dismissed by clicking through or the close button. Hidden for
 * first-run users (no library yet) since everything is new to them.
 */
export default function WhatsNewCard({ hasLibrary }) {
  const [dismissed, setDismissed] = React.useState(() => StorageService.getString(SEEN_KEY) === APP_VERSION);

  if (!hasLibrary || dismissed || !Array.isArray(WHATS_NEW) || WHATS_NEW.length === 0) return null;

  const handleDismiss = () => {
    StorageService.setString(SEEN_KEY, APP_VERSION);
    setDismissed(true);
  };

  return (
    <aside className="whats-new-card" aria-label={`What's new in version ${APP_VERSION}`}>
      <div className="whats-new-header">
        <Sparkles size={15} aria-hidden="true" />
        <span className="whats-new-title">New in {APP_VERSION}</span>
        <button type="button" className="whats-new-dismiss" onClick={handleDismiss} aria-label="Dismiss what's new">
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <ul className="whats-new-list">
        {WHATS_NEW.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <button type="button" className="whats-new-gotit" onClick={handleDismiss}>
        Got it
      </button>
    </aside>
  );
}
