import React, { useMemo } from 'react';
import { Gamepad2, Keyboard } from 'lucide-react';
import { InputMethodTracker } from '../services/InputMethodTracker';

const InputMethodBadge = ({ gameName }) => {
  const rec = useMemo(() => InputMethodTracker.getRecommendation(gameName), [gameName]);
  if (!rec) return null;

  const Icon = rec.method === 'controller' ? Gamepad2 : Keyboard;
  return (
    <span className="input-method-badge" title={rec.label}>
      <Icon size={10} />
    </span>
  );
};

export default React.memo(InputMethodBadge, (prev, next) => prev.gameName === next.gameName);
