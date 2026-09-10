import { useState, useCallback } from 'react';
import { GamingStoryService } from '../services/GamingStoryService';

/**
 * Manages the gaming story card state — a one-time narrative summary
 * shown after the first library scan.
 *
 * Returns:
 *   - gamingStory: the current story object, or null
 *   - showFirstStory(library): called by the scanner after a scan completes
 *   - dismissStory(): called when the user dismisses the story card
 */
export default function useGamingStory() {
  const [gamingStory, setGamingStory] = useState(null);

  const showFirstStory = useCallback((library) => {
    const story = GamingStoryService.updateStory(library);
    if (story && GamingStoryService.shouldShowFirstStory()) {
      setGamingStory(story);
      GamingStoryService.markFirstStoryShown();
    }
  }, []);

  const dismissStory = useCallback(() => {
    setGamingStory(null);
  }, []);

  return { gamingStory, showFirstStory, dismissStory };
}
