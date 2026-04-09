/**
 * Time utility functions for GamePilot
 */

/**
 * Format minutes into a readable duration string
 * @param {number} minutes - Duration in minutes
 * @param {boolean} showSeconds - Whether to show seconds
 * @returns {string} Formatted duration string
 */
export function formatDuration(minutes, showSeconds = false) {
  if (!minutes || minutes <= 0) {
    return '0m';
  }

  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = showSeconds ? Math.floor((minutes * 60) % 60) : 0;

  if (hours === 0) {
    if (showSeconds && secs > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${mins}m`;
  }

  if (mins === 0 && (!showSeconds || secs === 0)) {
    return `${hours}h`;
  }

  if (showSeconds && secs > 0) {
    return `${hours}h ${mins}m ${secs}s`;
  }

  return `${hours}h ${mins}m`;
}

/**
 * Format a date to a relative time string (e.g., "2 hours ago")
 * @param {Date|string} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'Just now';
  }
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }

  return then.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: now.getFullYear() !== then.getFullYear() ? 'numeric' : undefined
  });
}

/**
 * Format a time value for display in 12-hour format
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted time string
 */
export function formatTime12Hour(date) {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format a time value for display in 24-hour format
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted time string
 */
export function formatTime24Hour(date) {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}
