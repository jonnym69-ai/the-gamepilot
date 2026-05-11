import React, { createContext, useContext, useState, useEffect } from 'react';
import moodThemes from './themes/moodThemes.json';
import { AchievementTracker } from './AchievementSystem';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';
import StorageService from './services/StorageService';

// Helper function to determine if text should be white or based on theme color
const getContrastColor = (bgColor) => {
  // Convert hex to RGB for luminance calculation
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate relative luminance (simplified)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white for dark backgrounds, black for light backgrounds
  return luminance < 0.5 ? '#ffffff' : '#000000';
};

// Convert mood themes to CSS variable format
const convertMoodThemeToCSS = (theme) => ({
  '--bg-primary': theme.palette.background,
  '--bg-secondary': theme.palette.surface,
  '--bg-card': theme.palette.card || theme.palette.surface,
  '--bg-input': theme.palette.surface,
  '--bg-hover': theme.palette.hover,
  '--bg-active': theme.palette.primary,
  '--text-primary': theme.palette.text,
  '--text-secondary': theme.palette.text,
  '--text-muted': theme.palette.text,
  '--text-accent': theme.palette.accent,
  '--border-primary': theme.palette.secondary,
  '--border-secondary': theme.palette.primary,
  '--border-accent': theme.palette.accent,
  '--border-color': theme.palette.secondary,
  '--card-border': theme.palette.secondary,
  '--button-primary-bg': theme.palette.primary,
  '--button-primary-text': theme.palette.buttonText || theme.palette.text,
  '--button-primary-hover': theme.palette.accent,
  '--button-secondary-bg': theme.palette.secondary,
  '--button-secondary-text': theme.palette.buttonSecondaryText || theme.palette.text,
  '--link-primary': theme.palette.accent,
  '--link-primary-hover': theme.palette.primary,
  '--text-color': theme.palette.text,
  '--card-bg': theme.palette.card || theme.palette.surface,
  '--input-bg': theme.palette.surface,
  '--button-bg': theme.palette.primary,
  '--button-text': theme.palette.buttonText || theme.palette.text,
  '--accent-color': theme.palette.accent,
  '--gradient-primary': theme.palette.primary,
  '--gradient-accent': theme.palette.accent,
  '--muted-color': theme.palette.text,
  '--text-inverse': theme.palette.primary,
  '--card': theme.palette.card || theme.palette.surface,
  // Button text color management to prevent clashes
  '--button-text-safe': getContrastColor(theme.palette.primary),
  '--button-secondary-text-safe': getContrastColor(theme.palette.secondary),
  '--header-bg': theme.palette.background,
  '--header-text': theme.palette.text,
  '--header-border': theme.palette.secondary,
  '--header-accent': theme.palette.accent,
  '--nav-bg': theme.palette.card || theme.palette.surface,
  '--nav-text': theme.palette.text,
  '--nav-hover': theme.palette.hover,
  '--nav-active': theme.palette.primary,
  '--page-title': theme.palette.text,
  '--page-subtitle': theme.palette.secondary,
  '--section-header': theme.palette.text,
  '--section-border': theme.palette.secondary,
  // Comprehensive container colors
  '--container-bg': theme.palette.card || theme.palette.surface,
  '--content-bg': theme.palette.surface,
  '--modal-bg': theme.palette.card || theme.palette.surface,
  '--sidebar-bg': theme.palette.card || theme.palette.surface,
  '--dropdown-bg': theme.palette.card || theme.palette.surface,
  '--tooltip-bg': theme.palette.primary,
  '--overlay-bg': 'rgba(0, 0, 0, 0.5)',
  '--shadow': theme.effects.shadow || '0 4px 20px rgba(0, 0, 0, 0.1)',
  // Theme-specific unique titles
  '--gamepilot-title': getThemeSpecificTitle(theme.id),
  '--home-title': getThemeSpecificHomeTitle(theme.id),
  '--library-title': getThemeSpecificLibraryTitle(theme.id),
  '--stats-title': getThemeSpecificStatsTitle(theme.id),
  '--achievements-title': getThemeSpecificAchievementsTitle(theme.id),
  '--profile-title': getThemeSpecificProfileTitle(theme.id),
  '--settings-title': getThemeSpecificSettingsTitle(theme.id)
});

// Theme-specific unique titles
const getThemeSpecificTitle = (themeId) => {
  const titles = {
    relaxed: "🌴 GamePilot - Chill Zone",
    social: "🔥 GamePilot - Social Hub", 
    focused: "⚡ GamePilot - Focus Mode",
    creative: "🎨 GamePilot - Art Studio",
    escapist: "🌌 GamePilot - Escape Portal",
    tactical: "⚔️ GamePilot - Tactical Command",
    sporty: "⚽ GamePilot - Sports Arena",
    competitive: "🏆 GamePilot - Battle Ground",
    sunset: "🌅 GamePilot - Golden Hour",
    midnight: "🌙 GamePilot - Midnight Mode",
    retro: "🕹️ GamePilot - Retro Arcade",
    forest: "🌲 GamePilot - Forest Realm",
    ocean: "🌊 GamePilot - Ocean Depths"
  };
  return titles[themeId] || "🎮 GamePilot";
};

const getThemeSpecificHomeTitle = (themeId) => {
  const titles = {
    relaxed: "🌴 Chill Home",
    social: "🔥 Social Hub", 
    focused: "⚡ Focus Central",
    creative: "🎨 Art Space",
    escapist: "🌌 Escape Portal",
    tactical: "⚔️ Tactical Base",
    sporty: "⚽ Sports Center",
    competitive: "🏆 Battle Arena",
    sunset: "🌅 Sunset Lounge",
    midnight: "🌙 Midnight Station",
    retro: "🎮 16-Bit Game Room",
    forest: "🌳 Forest Cabin",
    ocean: "🌊 Ocean Deck",
    zen: "🎮 8-Bit Game Room",
    candy: "🍭 Candy Paradise",
    cyberpunk: "🤖 Cyberpunk Nexus",
    noir: "� Comic Headquarters",
    galaxy: "🌌 Space Station"
  };
  return titles[themeId] || "🏠 Home";
};

const getThemeSpecificLibraryTitle = (themeId) => {
  const titles = {
    relaxed: "🌴 Chill Library",
    social: "🔥 Social Collection", 
    focused: "⚡ Focus Library",
    creative: "🎨 Art Gallery",
    escapist: "🌌 Escape Library",
    tactical: "⚔️ Tactical Arsenal",
    sporty: "🏀 Sports Locker",
    competitive: "🏆 Battle Collection",
    sunset: "🌅 Sunset Gallery",
    midnight: "🌙 Midnight Archive",
    retro: "🎮 16-Bit Console",
    forest: "🌳 Forest Library",
    ocean: "🌊 Ocean Archive",
    light: "📚 Library",
    zen: "🎮 8-Bit Arcade",
    candy: "🍭 Candy Shop",
    cyberpunk: "🤖 Cyberpunk Hub",
    noir: "� Comic Library",
    galaxy: "🌌 Cosmic Gateway"
  };
  return titles[themeId] || "📚 Library";
};

const getThemeSpecificStatsTitle = (themeId) => {
  const titles = {
    relaxed: "🌴 Chill Stats",
    social: "🔥 Social Analytics", 
    focused: "⚡ Focus Metrics",
    creative: "🎨 Art Insights",
    escapist: "🌌 Escape Statistics",
    tactical: "⚔️ Tactical Analysis",
    sporty: "⚾ Sports Stats",
    competitive: "🏆 Battle Records",
    sunset: "🌅 Sunset Analytics",
    midnight: "🌙 Midnight Metrics",
    retro: "🎮 16-Bit High Scores",
    forest: "🌳 Forest Stats",
    ocean: "🌊 Ocean Analytics",
    zen: "🎮 8-Bit Stats",
    candy: "🍭 Candy Insights",
    cyberpunk: "🤖 Cyberpunk Data",
    noir: "� Comic Stats",
    galaxy: "🌌 Cosmic Statistics"
  };
  return titles[themeId] || "📊 Statistics";
};

const getThemeSpecificAchievementsTitle = (themeId) => {
  const titles = {
    relaxed: "🌴 Chill Achievements",
    social: "🔥 Social Trophies", 
    focused: "⚡ Focus Medals",
    creative: "🎨 Art Awards",
    escapist: "🌌 Escape Badges",
    tactical: "⚔️ Tactical Honors",
    sporty: "🏆 Sports Trophies",
    competitive: "🏆 Battle Achievements",
    sunset: "🌅 Sunset Awards",
    midnight: "🌙 Midnight Badges",
    retro: "🎮 16-Bit Achievements",
    forest: "🌳 Forest Medals",
    ocean: "🌊 Ocean Trophies",
    zen: "🎮 8-Bit Achievements",
    candy: "🍭 Candy Trophies",
    cyberpunk: "🤖 Cyberpunk Badges",
    noir: "� Comic Achievements",
    galaxy: "🌌 Cosmic Achievements"
  };
  return titles[themeId] || "🏆 Achievements";
};

const getThemeSpecificProfileTitle = (themeId) => {
  const titles = {
    relaxed: "🌴 Chill Profile",
    social: "🔥 Social Profile", 
    focused: "⚡ Focus Profile",
    creative: "🎨 Artist Profile",
    escapist: "🌌 Escape Profile",
    tactical: "⚔️ Tactical Profile",
    sporty: "🎾 Sports Profile",
    competitive: "🏆 Battle Profile",
    sunset: "🌅 Sunset Profile",
    midnight: "🌙 Midnight Profile",
    retro: "🎮 16-Bit Profile",
    forest: "🌳 Forest Profile",
    ocean: "🌊 Ocean Profile",
    zen: "🎮 8-Bit Profile",
    candy: "🍭 Candy Profile",
    cyberpunk: "🤖 Cyberpunk Profile",
    noir: "� Comic Profile",
    galaxy: "🌌 Cosmic Profile"
  };
  return titles[themeId] || "👤 Profile";
};

const getThemeSpecificSettingsTitle = (themeId) => {
  const titles = {
    relaxed: "🌴 Chill Settings",
    social: "🔥 Social Settings", 
    focused: "⚡ Focus Settings",
    creative: "🎨 Art Settings",
    escapist: "🌌 Escape Settings",
    tactical: "⚔️ Tactical Settings",
    sporty: "🏈 Sports Settings",
    competitive: "🏆 Battle Settings",
    sunset: "🌅 Sunset Settings",
    midnight: "🌙 Midnight Settings",
    retro: "🎮 16-Bit Settings",
    forest: "🌳 Forest Settings",
    ocean: "🌊 Ocean Settings",
    zen: "🎮 8-Bit Settings",
    candy: "🍭 Candy Settings",
    cyberpunk: "🤖 Cyberpunk Settings",
    noir: "� Comic Settings",
    galaxy: "🌌 Cosmic Settings"
  };
  return titles[themeId] || "⚙️ Settings";
};

// Theme context
const ThemeContext = createContext(undefined);

export { ThemeContext };

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Load saved theme from localStorage
    const savedTheme = StorageService.getString('theme');
    
    // Get all available themes
    const allThemes = {
      light: { name: 'Light', id: 'light' },
      dark: { name: 'Dark', id: 'dark' }
    };
    
    // Add mood themes
    moodThemes.forEach(theme => {
      allThemes[theme.id] = { name: theme.name, id: theme.id };
    });
    
    // Validate saved theme
    if (savedTheme && allThemes[savedTheme]) {
      const savedMoodTheme = moodThemes.find((theme) => theme.id === savedTheme);
      if (savedMoodTheme && !ProgressionUnlockService.isThemeUnlocked(savedTheme)) {
        console.warn(`Saved theme '${savedTheme}' is now locked by progression, falling back to dark.`);
        return 'dark';
      }
      return savedTheme;
    }

    if (savedTheme) {
      console.warn(`Invalid saved theme '${savedTheme}', falling back to dark. Available themes:`, Object.keys(allThemes));
    }

    return 'dark';
  });

  const [bigScreenMode, setBigScreenMode] = useState(false);
  const [compactMode, setCompactMode] = useState(() => StorageService.getString('compactMode') === 'true');

  // Validate Patreon code and apply XP boost (no direct content unlocks)
  const validatePatreonCode = (code) => {
    const result = AchievementTracker.activatePatreonXPBoost(code);
    if (!result.success) {
      return result;
    }

    const xpStats = AchievementTracker.getXPStats();

    return {
      ...result,
      message: `${result.message} Current level: ${xpStats.level} (${xpStats.totalXP.toLocaleString()} XP).`,
      level: xpStats.level,
      totalXP: xpStats.totalXP
    };
  };

  // Legacy API surface retained for compatibility with older UI flows.
  const selectThemesWithCredits = () => {
    return {
      success: false,
      message: 'Theme credits have been retired. Themes now unlock through XP progression.'
    };
  };

  // Get XP-gated themes with current progression requirement snapshots
  const getAvailableUnlockableThemes = () => {
    return ProgressionUnlockService.getUnlockableThemes().map((theme) => ({
      id: theme.id,
      name: theme.name,
      tier: theme.requiredTier || 'basic',
      description: theme.description || '',
      unlocked: theme.unlocked,
      requiredXP: theme.requiredXP,
      currentXP: theme.currentXP,
      progressPercent: theme.progressPercent
    }));
  };

  // Check if theme is unlocked
  const isThemeUnlocked = (themeId) => {
    return ProgressionUnlockService.isThemeUnlocked(themeId);
  };

  // Get currently unlocked theme ids
  const getUnlockedThemes = () => {
    return moodThemes
      .filter((theme) => ProgressionUnlockService.isThemeUnlocked(theme.id))
      .map((theme) => theme.id);
  };

  // Get unlockable themes by tier
  const getUnlockableThemesByTier = (tier) => {
    return ProgressionUnlockService.getUnlockableThemes().filter((theme) => theme.requiredTier === tier);
  };

  // Get all available themes (filtered by unlock status)
  const getAvailableThemes = () => {
    const themes = {
      light: { name: 'Light', id: 'light' },
      dark: { name: 'Dark', id: 'dark' }
    };

    // Add mood themes with progression unlock metadata
    moodThemes.forEach(theme => {
      const unlockMeta = ProgressionUnlockService.getThemeRequirement(theme.id);
      themes[theme.id] = { 
        name: theme.name, 
        id: theme.id, 
        isUnlockable: unlockMeta.requiredXP > 0,
        requiredTier: theme.requiredTier || null,
        requiredXP: unlockMeta.requiredXP,
        unlocked: unlockMeta.unlocked,
        progressPercent: unlockMeta.progressPercent
      };
    });

    return themes;
  };

  // Get all available themes
  const getAllThemes = () => {
    const themes = {
      light: { name: 'Light', id: 'light' },
      dark: { name: 'Dark', id: 'dark' }
    };
    

    // Add mood themes
    moodThemes.forEach(theme => {
      themes[theme.id] = { name: theme.name, id: theme.id };
    });

    return themes;
  };

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    const allThemes = getAllThemes();

    // Remove all theme classes
    Object.keys(allThemes).forEach(themeId => {
      document.body.classList.remove(`${themeId}`);
    });

    // Add current theme class
    document.body.classList.add(currentTheme);

    // Apply CSS variables based on theme
    const moodTheme = moodThemes.find(t => t.id === currentTheme);
    if (moodTheme) {
      const cssVars = convertMoodThemeToCSS(moodTheme);
      Object.entries(cssVars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });

      // Handle custom background image for custom theme
      if (currentTheme === 'custom') {
        const customBgImage = StorageService.getString('customBgImage');
        const customBgOverlay = StorageService.getString('customBgOverlay', '30');
        
        if (customBgImage) {
          // Apply custom background with overlay
          root.style.setProperty('--custom-bg-image', `linear-gradient(rgba(0, 0, 0, ${parseInt(customBgOverlay) / 100}), rgba(0, 0, 0, ${parseInt(customBgOverlay) / 100})), url(${customBgImage})`);
          root.style.setProperty('--bg-primary', `linear-gradient(rgba(0, 0, 0, ${parseInt(customBgOverlay) / 100}), rgba(0, 0, 0, ${parseInt(customBgOverlay) / 100})), url(${customBgImage})`);
        }
      } else {
        // Clear custom background variables for other themes
        root.style.removeProperty('--custom-bg-image');
      }
    }
  }, [currentTheme]);

  useEffect(() => {
    if (bigScreenMode) {
      document.body.classList.add('big-screen-mode');
    } else {
      document.body.classList.remove('big-screen-mode');
    }
  }, [bigScreenMode]);

  useEffect(() => {
    if (compactMode) {
      document.body.classList.add('compact-mode');
    } else {
      document.body.classList.remove('compact-mode');
    }
  }, [compactMode]);

  useEffect(() => {
    const activeTheme = moodThemes.find((theme) => theme.id === currentTheme);
    if (activeTheme && !ProgressionUnlockService.isThemeUnlocked(currentTheme)) {
      setCurrentTheme('dark');
      StorageService.setString('theme', 'dark');
    }
  }, [currentTheme]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('themeChange', { detail: currentTheme }));
    }
  }, [currentTheme]);

  const toggleBigScreenMode = () => {
    setBigScreenMode(prev => !prev);
  };

  const toggleCompactMode = () => {
    setCompactMode(prev => {
      const next = !prev;
      StorageService.setString('compactMode', String(next));
      return next;
    });
  };

  const value = {
    currentTheme,
    setTheme: (themeId) => {
      const allThemes = getAvailableThemes();
      if (allThemes[themeId]) {
        const selectedTheme = moodThemes.find((theme) => theme.id === themeId);
        if (selectedTheme && !ProgressionUnlockService.isThemeUnlocked(themeId)) {
          console.warn(`Theme '${themeId}' is locked by progression requirements.`);
          return false;
        }
        setCurrentTheme(themeId);
        StorageService.setString('theme', themeId);
        return true;
      } else {
        console.warn(`Theme '${themeId}' is not available. Available themes:`, Object.keys(allThemes));
        // Fall back to dark theme if invalid theme is requested
        setCurrentTheme('dark');
        StorageService.setString('theme', 'dark');
        return false;
      }
    },
    getCurrentTheme: () => getAvailableThemes()[currentTheme] || { name: 'Dark' },
    availableThemes: getAvailableThemes(),
    moodThemes,
    getThemeMeta: (themeId) => moodThemes.find(theme => theme.id === themeId),
    getFounderTier: () => AchievementTracker.getPatreonBoostProfile().tier || null,
    validatePatreonCode,
    selectThemesWithCredits,
    getAvailableUnlockableThemes,
    isThemeUnlocked,
    getUnlockedThemes,
    getUnlockableThemesByTier,
    getAvailableThemes,
    bigScreenMode,
    toggleBigScreenMode,
    compactMode,
    toggleCompactMode
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Export all theme-specific title functions
export { 
  getThemeSpecificTitle,
  getThemeSpecificHomeTitle,
  getThemeSpecificLibraryTitle,
  getThemeSpecificStatsTitle,
  getThemeSpecificAchievementsTitle,
  getThemeSpecificProfileTitle,
  getThemeSpecificSettingsTitle
};

export default ThemeProvider;
