// PlatformConstants.js - Centralized platform icons and colors
export const PLATFORM_ICONS = {
  'Steam': '🚂',
  'Epic': '🎮',
  'GOG': '🎯',
  'EA': '🌟',
  'Uplay': '🎪',
  'Battle.net': '⚔️',
  'Xbox': '🎯',
  'PlayStation': '🎮',
  'Rockstar': '🪨',
  'BSG': '🔫',
  'Riot': '👊',
  'CurseForge': '⛏️',
  'Amazon': '📦',
  'Itch.io': '🎲',
  'Manual': '📝',
  'Unknown': '❓'
};

export const PLATFORM_COLORS = {
  'Steam': '#1b2838',
  'Epic': '#3a3f52',
  'GOG': '#8b4513',
  'EA': '#ff6b35',
  'Uplay': '#ff6b35',
  'Battle.net': '#ff8c42',
  'Xbox': '#107c10',
  'PlayStation': '#ff6b35',
  'Rockstar': '#ff0000',
  'BSG': '#9a8866',
  'Riot': '#d13639',
  'CurseForge': '#f16436',
  'Amazon': '#00a8e1',
  'Itch.io': '#fa5c5c',
  'Manual': '#6b46c1',
  'Unknown': '#666666'
};

// Get icon for a platform
export const getPlatformIcon = (platform) => {
  return PLATFORM_ICONS[platform] || PLATFORM_ICONS['Unknown'];
};

// Get color for a platform
export const getPlatformColor = (platform) => {
  return PLATFORM_COLORS[platform] || PLATFORM_COLORS['Unknown'];
};

// Get all platforms
export const getAllPlatforms = () => {
  return Object.keys(PLATFORM_ICONS).filter(p => p !== 'Unknown');
};
