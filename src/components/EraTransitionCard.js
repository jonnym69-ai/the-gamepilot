import React from 'react';
import { ArrowRight, X } from 'lucide-react';
import CurrentEraService from '../services/CurrentEraService';
import StorageService from '../services/StorageService';
import './EraTransitionCard.css';

const DISMISSED_KEY = 'eraTransitionDismissedV1';
const TRANSITION_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export default function EraTransitionCard() {
  const [dismissed, setDismissed] = React.useState(() => StorageService.getString(DISMISSED_KEY));

  const transition = React.useMemo(() => {
    try {
      return CurrentEraService.getEraTransition();
    } catch {
      return null;
    }
  }, []);

  if (!transition || !transition.endedEra?.name) return null;
  if (dismissed === transition.signature) return null;
  if (Date.now() - transition.transitionedAt > TRANSITION_WINDOW_MS) return null;

  const handleDismiss = () => {
    StorageService.setString(DISMISSED_KEY, transition.signature);
    setDismissed(transition.signature);
  };

  const { endedEra, newEra } = transition;

  return (
    <aside className="era-transition-card" aria-label="Era transition">
      <button
        type="button"
        className="era-transition-dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss era transition"
      >
        <X size={14} aria-hidden="true" />
      </button>
      <p className="era-transition-eyebrow">An era has ended</p>
      <h3 className="era-transition-name">{endedEra.name}</h3>
      <p className="era-transition-detail">
        {endedEra.days} day{endedEra.days === 1 ? '' : 's'}
        {endedEra.topGame ? ` · led by ${endedEra.topGame}` : ''}
      </p>
      <p className="era-transition-next">
        <ArrowRight size={14} aria-hidden="true" /> You are now living in {newEra.name}
        {newEra.topGame ? ` — ${newEra.topGame} is leading it` : ''}.
      </p>
    </aside>
  );
}
