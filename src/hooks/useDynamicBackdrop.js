import { useEffect } from 'react';
import { resolveGameArtwork } from '../services/GameArtworkService';
import DynamicBackdropService from '../services/DynamicBackdropService';

/**
 * Manages the dynamic cover-art background and animated backdrop effects.
 *
 * Side-effect-only hook — returns nothing. Reads `lastPlayedGame` and
 * `dynamicCoverBg` to set CSS custom properties and body classes.
 */
export default function useDynamicBackdrop({ lastPlayedGame, dynamicCoverBg }) {
  // Cover art as a subtle full-screen background with a dark overlay so UI
  // text stays readable across all themes.
  useEffect(() => {
    const root = document.documentElement;
    if (dynamicCoverBg && lastPlayedGame) {
      const coverUrl = resolveGameArtwork(lastPlayedGame, { surface: 'wide' });
      if (coverUrl) {
        root.style.setProperty('--dynamic-cover-image', `url(${coverUrl})`);
        document.body.classList.add('dynamic-cover-bg');
      } else {
        document.body.classList.remove('dynamic-cover-bg');
        root.style.removeProperty('--dynamic-cover-image');
      }
    } else {
      document.body.classList.remove('dynamic-cover-bg');
      root.style.removeProperty('--dynamic-cover-image');
    }
  }, [dynamicCoverBg, lastPlayedGame]);

  // Animated dynamic backdrop extracted from the last played cover art.
  useEffect(() => {
    const settings = DynamicBackdropService.getSettings();
    const root = document.documentElement;
    if (!settings.enabled || !lastPlayedGame) {
      document.body.classList.remove('dynamic-backdrop-active');
      root.style.removeProperty('--dynamic-backdrop');
      return undefined;
    }
    let active = true;
    const coverUrl = resolveGameArtwork(lastPlayedGame, { surface: 'wide' });
    DynamicBackdropService.getPalette(coverUrl).then((palette) => {
      if (!active || !palette) return;
      const css = DynamicBackdropService.generateBackdropCSS(palette, settings);
      if (!css) return;
      Object.entries(css).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });
      document.body.classList.add('dynamic-backdrop-active');
    });
    return () => {
      active = false;
      document.body.classList.remove('dynamic-backdrop-active');
      root.style.removeProperty('--dynamic-backdrop');
    };
  }, [lastPlayedGame]);
}
