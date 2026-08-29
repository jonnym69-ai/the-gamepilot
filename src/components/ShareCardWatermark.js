import React from 'react';

const SHARE_CARD_WATERMARK_CONTEXTS = {
  library: 'library recap',
  toprated: 'top-rated picks',
  year: 'yearly recap',
  identity: 'gaming identity',
  story: 'gaming stories',
  game: 'game card',
  multigame: 'multi-game card',
  habits: 'play habits',
};

const WATERMARK_CONFIGS = {
  gamepilot: {
    cta: (context) => `Get your own local-first ${context} at github.com/jonnym69-ai/the-gamepilot`,
    tagline: 'GamePilot · your library, your stats, your machine'
  },
  github: {
    cta: (context) => `Get your own local-first ${context} at github.com/jonnym69-ai/the-gamepilot/releases`,
    tagline: 'GamePilot · your library, your stats, your machine'
  },
  itchio: {
    cta: () => 'Get the latest build at moz91.itch.io',
    tagline: 'GamePilot · your library, your stats, your machine'
  },
  none: null
};

export const VALID_SHARE_CARD_WATERMARKS = ['gamepilot', 'github', 'itchio', 'none'];

export function getShareCardWatermark(watermark = 'gamepilot', context = 'library') {
  const config = WATERMARK_CONFIGS[watermark] || WATERMARK_CONFIGS.gamepilot;
  if (!config) return null;
  const contextLabel = SHARE_CARD_WATERMARK_CONTEXTS[context] || context;
  return {
    cta: config.cta(contextLabel),
    tagline: config.tagline
  };
}

export function ShareCardWatermark({ watermark = 'gamepilot', context = 'library', ctaClassName = '', taglineClassName = '' }) {
  const data = getShareCardWatermark(watermark, context);
  if (!data) return null;
  return (
    <>
      <span className={ctaClassName}>{data.cta}</span>
      <span className={taglineClassName}>{data.tagline}</span>
    </>
  );
}
