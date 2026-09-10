import { useState, useEffect, useCallback } from 'react';

const STILL_PLAYING_PROMPT_DELAY_MS = 15 * 60 * 1000;

/**
 * Manages the "Still playing?" prompt that appears after a game has been
 * running for 15 minutes without a session check-in.
 *
 * Needs:
 *   - activeSessions: the current active sessions map
 *   - handleEndSession: from useSessionLifecycle, to end a session when the
 *     user confirms they're done playing
 *
 * Returns:
 *   - stillPlayingPrompt: { gameName } or null
 *   - handleStillPlayingContinue: dismiss the prompt and reset the deadline
 *   - handleStillPlayingEndSession: end the session and dismiss the prompt
 */
export default function useStillPlayingPrompt({ activeSessions, handleEndSession }) {
  const [stillPlayingPrompt, setStillPlayingPrompt] = useState(null);
  const [stillPlayingDeadlines, setStillPlayingDeadlines] = useState({});

  // Update deadlines when active sessions change
  useEffect(() => {
    setStillPlayingDeadlines((previousDeadlines) => {
      const nextDeadlines = {};

      Object.entries(activeSessions || {}).forEach(([gameName, session]) => {
        const existingDeadline = previousDeadlines[gameName];
        const sessionStart = session?.startTime ? new Date(session.startTime).getTime() : NaN;
        const baseDeadline = Number.isFinite(sessionStart)
          ? sessionStart + STILL_PLAYING_PROMPT_DELAY_MS
          : Date.now() + STILL_PLAYING_PROMPT_DELAY_MS;

        nextDeadlines[gameName] = typeof existingDeadline === 'number' ? existingDeadline : baseDeadline;
      });

      const previousKeys = Object.keys(previousDeadlines || {});
      const nextKeys = Object.keys(nextDeadlines);
      const didChange =
        previousKeys.length !== nextKeys.length ||
        previousKeys.some((key) => previousDeadlines[key] !== nextDeadlines[key]);

      return didChange ? nextDeadlines : previousDeadlines;
    });
  }, [activeSessions]);

  // Poll for expired deadlines
  useEffect(() => {
    if (stillPlayingPrompt) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      const now = Date.now();
      const nextPromptGame = Object.keys(activeSessions || {}).find((gameName) => {
        const deadline = stillPlayingDeadlines?.[gameName];
        return typeof deadline === 'number' && deadline <= now;
      });

      if (nextPromptGame) {
        setStillPlayingPrompt({ gameName: nextPromptGame });
      }
    }, 60 * 1000);

    const now = Date.now();
    const immediatePromptGame = Object.keys(activeSessions || {}).find((gameName) => {
      const deadline = stillPlayingDeadlines?.[gameName];
      return typeof deadline === 'number' && deadline <= now;
    });

    if (immediatePromptGame) {
      setStillPlayingPrompt({ gameName: immediatePromptGame });
    }

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeSessions, stillPlayingDeadlines, stillPlayingPrompt]);

  const handleStillPlayingContinue = useCallback(() => {
    if (!stillPlayingPrompt?.gameName) {
      setStillPlayingPrompt(null);
      return;
    }

    setStillPlayingDeadlines((previousDeadlines) => ({
      ...previousDeadlines,
      [stillPlayingPrompt.gameName]: Date.now() + STILL_PLAYING_PROMPT_DELAY_MS,
    }));
    setStillPlayingPrompt(null);
  }, [stillPlayingPrompt]);

  const handleStillPlayingEndSession = useCallback(() => {
    if (!stillPlayingPrompt?.gameName) {
      setStillPlayingPrompt(null);
      return;
    }

    handleEndSession(stillPlayingPrompt.gameName);
    setStillPlayingDeadlines((previousDeadlines) => {
      const nextDeadlines = { ...(previousDeadlines || {}) };
      delete nextDeadlines[stillPlayingPrompt.gameName];
      return nextDeadlines;
    });
    setStillPlayingPrompt(null);
  }, [handleEndSession, stillPlayingPrompt]);

  // Escape key dismisses the prompt
  useEffect(() => {
    if (!stillPlayingPrompt) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') handleStillPlayingContinue();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleStillPlayingContinue, stillPlayingPrompt]);

  return { stillPlayingPrompt, handleStillPlayingContinue, handleStillPlayingEndSession };
}
