export const GETTING_STARTED_PREFERENCE_KEY = 'gettingStartedPreferences';

export const readGettingStartedPreferences = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(GETTING_STARTED_PREFERENCE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : { hasSeen: false, hidden: false };
  } catch (error) {
    return { hasSeen: false, hidden: false };
  }
};

export const saveGettingStartedPreferences = (preferences = {}) => {
  localStorage.setItem(GETTING_STARTED_PREFERENCE_KEY, JSON.stringify({
    hasSeen: Boolean(preferences.hasSeen),
    hidden: Boolean(preferences.hidden)
  }));
};

export const formatPlaytime = (minutes) => {
  if (!minutes || minutes <= 0) return null;

  if (minutes < 60) {
    return `${Math.round(minutes)}m played`;
  } else if (minutes < 120) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m played` : `${hours}h played`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m played`;
  }
};

export const formatLastPlayed = (lastPlayedTimestamp) => {
  if (!lastPlayedTimestamp) return 'Never played';

  const lastPlayedDate = new Date(lastPlayedTimestamp);
  if (Number.isNaN(lastPlayedDate.getTime())) return 'Unknown';

  const now = new Date();
  const diffMs = Math.max(0, now - lastPlayedDate);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
};
