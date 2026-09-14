import { useEffect, useState } from 'react';
import { ProgressionUnlockService } from '../services/ProgressionUnlockService';

export default function useRewardPresentation() {
  const [customization, setCustomization] = useState(() =>
    ProgressionUnlockService.getRewardPresentationCustomization()
  );

  useEffect(() => {
    const refresh = () => setCustomization(ProgressionUnlockService.getRewardPresentationCustomization());
    window.addEventListener('gamepilot:reward-presentation-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('gamepilot:reward-presentation-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const card = ProgressionUnlockService.getCardStyles?.().find((item) => item.id === customization.selectedCardStyle);
  const pack = ProgressionUnlockService.getRecommendationPacks?.().find(
    (item) => item.id === customization.selectedRecommendationPack
  );

  return {
    customization,
    className: `reward-presentation reward-card-style-${card?.id || 'standard'} recommendation-pack-${pack?.id || 'classic_glow'}`,
    style: {
      '--reward-card-border': card?.preview.border,
      '--reward-card-background': card?.preview.background,
      '--reward-card-shadow': card?.preview.shadow,
      '--reward-card-radius': card?.preview.borderRadius || '12px',
      '--reward-card-blur': card?.preview.backdropFilter || 'none',
      '--recommendation-accent': pack?.accentColor || '#ff6b35',
      '--recommendation-secondary': pack?.secondaryColor || '#f093fb',
      '--recommendation-surface': pack?.preview,
      '--recommendation-glow': `${pack?.accentColor || '#ff6b35'}33`,
      '--recommendation-radius': pack?.id === 'tactical_hud' ? '4px' : '14px',
    },
  };
}
