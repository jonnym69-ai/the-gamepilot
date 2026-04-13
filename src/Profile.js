import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Clock, Download, Upload, X, Trophy, Star, User, Camera, Check, Crown, Edit2, TrendingUp, Lock, Image as ImageIcon } from 'lucide-react';
import './Profile.css';
import { useToast } from './components/Toast';
import { GamingIdentity } from './GamingIdentity';
import { AchievementTracker } from './AchievementSystem';
import { DataManager } from './DataManager';
import { UserBehaviorProfile } from './services/UserBehaviorProfile';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';
import { StatsAggregationService } from './services/StatsAggregationService';
import NavBar from './NavBar';
import { BackgroundScanner } from './BackgroundScanner';
import LazyImage from './components/LazyImage';
import GameCalendar from './components/GameCalendar';
import CollapsibleSection from './components/CollapsibleSection';
import EmptyState from './components/EmptyState';
import ExportModal from './components/ExportModal';
import CinematicExport from './components/CinematicExport';
import PlaytimeHeatmap from './components/PlaytimeHeatmap';
import { getGameArtworkPlaceholder, resolveGameArtwork } from './services/GameArtworkService';

const SUPPORT_TIER_WEIGHT = {
  Bronze: 1,
  Silver: 2,
  Gold: 3,
  Platinum: 4
};

const resolveHighestSupportTier = (tiers = []) => {
  return tiers
    .filter((tier) => typeof tier === 'string')
    .sort((left, right) => (SUPPORT_TIER_WEIGHT[right] || 0) - (SUPPORT_TIER_WEIGHT[left] || 0))[0] || null;
};

const getSessionStartTime = (sessionEntry) => {
  if (!sessionEntry) {
    return null;
  }

  if (typeof sessionEntry === 'string') {
    return sessionEntry;
  }

  if (typeof sessionEntry === 'object' && sessionEntry.startTime) {
    return sessionEntry.startTime;
  }

  return null;
};

const buildRankedUsage = (sessions = [], valueSelector) => {
  const counts = {};
  const totalMinutes = {};
  const safeSessions = Array.isArray(sessions) ? sessions : [];

  safeSessions.forEach((session) => {
    const label = typeof valueSelector === 'function' ? valueSelector(session) : null;
    if (!label || label === 'Unknown') {
      return;
    }
    counts[label] = (counts[label] || 0) + 1;
    totalMinutes[label] = (totalMinutes[label] || 0) + Number(session?.playtimeMinutes || 0);
  });

  const totalSessions = safeSessions.length || 1;
  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([label, count]) => ({
      label,
      count,
      sharePercent: Math.round((count / totalSessions) * 100),
      avgPlaytime: Math.round((totalMinutes[label] || 0) / count)
    }));
};

const readActiveSessions = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem('activeGameSessions') || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
};

const Profile = ({ theme, library = [] }) => {
  const { success, error } = useToast();
  const [tempUsername, setTempUsername] = useState('');
  const [tempMessage, setTempMessage] = useState('Ready to find your perfect play?');
  const [gamingIdentity, setGamingIdentity] = useState(null);
  const [xpStats, setXpStats] = useState(null);
  const [completedGames, setCompletedGames] = useState([]);
  const [founderTier, setFounderTier] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [username, setUsername] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('Ready to find your perfect play?');
  const [isEditing, setIsEditing] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCinematicExportOpen, setIsCinematicExportOpen] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [timeFormat, setTimeFormat] = useState('24-hour');
  const [isSyncing, setIsSyncing] = useState(false);
  const [behaviorProfile, setBehaviorProfile] = useState(null);
  const [sessionStats, setSessionStats] = useState(null);
  const [rewardCatalog, setRewardCatalog] = useState(() => ProgressionUnlockService.getProfileRewardCatalog());
  const [rewardSummary, setRewardSummary] = useState(() => ProgressionUnlockService.getRewardCatalogSummary());
  const [selectedSection, setSelectedSection] = useState(0);

  const refreshRewardCatalog = useCallback(() => {
    setRewardCatalog(ProgressionUnlockService.getProfileRewardCatalog());
    setRewardSummary(ProgressionUnlockService.getRewardCatalogSummary());
  }, []);

  // Data management functions
  const handleExportData = async () => {
    try {
      await DataManager.downloadUserData();
      success('Data exported successfully!');
    } catch (err) {
      error(`Export failed: ${err.message}`);
    }
  };

  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = e.target.result;
        const validation = DataManager.validateBackupFile(jsonData);

        if (!validation.valid) {
          error(validation.message);
          return;
        }

        const result = DataManager.importUserData(jsonData);

        if (result.success) {
          success('Data imported successfully! Refreshing page...');

          // Refresh the page to apply imported data
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          error(result.message);
        }
      } catch (err) {
        error(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear ALL user data? This cannot be undone!')) {
      try {
        const result = DataManager.clearAllUserData();
        if (result.success) {
          success('All data cleared successfully! Refreshing page...');
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          error(result.message);
        }
      } catch (err) {
        error(`Failed to clear data: ${err.message}`);
      }
    }
  };

  // Offline sync functions
  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      const results = await window.OfflineManager?.syncPendingOperations?.();

      if (results && results.length > 0) {
        const successful = results.filter(r => r.success).length;
        const failed = results.length - successful;
        success(`Sync completed: ${successful} successful, ${failed} failed`);
      } else {
        success('No pending operations to sync');
      }
    } catch (err) {
      error(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Check for library updates quietly
  useEffect(() => {
    if (library.length > 0) {
      BackgroundScanner.startScan(
        ['steam', 'epic', 'xbox', 'gog', 'ea', 'ubisoft', 'playstation', 'battlenet'],
        null,
        (stats) => {
          if (stats && (stats.newGames > 0 || stats.updatedGames > 0)) {
            success(`Found ${stats.newGames} new and updated ${stats.updatedGames} games`);
            StatsAggregationService.clearCache();
          }
        }
      );
    }
  }, [library.length, success]);

  // Load completed games from localStorage
  useEffect(() => {
    const savedCompletedGames = localStorage.getItem('completedGames');
    if (savedCompletedGames) {
      try {
        const parsedCompletedGames = JSON.parse(savedCompletedGames);
        setCompletedGames(Array.isArray(parsedCompletedGames) ? parsedCompletedGames : []);
      } catch (error) {
        setCompletedGames([]);
      }
    }
  }, []);

  // Save completed games to localStorage
  const saveCompletedGames = useCallback((newCompletedGames) => {
    localStorage.setItem('completedGames', JSON.stringify(newCompletedGames));
  }, []);

  // Add game to completed list
  const addCompletedGame = useCallback((gameName) => {
    setCompletedGames(prev => {
      const exists = prev.some(g => g.name === gameName);
      if (!exists) {
        const newGames = [...prev, { 
          name: gameName, 
          completedAt: new Date().toISOString(),
          playTime: Math.floor(Math.random() * 100) + 50 // Random playtime between 50-150 minutes
        }];
        saveCompletedGames(newGames);
        
        // Update gaming identity
        const identity = GamingIdentity.getProfile();
        if (identity && identity.totalGames) {
          identity.totalGames += 1;
          GamingIdentity.updateGamingIdentity();
        }
        
        success(`${gameName} added to completed games!`);
        return newGames;
      }
      return prev;
    });
  }, [saveCompletedGames, success]);

  // Remove game from completed list
  const removeCompletedGame = useCallback((gameName) => {
    setCompletedGames(prev => {
      const newGames = prev.filter(g => g.name !== gameName);
      saveCompletedGames(newGames);
      success(`${gameName} removed from completed games`);
      return newGames;
    });
  }, [saveCompletedGames, success]);

  // Mark game as 100% completed
  const markGameCompleted = useCallback((gameName) => {
    setCompletedGames(prev => {
      const updated = prev.map(g =>
        g.name === gameName
          ? { ...g, completionRate: 100 }
          : g
      );
      saveCompletedGames(updated);
      success(`${gameName} marked as 100% completed!`);
      return updated;
    });
  }, [saveCompletedGames, success]);

  // Get completion stats
  const getCompletionStats = useCallback(() => {
    const total = completedGames.length;
    const fullyCompleted = completedGames.filter(g => g.completionRate === 100).length;
    const partiallyCompleted = total - fullyCompleted;

    return {
      total,
      fullyCompleted,
      partiallyCompleted,
      completionRate: total > 0 ? Math.round((fullyCompleted / total) * 100) : 0
    };
  }, [completedGames]);

  const handleApplyRewardChange = useCallback((result) => {
    if (!result?.success) {
      error(result?.message || 'Unable to update profile reward.');
      return false;
    }

    refreshRewardCatalog();
    success(result.message);
    return true;
  }, [error, refreshRewardCatalog, success]);

  const handleEquipProfileFrame = useCallback((frameId) => {
    handleApplyRewardChange(ProgressionUnlockService.selectProfileFrame(frameId));
  }, [handleApplyRewardChange]);

  const handleEquipProfileBanner = useCallback((bannerId) => {
    handleApplyRewardChange(ProgressionUnlockService.selectProfileBanner(bannerId));
  }, [handleApplyRewardChange]);

  const handleEquipProfileTitle = useCallback((titleId) => {
    handleApplyRewardChange(ProgressionUnlockService.selectProfileTitle(titleId));
  }, [handleApplyRewardChange]);

  const handleEquipRecommendationPack = useCallback((packId) => {
    handleApplyRewardChange(ProgressionUnlockService.selectRecommendationPack(packId));
  }, [handleApplyRewardChange]);

  // Calculate active sessions
  const activeSessionGames = useMemo(() => {
    const activeSessions = readActiveSessions();
    return Object.keys(activeSessions).map(gameName => {
      const game = library?.find(g => g.name === gameName);
      if (!game) return null;

      const sessionStartValue = getSessionStartTime(activeSessions[gameName]);
      if (!sessionStartValue) return null;

      const sessionStart = new Date(sessionStartValue);
      const currentMinutes = Math.round((Date.now() - sessionStart.getTime()) / 60000);
      
      // Check if this is a launcher-based game that might be inaccurate
      const isLauncherBased = ['EA', 'Rockstar', 'Uplay'].includes(game.platform);
      const session = activeSessions[gameName];
      const isPaused = session && session.paused;

      return {
        ...game,
        sessionStart: sessionStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sessionMinutes: currentMinutes,
        sessionStartTime: sessionStartValue,
        isLauncherBased,
        isPaused,
        sessionMetadata: session?.metadata || {}
      };
    }).filter(Boolean);
  }, [library]);

  const selectedProfileBanner = useMemo(() => {
    const selectedId = rewardCatalog?.customization?.selectedBanner;
    return rewardCatalog?.banners?.find((banner) => banner.id === selectedId) || rewardCatalog?.banners?.[0] || null;
  }, [rewardCatalog]);

  const selectedProfileTitle = useMemo(() => {
    const selectedId = rewardCatalog?.customization?.selectedTitle;
    return rewardCatalog?.titles?.find((title) => title.id === selectedId) || rewardCatalog?.titles?.[0] || null;
  }, [rewardCatalog]);

  const selectedLibraryVariant = useMemo(() => {
    const selectedId = rewardCatalog?.presentationCustomization?.selectedLibraryVariant;
    return rewardCatalog?.libraryVariants?.find((variant) => variant.id === selectedId) || rewardCatalog?.libraryVariants?.[0] || null;
  }, [rewardCatalog]);

  const selectedHomeLayout = useMemo(() => {
    const selectedId = rewardCatalog?.presentationCustomization?.selectedHomeLayout;
    return rewardCatalog?.homeLayouts?.find((layout) => layout.id === selectedId) || rewardCatalog?.homeLayouts?.[0] || null;
  }, [rewardCatalog]);

  const selectedProfileFrame = useMemo(() => {
    const selectedId = rewardCatalog?.customization?.selectedFrame;
    return rewardCatalog?.frames?.find((frame) => frame.id === selectedId) || rewardCatalog?.frames?.[0] || null;
  }, [rewardCatalog]);

  const selectedRecommendationPack = useMemo(() => {
    const selectedId = rewardCatalog?.presentationCustomization?.selectedRecommendationPack;
    return rewardCatalog?.recommendationPacks?.find((pack) => pack.id === selectedId) || rewardCatalog?.recommendationPacks?.[0] || null;
  }, [rewardCatalog]);

  const rewardTypeSummary = useMemo(() => {
    const progressionGroups = rewardSummary?.progressionGroups || {};

    return {
      themes: progressionGroups.themes || { unlocked: 0, total: 0 },
      audio: progressionGroups.audio || { unlocked: 0, total: 0 },
      cosmetic: {
        ...(progressionGroups.cosmetics || { unlocked: 0, total: 0 })
      },
      utility: {
        ...(progressionGroups.utility || { unlocked: 0, total: 0 })
      }
    };
  }, [rewardSummary]);

  const unlockedShowcaseSlotCount = rewardSummary?.showcaseSlotsUnlocked || 0;
  const upcomingUnlocks = rewardSummary?.upcomingUnlocks || [];

  const showcasedAchievements = useMemo(() => {
    const pointsMap = AchievementTracker.getAchievementPoints();
    return (rewardCatalog?.customization?.showcasedAchievements || []).map((achievementId) => {
      const achievement = AchievementTracker.getAchievementById(achievementId);
      if (!achievement) {
        return null;
      }

      return {
        id: achievementId,
        name: achievement.name,
        description: achievement.description,
        points: pointsMap[achievementId] || 0
      };
    }).filter(Boolean);
  }, [rewardCatalog]);

  const availableShowcaseAchievements = useMemo(() => {
    const pointsMap = AchievementTracker.getAchievementPoints();
    const selectedIds = new Set(rewardCatalog?.customization?.showcasedAchievements || []);
    const recentUnlockIds = new Set(AchievementTracker.getRecentlyUnlocked().map((entry) => entry.id));

    return AchievementTracker.getUnlockedAchievements()
      .map((achievementId) => {
        const achievement = AchievementTracker.getAchievementById(achievementId);
        if (!achievement) {
          return null;
        }

        return {
          id: achievementId,
          name: achievement.name,
          description: achievement.description,
          points: pointsMap[achievementId] || 0,
          isSelected: selectedIds.has(achievementId),
          isRecent: recentUnlockIds.has(achievementId)
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (left.isSelected !== right.isSelected) {
          return left.isSelected ? -1 : 1;
        }
        if (left.isRecent !== right.isRecent) {
          return left.isRecent ? -1 : 1;
        }
        if (left.points !== right.points) {
          return right.points - left.points;
        }
        return left.name.localeCompare(right.name);
      });
  }, [rewardCatalog]);

  const emptyShowcaseSlots = Math.max(0, unlockedShowcaseSlotCount - showcasedAchievements.length);

  const handleToggleShowcaseAchievement = useCallback((achievementId) => {
    const selectedIds = rewardCatalog?.customization?.showcasedAchievements || [];
    const achievement = AchievementTracker.getAchievementById(achievementId);
    const achievementName = achievement?.name || 'Achievement';
    const isSelected = selectedIds.includes(achievementId);

    if (!isSelected && selectedIds.length >= unlockedShowcaseSlotCount) {
      error(`You have ${unlockedShowcaseSlotCount} showcase slot${unlockedShowcaseSlotCount === 1 ? '' : 's'} unlocked. Remove one before adding another.`);
      return;
    }

    const nextSelection = isSelected
      ? selectedIds.filter((id) => id !== achievementId)
      : [...selectedIds, achievementId];

    ProgressionUnlockService.setShowcasedAchievements(nextSelection);
    refreshRewardCatalog();
    success(isSelected ? `${achievementName} removed from your showcase.` : `${achievementName} added to your showcase.`);
  }, [error, refreshRewardCatalog, rewardCatalog, success, unlockedShowcaseSlotCount]);

  // Handle ending sessions
  const handleEndSession = (gameName) => {
    if (window.endSession) {
      window.endSession(gameName);
    } else {
      const sessions = readActiveSessions();
      if (sessions[gameName]) {
        const sessionStartValue = getSessionStartTime(sessions[gameName]);
        const sessionStart = sessionStartValue ? new Date(sessionStartValue) : null;
        const sessionMinutes = sessionStart && !Number.isNaN(sessionStart.getTime())
          ? Math.max(0, Math.floor((Date.now() - sessionStart.getTime()) / (1000 * 60)))
          : 0;
        
        alert(`Ended session for ${gameName}: ${sessionMinutes} minutes recorded`);
        delete sessions[gameName];
        localStorage.setItem('activeGameSessions', JSON.stringify(sessions));
      }
    }
  };

  // Get most played games
  const mostPlayedGames = sessionStats?.mostPlayedGames || [];

  const getGreetingTime = (hour) => {
    if (hour < 12) return '🌅 Morning Gaming Session';
    if (hour < 17) return '☀️ Afternoon Gaming Session';
    if (hour < 21) return '🌆 Evening Gaming Session';
    return '🌙 Night Gaming Session';
  };

  const welcomeMessages = [
    'Ready to find your perfect play?',
    'Time for some gaming!',
    'Let\'s play something awesome!',
    'Your next adventure awaits!',
    'Game on!',
    'Ready to level up?',
    'Let\'s dive into some games!',
    'Your gaming session starts now!'
  ];

  useEffect(() => {
    const savedUsername = localStorage.getItem('profileUsername') || '';
    const savedProfilePic = localStorage.getItem('profilePic') || '';
    const savedMessage = localStorage.getItem('welcomeMessage') || 'Ready to find your perfect play?';
    const savedTimezone = localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const savedTimeFormat = localStorage.getItem('timeFormat') || '24-hour';
    
    console.log('[Profile] Loading saved data:', {
      username: savedUsername,
      hasProfilePic: !!savedProfilePic,
      message: savedMessage,
      timezone: savedTimezone,
      timeFormat: savedTimeFormat
    });

    setUsername(savedUsername);
    setProfilePic(savedProfilePic);
    setWelcomeMessage(savedMessage);
    setTimezone(savedTimezone);
    setTimeFormat(savedTimeFormat);
    setTempUsername(savedUsername);
    setTempMessage(savedMessage);
    
    let userFounders = [];
    try {
      const parsedFounders = JSON.parse(localStorage.getItem('userFounders') || '[]');
      userFounders = Array.isArray(parsedFounders) ? parsedFounders : [];
    } catch (err) {
      userFounders = [];
    }
    const currentUser = userFounders.find(founder => founder.name === savedUsername);
    const boostTier = AchievementTracker.getPatreonBoostProfile().tier || null;
    const effectiveSupportTier = resolveHighestSupportTier([currentUser?.tier, boostTier]);

    setIsFounder(Boolean(effectiveSupportTier));
    setFounderTier(effectiveSupportTier);
    
    const identity = GamingIdentity.getProfile();
    setGamingIdentity(identity);

    const xpData = AchievementTracker.getXPStats();
    setXpStats(xpData);

    // Load behavior profile and session stats
    const rawBehaviorProfile = UserBehaviorProfile.getProfile();

    const statsDashboard = StatsAggregationService.getDashboardData(library);
    const allTimeSnapshot = statsDashboard?.periods?.all;
    const normalizedSessions = StatsAggregationService.getNormalizedSessionHistory(library);
    const topMoodUsage = buildRankedUsage(normalizedSessions, (session) => session?.mood);
    const topGenreUsage = buildRankedUsage(normalizedSessions, (session) => session?.primaryGenre);

    setBehaviorProfile({
      totalSelectionsTracked: Number(allTimeSnapshot?.sessions || normalizedSessions.length || 0),
      totalCompleted: Number(allTimeSnapshot?.uniqueGames || 0),
      overallCompletionRate: 0,
      avgSessionLength: Number(allTimeSnapshot?.avgSessionMinutes || 0),
      topMoods: topMoodUsage,
      topGenres: topGenreUsage,
      lastUpdated: rawBehaviorProfile?.lastUpdated || null
    });

    const canonicalMostPlayedGames = (allTimeSnapshot?.topGames || []).slice(0, 5).map((game) => {
      const matchingLibraryGame = Array.isArray(library)
        ? library.find((entry) => {
          const entryId = entry?.appid || entry?.app_id || entry?.steamAppId || entry?.name;
          return String(entryId) === String(game.id) || entry?.name === game.name;
        })
        : null;

      return {
        name: game.name,
        iconUrl: matchingLibraryGame?.iconUrl || matchingLibraryGame?.icon || '',
        gameName: game.name,
        totalPlaytime: game.totalPlaytime,
        totalMinutes: game.totalPlaytime,
        sessions: game.sessions
      };
    });

    const stats = {
      mostPlayedGames: canonicalMostPlayedGames,
      peakHours: UserBehaviorProfile.getPeakPlayHours(3)
    };
    setSessionStats(stats);
    refreshRewardCatalog();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [library, refreshRewardCatalog]);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        error('Image size must be less than 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target.result;
        setProfilePic(result);
        if (!isEditing) {
          localStorage.setItem('profilePic', result);
          success('Profile picture updated!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (tempUsername.trim()) {
      setUsername(tempUsername.trim());
      setWelcomeMessage(tempMessage);
      localStorage.setItem('profileUsername', tempUsername.trim());
      localStorage.setItem('profilePic', profilePic);
      localStorage.setItem('welcomeMessage', tempMessage);
      success('Profile updated successfully!');
      setIsEditing(false);
    } else {
      error('Username cannot be empty!');
    }
  };

  const handleCancel = () => {
    setTempUsername(username);
    setTempMessage(welcomeMessage);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setTempUsername(username);
    setTempMessage(welcomeMessage);
    setIsEditing(true);
  };

  const removeProfilePic = () => {
    setProfilePic('');
    localStorage.removeItem('profilePic');
    success('Profile picture removed!');
  };

  const handleProfileControllerInput = useCallback((action) => {
    const sectionsCount = 5; // Adjust based on navigable sections in Profile
    if (action === 'down' && selectedSection < sectionsCount - 1) {
      setSelectedSection(prev => prev + 1);
      return true;
    } else if (action === 'up' && selectedSection > 0) {
      setSelectedSection(prev => prev - 1);
      return true;
    } else if (action === 'confirm') {
      // Trigger action based on selected section, e.g., open a modal or navigate
      console.log('Controller confirm on section:', selectedSection);
      return true;
    }
    return false;
  }, [selectedSection]);

  const getSectionClass = useCallback((index) => {
    return `profile-section ${selectedSection === index ? 'selected' : ''}`;
  }, [selectedSection]);

  useEffect(() => {
    const handleGlobalControllerInput = (event) => {
      if (handleProfileControllerInput(event?.detail?.action)) {
        event.preventDefault();
      }
    };
    window.addEventListener('controllerInput', handleGlobalControllerInput);
    return () => window.removeEventListener('controllerInput', handleGlobalControllerInput);
  }, [handleProfileControllerInput]);

  return (
    <div className="profile-page">
        <NavBar />
        <div className="profile-content">
          <div className="profile-container">
          <div className="profile-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <User size={32} />
              <h1 className="profile-title" style={{ margin: 0 }}>{username ? `${username}'s Profile` : 'Player Profile'}</h1>
            </div>
            <div className="profile-header-actions" style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="action-btn" 
                onClick={() => setIsCinematicExportOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border-color)', color: 'var(--text)', cursor: 'pointer' }}
              >
                <ImageIcon size={16} /> Cinematic Poster
              </button>
              <button 
                className="action-btn" 
                onClick={() => setIsExportModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border-color)', color: 'var(--text)', cursor: 'pointer' }}
              >
                <Download size={16} /> Export Data
              </button>
            </div>
          </div>

          <div
            className="profile-card reward-profile-card"
            style={selectedProfileBanner ? { '--profile-banner-preview': selectedProfileBanner.preview } : undefined}
          >
          <div className="profile-picture-section">
            <div
              className="profile-picture-container"
              style={selectedProfileFrame ? {
                borderColor: selectedProfileFrame.accentColor,
                boxShadow: `0 10px 30px ${selectedProfileFrame.shadowColor}`
              } : undefined}
            >
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="profile-picture" />
              ) : (
                <div className="profile-picture-placeholder">
                  <User size={48} />
                </div>
              )}
              {!isEditing && (
                <div className="profile-picture-overlay">
                  <label htmlFor="profile-pic-upload" className="camera-button">
                    <Camera size={20} />
                  </label>
                  <input
                    id="profile-pic-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                  {profilePic && (
                    <button onClick={removeProfilePic} className="remove-pic-button">
                      <X size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="profile-info">
            <div
              className="profile-identity-banner"
              style={selectedProfileBanner ? { background: selectedProfileBanner.preview } : undefined}
            >
              <div className="profile-identity-banner-copy">
                <span className="profile-identity-label">Equipped Banner</span>
                <strong>{selectedProfileBanner?.name || 'Pilot Sunset'}</strong>
                <p>{selectedProfileTitle?.name || 'Rookie Pilot'}</p>
              </div>
              <div className="profile-identity-banner-meta">
                <span>{selectedProfileFrame?.name || 'Starter Halo'}</span>
                <span>{unlockedShowcaseSlotCount} showcase slot{unlockedShowcaseSlotCount === 1 ? '' : 's'}</span>
              </div>
            </div>
            {isEditing ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={tempUsername}
                    onChange={(e) => setTempUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="profile-input"
                    maxLength={20}
                  />
                </div>

                <div className="form-group">
                  <label>Welcome Message</label>
                  <select
                    value={tempMessage}
                    onChange={(e) => setTempMessage(e.target.value)}
                    className="profile-select"
                  >
                    {welcomeMessages.map((message, index) => (
                      <option key={index} value={message}>
                        {message}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="edit-actions">
                  <button onClick={handleSave} className="save-button">
                    <Check size={16} />
                    Save
                  </button>
                  <button onClick={handleCancel} className="cancel-button">
                    <X size={16} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="profile-display">
                <div className="username-display">
                  <h2>{username || 'Guest Player'}</h2>
                  {selectedProfileTitle && (
                    <div className="profile-title-pill">
                      <Star size={14} />
                      <span>{selectedProfileTitle.name}</span>
                    </div>
                  )}
                  {isFounder && (
                    <div className={`founder-badge ${founderTier.toLowerCase()}`}>
                      <Crown size={16} />
                      <span>{founderTier} Founder</span>
                    </div>
                  )}
                  <button onClick={handleEdit} className="edit-button">
                    <Edit2 size={16} />
                    Edit Profile
                  </button>
                </div>
                <div className="welcome-message-display">
                  <p>"{welcomeMessage}"</p>
                </div>
                <div className="profile-equipped-meta">
                  <span>Frame: {selectedProfileFrame?.name || 'Starter Halo'}</span>
                  <span>Banner: {selectedProfileBanner?.name || 'Pilot Sunset'}</span>
                </div>
                {(showcasedAchievements.length > 0 || emptyShowcaseSlots > 0) && (
                  <div className="profile-showcase-strip">
                    {showcasedAchievements.map((achievement) => (
                      <div key={achievement.id} className="profile-showcase-chip">
                        <span className="profile-showcase-chip-name">{achievement.name}</span>
                        <span className="profile-showcase-chip-points">+{achievement.points} XP</span>
                      </div>
                    ))}
                    {Array.from({ length: emptyShowcaseSlots }).map((_, index) => (
                      <div key={`empty-showcase-${index}`} className="profile-showcase-chip empty">
                        <span>Empty showcase slot</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Date & Time Section */}
        <CollapsibleSection
          title="Current Session"
          subtitle="Clock, timezone, and live play window context."
          badge={timeFormat === '12-hour' ? '12h clock' : '24h clock'}
          icon={<Clock size={18} />}
          className={getSectionClass(0)}
          defaultOpen
        >
          <div className="datetime-card">
            <h3>Current Session</h3>
            <div className="datetime-display">
              <div className="date-section">
                <div className="date-label">Today</div>
                <div className="date-value">
                  {currentTime.toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: timezone
                  })}
                </div>
              </div>
              <div className="time-section">
                <div className="time-label">Current Time</div>
                <div className="time-value">
                  {currentTime.toLocaleTimeString(timeFormat === '12-hour' ? 'en-US' : 'en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: timeFormat === '12-hour',
                    timeZone: timezone
                  })}
                </div>
              </div>
              <div className="session-info">
                <div className="session-label">Gaming Session</div>
                <div className="session-value">
                  {getGreetingTime(currentTime.getHours())}
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Gaming Identity Section */}
        {gamingIdentity && gamingIdentity.identity && (
          <CollapsibleSection
            title="Gaming Identity"
            subtitle="Your playstyle summary and identity traits."
            badge={gamingIdentity.identity.personality}
            icon={<User size={18} />}
            className={getSectionClass(1)}
          >
            <div className="gaming-identity-card">
              <h3>Gaming Identity</h3>
              <div className="identity-header">
                <div className="level-badge">
                  <div className="level-number">{xpStats ? xpStats.level : gamingIdentity.level}</div>
                  <div className="level-text">Level</div>
                </div>
                <div className="title-section">
                  <h4>{gamingIdentity.title}</h4>
                  <p className="identity-description">{gamingIdentity.identity.description}</p>
                </div>
              </div>
              <div className="identity-stats">
                <div className="identity-trait">
                  <span className="trait-label">Personality:</span>
                  <span className="trait-value">{gamingIdentity.identity.personality}</span>
                </div>
                <div className="identity-trait">
                  <span className="trait-label">Play Style:</span>
                  <span className="trait-value">{gamingIdentity.identity.playStyle}</span>
                </div>
                <div className="identity-trait">
                  <span className="trait-label">Favorite Mood:</span>
                  <span className="trait-value">{gamingIdentity.identity.favoriteMood}</span>
                </div>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* XP & Level Section */}
        {xpStats && (
          <CollapsibleSection
            title="Experience & Level"
            subtitle="Your XP totals, level progress, and source breakdown."
            badge={`Lv ${xpStats.level}`}
            icon={<Star size={18} />}
            className={getSectionClass(2)}
            defaultOpen
          >
            <div className="gaming-identity-card">
              <h3>Experience & Level</h3>
              <div className="identity-header">
                <div className="level-badge">
                  <div className="level-number">{xpStats.level}</div>
                  <div className="level-text">Level</div>
                </div>
                <div className="title-section">
                  <h4>Gaming Experience</h4>
                  <p className="xp-total">{xpStats.totalXP.toLocaleString()} XP Total</p>
                </div>
              </div>
              <div className="xp-progress-section">
                <div className="xp-progress-header">
                  <span>Level {xpStats.level} Progress</span>
                  <span>{xpStats.xpProgress}/{xpStats.xpToNextLevel} XP</span>
                </div>
                <div className="xp-progress-bar">
                  <div 
                    className="xp-progress-fill"
                    style={{ width: `${xpStats.levelProgress}%` }}
                  ></div>
                </div>
              </div>
              <div className="xp-breakdown">
                <div className="xp-source">
                  <Trophy size={16} />
                  <span>Achievements: {xpStats.achievementXP} XP</span>
                </div>
                <div className="xp-source">
                  <Clock size={16} />
                  <span>Playtime: {xpStats.playtimeXP} XP</span>
                </div>
                <div className="xp-source">
                  <Star size={16} />
                  <span>Total: {xpStats.totalXP} XP</span>
                </div>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {rewardSummary && (
          <CollapsibleSection
            title="Reward Economy"
            subtitle="XP totals, category counts, and the next unlocks on your roadmap."
            badge={rewardSummary.nextUnlock ? `${rewardSummary.nextUnlock.remainingXP.toLocaleString()} XP left` : 'Complete'}
            icon={<Trophy size={18} />}
            className={getSectionClass(3)}
          >
            <div className="gaming-identity-card">
              <h3>Reward Economy</h3>
            <div className="reward-summary-grid">
              <div className="reward-summary-card reward-type-card">
                <span className="reward-summary-label">Gameplay Rewards</span>
                <strong className="reward-summary-value">Lv {rewardSummary.level}</strong>
                <span className="reward-summary-caption">{rewardSummary.xp.toLocaleString()} XP fuels every unlock</span>
              </div>
              <div className="reward-summary-card reward-type-card">
                <span className="reward-summary-label">Theme Rewards</span>
                <strong className="reward-summary-value">{rewardTypeSummary.themes.unlocked}/{rewardTypeSummary.themes.total}</strong>
                <span className="reward-summary-caption">Premium themes unlocked by XP tier progression</span>
              </div>
              <div className="reward-summary-card reward-type-card">
                <span className="reward-summary-label">Audio Rewards</span>
                <strong className="reward-summary-value">{rewardTypeSummary.audio.unlocked}/{rewardTypeSummary.audio.total}</strong>
                <span className="reward-summary-caption">Music, atmosphere, and button packs unlocked one by one</span>
              </div>
              <div className="reward-summary-card reward-type-card">
                <span className="reward-summary-label">Cosmetic Rewards</span>
                <strong className="reward-summary-value">{rewardTypeSummary.cosmetic.unlocked}/{rewardTypeSummary.cosmetic.total}</strong>
                <span className="reward-summary-caption">Profile identity and recommendation cosmetics</span>
              </div>
              <div className="reward-summary-card reward-type-card">
                <span className="reward-summary-label">Utility Rewards</span>
                <strong className="reward-summary-value">{rewardTypeSummary.utility.unlocked}/{rewardTypeSummary.utility.total}</strong>
                <span className="reward-summary-caption">Showcase slots plus Home and Library presentation tools</span>
              </div>
            </div>
            <div className="reward-summary-grid">
              <div className="reward-summary-card">
                <span className="reward-summary-label">Premium Themes</span>
                <strong className="reward-summary-value">{rewardSummary.unlockedCounts.premiumThemes}/{rewardSummary.totalCounts.premiumThemes}</strong>
                <span className="reward-summary-caption">Theme variants waiting across XP tiers</span>
              </div>
              <div className="reward-summary-card">
                <span className="reward-summary-label">Music Packs</span>
                <strong className="reward-summary-value">{rewardSummary.unlockedCounts.musicPacks}/{rewardSummary.totalCounts.musicPacks}</strong>
                <span className="reward-summary-caption">Background tracks available in Settings</span>
              </div>
              <div className="reward-summary-card">
                <span className="reward-summary-label">Atmosphere Packs</span>
                <strong className="reward-summary-value">{rewardSummary.unlockedCounts.ambientPacks}/{rewardSummary.totalCounts.ambientPacks}</strong>
                <span className="reward-summary-caption">Ambient loops for theme matching or manual selection</span>
              </div>
              <div className="reward-summary-card">
                <span className="reward-summary-label">Button Packs</span>
                <strong className="reward-summary-value">{rewardSummary.unlockedCounts.buttonPacks}/{rewardSummary.totalCounts.buttonPacks}</strong>
                <span className="reward-summary-caption">UI interaction sounds unlocked over time</span>
              </div>
              <div className="reward-summary-card">
                <span className="reward-summary-label">Frames</span>
                <strong className="reward-summary-value">{rewardSummary.unlockedCounts.frames}/{rewardSummary.totalCounts.frames}</strong>
                <span className="reward-summary-caption">Unlocked profile frames</span>
              </div>
              <div className="reward-summary-card">
                <span className="reward-summary-label">Banners</span>
                <strong className="reward-summary-value">{rewardSummary.unlockedCounts.banners}/{rewardSummary.totalCounts.banners}</strong>
                <span className="reward-summary-caption">Unlocked banner styles</span>
              </div>
              <div className="reward-summary-card">
                <span className="reward-summary-label">Titles</span>
                <strong className="reward-summary-value">{rewardSummary.unlockedCounts.titles}/{rewardSummary.totalCounts.titles}</strong>
                <span className="reward-summary-caption">Unlocked identity titles</span>
              </div>
              <div className="reward-summary-card">
                <span className="reward-summary-label">Recommendation Packs</span>
                <strong className="reward-summary-value">{rewardSummary.unlockedCounts.recommendationPacks}/{rewardSummary.totalCounts.recommendationPacks}</strong>
                <span className="reward-summary-caption">Cosmetic recommendation skins</span>
              </div>
              <div className="reward-summary-card">
                <span className="reward-summary-label">Showcase Slots</span>
                <strong className="reward-summary-value">{rewardSummary.showcaseSlotsUnlocked}/{rewardSummary.showcaseSlotsTotal}</strong>
                <span className="reward-summary-caption">Achievement slots on profile</span>
              </div>
              <div className="reward-summary-card">
                <span className="reward-summary-label">Library Variants</span>
                <strong className="reward-summary-value">{rewardSummary.unlockedCounts.libraryVariants}/{rewardSummary.totalCounts.libraryVariants}</strong>
                <span className="reward-summary-caption">Presentation styles for your library</span>
              </div>
              <div className="reward-summary-card">
                <span className="reward-summary-label">Home Layouts</span>
                <strong className="reward-summary-value">{rewardSummary.unlockedCounts.homeLayouts}/{rewardSummary.totalCounts.homeLayouts}</strong>
                <span className="reward-summary-caption">Mission-control layouts for Home</span>
              </div>
            </div>
            {rewardSummary.nextUnlock && (
              <div className="next-reward-card">
                <div className="next-reward-header">
                  <div>
                    <span className="next-reward-label">Next Unlock</span>
                    <h4>{rewardSummary.nextUnlock.name}</h4>
                    <p>{rewardSummary.nextUnlock.description}</p>
                  </div>
                  <div className="next-reward-requirement">{rewardSummary.nextUnlock.requiredXP.toLocaleString()} XP</div>
                </div>
                <div className="xp-progress-bar">
                  <div
                    className="xp-progress-fill"
                    style={{ width: `${rewardSummary.nextUnlock.progressPercent}%` }}
                  ></div>
                </div>
                <div className="next-reward-footer">
                  <span>{rewardSummary.nextUnlock.category}</span>
                  <span>{rewardSummary.nextUnlock.remainingXP.toLocaleString()} XP remaining</span>
                </div>
              </div>
            )}
            {upcomingUnlocks.length > 0 && (
              <div className="reward-summary-grid" style={{ marginTop: '20px' }}>
                {upcomingUnlocks.map((unlock) => (
                  <div key={`${unlock.category}-${unlock.id}`} className="reward-summary-card">
                    <span className="reward-summary-label">{unlock.category}</span>
                    <strong style={{ color: 'var(--text)', fontSize: '1.05rem', lineHeight: 1.35 }}>{unlock.name}</strong>
                    <span className="reward-summary-caption">{unlock.requiredXP.toLocaleString()} XP • {unlock.remainingXP.toLocaleString()} XP remaining</span>
                  </div>
                ))}
              </div>
            )}
            </div>
          </CollapsibleSection>
        )}

        {rewardCatalog && (
          <CollapsibleSection
            title="Reward Catalog"
            subtitle="Browse every unlockable profile, presentation, theme, and audio reward."
            badge="Unlockables"
            icon={<Lock size={18} />}
            className={getSectionClass(4)}
          >
            <div className="gaming-identity-card">
              <h3>Reward Catalog</h3>
            <div className="reward-customization-layout">
              <CollapsibleSection
                title="Theme + Audio Rewards"
                subtitle="Premium themes and individual audio packs unlocked across XP milestones."
                badge={`${rewardTypeSummary.themes.unlocked + rewardTypeSummary.audio.unlocked}/${rewardTypeSummary.themes.total + rewardTypeSummary.audio.total} unlocked`}
                icon={<Star size={18} />}
                className="profile-folder reward-folder"
              >
                <div className="reward-type-shell">
                  <div className="reward-type-shell-header">
                    <span className="reward-type-shell-kicker">Theme + Audio Rewards</span>
                    <h4>Appearance and audio now have dedicated destinations</h4>
                    <p>Use Themes for visual browsing and use Settings for toggles like music, ambient sound, and controller mode.</p>
                  </div>

                  <div className="reward-summary-grid">
                    <div className="reward-summary-card">
                      <span className="reward-summary-label">Premium Themes</span>
                      <strong className="reward-summary-value">{rewardSummary.unlockedCounts.premiumThemes}/{rewardSummary.totalCounts.premiumThemes}</strong>
                      <span className="reward-summary-caption">Unlocked through XP tier progression</span>
                    </div>
                    <div className="reward-summary-card">
                      <span className="reward-summary-label">Music Packs</span>
                      <strong className="reward-summary-value">{rewardSummary.unlockedCounts.musicPacks}/{rewardSummary.totalCounts.musicPacks}</strong>
                      <span className="reward-summary-caption">Background tracks configurable in Settings</span>
                    </div>
                    <div className="reward-summary-card">
                      <span className="reward-summary-label">Atmosphere Packs</span>
                      <strong className="reward-summary-value">{rewardSummary.unlockedCounts.ambientPacks}/{rewardSummary.totalCounts.ambientPacks}</strong>
                      <span className="reward-summary-caption">Ambient loops for mood and theme matching</span>
                    </div>
                    <div className="reward-summary-card">
                      <span className="reward-summary-label">Button Packs</span>
                      <strong className="reward-summary-value">{rewardSummary.unlockedCounts.buttonPacks}/{rewardSummary.totalCounts.buttonPacks}</strong>
                      <span className="reward-summary-caption">UI interaction sounds unlocked over time</span>
                    </div>
                  </div>

                  <div className="reward-customization-section">
                    <div className="reward-section-heading">
                      <div>
                        <h4>Open the dedicated pages</h4>
                        <p>Browse full reward details without bloating Profile.</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="save-button"
                        onClick={() => {
                          window.location.hash = '#/themes';
                        }}
                      >
                        Open Themes
                      </button>
                      <button
                        type="button"
                        className="save-button"
                        onClick={() => {
                          window.location.hash = '#/rewards';
                        }}
                      >
                        Open Rewards
                      </button>
                      <button
                        type="button"
                        className="save-button"
                        onClick={() => {
                          window.location.hash = '#/settings';
                        }}
                      >
                        Open Settings Audio Controls
                      </button>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Cosmetic Rewards"
                subtitle="Frames, banners, titles, and recommendation looks for your profile surfaces."
                badge={`${rewardTypeSummary.cosmetic.unlocked}/${rewardTypeSummary.cosmetic.total} unlocked`}
                icon={<User size={18} />}
                className="profile-folder reward-folder"
              >
                <div className="reward-type-shell">
                <div className="reward-type-shell-header">
                  <span className="reward-type-shell-kicker">Cosmetic Rewards</span>
                  <h4>Identity and recommendation cosmetics</h4>
                  <p>These rewards change how your profile and recommendation surfaces look without altering gameplay or progression.</p>
                </div>

                <div className="reward-customization-section">
                  <div className="reward-section-heading">
                    <div>
                      <h4>Frames</h4>
                      <p>Cosmetic borders unlocked through play.</p>
                    </div>
                    <span className="reward-count-pill">{rewardSummary.unlockedCounts.frames}/{rewardSummary.totalCounts.frames} unlocked</span>
                  </div>
                  <div className="reward-option-grid">
                    {rewardCatalog.frames.map((frame) => (
                      <button
                        key={frame.id}
                        type="button"
                        className={`reward-option-card${selectedProfileFrame?.id === frame.id ? ' selected' : ''}${frame.unlocked ? '' : ' locked'}`}
                        onClick={() => handleEquipProfileFrame(frame.id)}
                        disabled={!frame.unlocked}
                      >
                        <span
                          className="reward-option-preview reward-frame-preview"
                          style={{
                            borderColor: frame.accentColor,
                            boxShadow: `0 0 0 4px ${frame.shadowColor}`
                          }}
                        ></span>
                        <span className="reward-option-name">{frame.name}</span>
                        <span className="reward-option-description">{frame.description}</span>
                        <span className="reward-option-meta">
                          {frame.unlocked
                            ? (selectedProfileFrame?.id === frame.id ? 'Equipped' : 'Equip frame')
                            : `Unlock at ${frame.requiredXP.toLocaleString()} XP`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="reward-customization-section">
                  <div className="reward-section-heading">
                    <div>
                      <h4>Banners</h4>
                      <p>Presentation layers for your profile identity.</p>
                    </div>
                    <span className="reward-count-pill">{rewardSummary.unlockedCounts.banners}/{rewardSummary.totalCounts.banners} unlocked</span>
                  </div>
                  <div className="reward-option-grid">
                    {rewardCatalog.banners.map((banner) => (
                      <button
                        key={banner.id}
                        type="button"
                        className={`reward-option-card${selectedProfileBanner?.id === banner.id ? ' selected' : ''}${banner.unlocked ? '' : ' locked'}`}
                        onClick={() => handleEquipProfileBanner(banner.id)}
                        disabled={!banner.unlocked}
                      >
                        <span className="reward-option-preview reward-banner-preview" style={{ background: banner.preview }}></span>
                        <span className="reward-option-name">{banner.name}</span>
                        <span className="reward-option-description">{banner.description}</span>
                        <span className="reward-option-meta">
                          {banner.unlocked
                            ? (selectedProfileBanner?.id === banner.id ? 'Equipped' : 'Equip banner')
                            : `Unlock at ${banner.requiredXP.toLocaleString()} XP`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="reward-customization-section">
                  <div className="reward-section-heading">
                    <div>
                      <h4>Titles</h4>
                      <p>Identity tags that reflect your progression arc.</p>
                    </div>
                    <span className="reward-count-pill">{rewardSummary.unlockedCounts.titles}/{rewardSummary.totalCounts.titles} unlocked</span>
                  </div>
                  <div className="reward-option-grid reward-title-grid">
                    {rewardCatalog.titles.map((title) => (
                      <button
                        key={title.id}
                        type="button"
                        className={`reward-option-card${selectedProfileTitle?.id === title.id ? ' selected' : ''}${title.unlocked ? '' : ' locked'}`}
                        onClick={() => handleEquipProfileTitle(title.id)}
                        disabled={!title.unlocked}
                      >
                        <span className="reward-option-name">{title.name}</span>
                        <span className="reward-option-description">{title.description}</span>
                        <span className="reward-option-meta">
                          {title.unlocked
                            ? (selectedProfileTitle?.id === title.id ? 'Equipped' : 'Equip title')
                            : `Unlock at ${title.requiredXP.toLocaleString()} XP`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="reward-customization-section">
                  <div className="reward-section-heading">
                    <div>
                      <h4>Recommendation Packs</h4>
                      <p>Visual skins for Home recommendation cards, badges, and action buttons.</p>
                    </div>
                    <span className="reward-count-pill">{rewardSummary.unlockedCounts.recommendationPacks}/{rewardSummary.totalCounts.recommendationPacks} unlocked</span>
                  </div>
                  <div className="reward-option-grid">
                    {rewardCatalog.recommendationPacks.map((pack) => (
                      <button
                        key={pack.id}
                        type="button"
                        className={`reward-option-card${selectedRecommendationPack?.id === pack.id ? ' selected' : ''}${pack.unlocked ? '' : ' locked'}`}
                        onClick={() => handleEquipRecommendationPack(pack.id)}
                        disabled={!pack.unlocked}
                      >
                        <span className="reward-option-preview reward-banner-preview" style={{ background: pack.preview }}></span>
                        <span className="reward-option-name">{pack.name}</span>
                        <span className="reward-option-description">{pack.description}</span>
                        <span className="reward-option-meta">
                          {pack.unlocked
                            ? (selectedRecommendationPack?.id === pack.id ? 'Equipped on Home' : 'Equip pack')
                            : `Unlock at ${pack.requiredXP.toLocaleString()} XP`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Utility Rewards"
                subtitle="Showcase slots and presentation tools that reshape Home and Library."
                badge={`${rewardTypeSummary.utility.unlocked}/${rewardTypeSummary.utility.total} unlocked`}
                icon={<Lock size={18} />}
                className="profile-folder reward-folder"
              >
                <div className="reward-type-shell">
                <div className="reward-type-shell-header">
                  <span className="reward-type-shell-kicker">Utility Rewards</span>
                  <h4>Presentation tools and functional profile options</h4>
                  <p>Keep your showcase controls here, and use Rewards for the bigger presentation catalog browsing experience.</p>
                </div>

                <div className="reward-customization-section reward-showcase-section">
                  <div className="reward-section-heading">
                    <div>
                      <h4>Achievement Showcase</h4>
                      <p>Pin your favourite unlocks directly on your profile.</p>
                    </div>
                    <span className="reward-count-pill">{showcasedAchievements.length}/{unlockedShowcaseSlotCount} equipped</span>
                  </div>

                  <div className="showcase-slot-grid">
                    {Array.from({ length: unlockedShowcaseSlotCount }).map((_, index) => {
                      const achievement = showcasedAchievements[index];
                      return (
                        <div key={`showcase-slot-${index}`} className={`showcase-slot-card${achievement ? '' : ' empty'}`}>
                          {achievement ? (
                            <>
                              <strong>{achievement.name}</strong>
                              <span>{achievement.description}</span>
                              <em>+{achievement.points} XP</em>
                            </>
                          ) : (
                            <>
                              <strong>Empty Slot</strong>
                              <span>Pick an unlocked achievement below.</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {rewardCatalog.showcaseSlots.filter((slot) => !slot.unlocked).length > 0 && (
                    <div className="locked-showcase-row">
                      {rewardCatalog.showcaseSlots.filter((slot) => !slot.unlocked).map((slot) => (
                        <div key={slot.id} className="locked-showcase-chip">
                          <Lock size={14} />
                          <span>Slot {slot.slotNumber} at {slot.requiredXP.toLocaleString()} XP</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {availableShowcaseAchievements.length > 0 ? (
                    <div className="showcase-selector-grid">
                      {availableShowcaseAchievements.map((achievement) => {
                        const selectionLimitReached = showcasedAchievements.length >= unlockedShowcaseSlotCount && !achievement.isSelected;
                        return (
                          <button
                            key={achievement.id}
                            type="button"
                            className={`showcase-selector-chip${achievement.isSelected ? ' selected' : ''}`}
                            onClick={() => handleToggleShowcaseAchievement(achievement.id)}
                            disabled={selectionLimitReached}
                          >
                            <span className="showcase-selector-name">{achievement.name}</span>
                            <span className="showcase-selector-meta">
                              +{achievement.points} XP{achievement.isRecent ? ' • Recent' : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="reward-muted-copy">Unlock achievements to start filling your showcase.</p>
                  )}
                </div>

                <div className="reward-customization-section">
                  <div className="reward-section-heading">
                    <div>
                      <h4>Presentation Summary</h4>
                      <p>Your Home and Library presentation rewards now have a clearer home in the Rewards page.</p>
                    </div>
                  </div>
                  <div className="reward-summary-grid">
                    <div className="reward-summary-card">
                      <span className="reward-summary-label">Library Variants</span>
                      <strong className="reward-summary-value">{rewardSummary.unlockedCounts.libraryVariants}/{rewardSummary.totalCounts.libraryVariants}</strong>
                      <span className="reward-summary-caption">Current: {selectedLibraryVariant?.name || 'Classic Shelf'}</span>
                    </div>
                    <div className="reward-summary-card">
                      <span className="reward-summary-label">Home Layouts</span>
                      <strong className="reward-summary-value">{rewardSummary.unlockedCounts.homeLayouts}/{rewardSummary.totalCounts.homeLayouts}</strong>
                      <span className="reward-summary-caption">Current: {selectedHomeLayout?.name || 'Mission Control'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
                    <button
                      type="button"
                      className="save-button"
                      onClick={() => {
                        window.location.hash = '#/rewards';
                      }}
                    >
                      Open Rewards
                    </button>
                    <button
                      type="button"
                      className="save-button"
                      onClick={() => {
                        window.location.hash = '#/settings';
                      }}
                    >
                      Open Settings
                    </button>
                  </div>
                </div>
                </div>
              </CollapsibleSection>
            </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Removed duplicate achievement counter block; stats page owns this display */}

        {/* Active Sessions Section */}
        <CollapsibleSection
          title="Active Game Sessions"
          subtitle="See what is running right now and end sessions manually if needed."
          badge={`${activeSessionGames.length} active`}
          icon={<Clock size={18} />}
          className={getSectionClass(5)}
          defaultOpen={activeSessionGames.length > 0}
        >
          <div className="gaming-identity-card">
            <h3>Active Game Sessions</h3>
          {activeSessionGames.length > 0 ? (
            <div className="active-sessions-grid">
              {activeSessionGames.map((game, index) => (
                <div key={index} className="active-session-card">
                  <div className="active-session-game">
                    <div className="game-card-image-wrapper" style={{ margin: '0', borderRadius: '8px' }}>
                      {resolveGameArtwork(game, { surface: 'profile_icon' }) ? (
                        <LazyImage
                          src={resolveGameArtwork(game, { surface: 'profile_icon' })}
                          alt={game.name}
                          placeholder={getGameArtworkPlaceholder({ game, surface: 'profile_icon' })}
                          className="active-session-icon"
                          style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="game-placeholder" style={{ width: '48px', height: '48px', margin: '0' }}>
                          <span style={{ fontSize: '1.2rem' }}>🎮</span>
                        </div>
                      )}
                    </div>
                    <div className="active-session-info">
                      <h4 className="active-session-name">{game.name}</h4>
                      <p className="active-session-platform">{game.platform}</p>
                      <div className="active-session-stats">
                        <span className="active-session-time">{game.sessionMinutes}m</span>
                        <span className="active-session-start">{game.sessionStart}</span>
                        {game.isPaused && <span className="active-session-paused">PAUSED</span>}
                      </div>
                      {game.isLauncherBased && (
                        <div className="launcher-warning">
                          <p>⚠️ Launcher-based game - time may be inaccurate</p>
                          <p>End session when game actually closes</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => handleEndSession(game.name)} className="end-session-button">End Session</button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="⏸️"
              title="No active game sessions right now"
              description="When you launch a game through GamePilot, active sessions will appear here so you can monitor or end them manually."
              compact
            />
          )}
          </div>
        </CollapsibleSection>

        {/* Most Played Games Section */}
        <CollapsibleSection
          title="Most Played Games"
          subtitle="Your current heavy hitters ranked by tracked playtime."
          badge={`${mostPlayedGames.length} tracked`}
          icon={<Trophy size={18} />}
          className={getSectionClass(6)}
        >
          <div className="gaming-identity-card">
            <h3>Most Played Games</h3>
          {mostPlayedGames.length === 0 ? (
            <EmptyState
              icon="🎮"
              title="No playtime leaders yet"
              description="Your most played games will show up here once you have a few tracked sessions in the library."
              compact
            />
          ) : (
            <div className="most-played-grid">
              {mostPlayedGames.map((game, index) => (
                <div key={index} className="most-played-item" style={{display: 'flex', alignItems: 'center', gap: '15px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                  <div className="most-played-rank">#{index + 1}</div>
                  <div className="most-played-game" style={{display: 'flex', alignItems: 'center', gap: '15px', flex: 1}}>
                    <div className="game-card-image-wrapper" style={{ margin: '0', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                      {resolveGameArtwork(game, { surface: 'profile_icon' }) ? (
                        <LazyImage
                          src={resolveGameArtwork(game, { surface: 'profile_icon' })}
                          alt={game.name}
                          placeholder={getGameArtworkPlaceholder({ game, surface: 'profile_icon' })}
                          className="most-played-icon"
                          style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="game-placeholder" style={{ width: '48px', height: '48px', margin: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)' }}>
                          <span style={{ fontSize: '1.2rem' }}>🎮</span>
                        </div>
                      )}
                    </div>
                    <div className="most-played-info"><h4>{game.name}</h4>
                      <div className="most-played-stats">
                        <span>{Math.floor(game.totalMinutes / 60)}h {game.totalMinutes % 60}m</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </CollapsibleSection>

        {/* Completed Games Section */}
        <CollapsibleSection
          title="Completed Games"
          subtitle="Track finished games and maintain your completion log."
          badge={`${getCompletionStats().total} logged`}
          icon={<Check size={18} />}
          className={getSectionClass(7)}
        >
          <div className="gaming-identity-card">
            <h3>Completed Games</h3>
          <div className="completed-games-stats">
            <div className="completion-stat">
              <span className="stat-number">{getCompletionStats().total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="completion-stat">
              <span className="stat-number">{getCompletionStats().completionRate}%</span>
              <span className="stat-label">Rate</span>
            </div>
          </div>
          {completedGames.length === 0 && (
            <EmptyState
              icon="✅"
              title="No completed games logged yet"
              description="Track finished games here to build a personal completion log and keep your profile milestones feeling real."
              compact
              style={{ marginBottom: '18px' }}
            />
          )}
          {completedGames.length > 0 && (
            <div className="completed-games-list">
              {completedGames.slice(0, 5).map((game, index) => (
                <div key={index} className="completed-game-item">
                  <span className="completed-game-name">{game.name}</span>
                  <div className="game-actions">
                    <button onClick={() => markGameCompleted(game.name)} className="mark-complete-btn">100%</button>
                    <button onClick={() => removeCompletedGame(game.name)} className="remove-game-btn">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="add-completed-game">
            <input
              type="text"
              placeholder="Enter game name..."
              className="game-input"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  addCompletedGame(e.target.value.trim());
                  e.target.value = '';
                }
              }}
            />
            
            {isExportModalOpen && (
              <ExportModal 
                isOpen={isExportModalOpen} 
                onClose={() => setIsExportModalOpen(false)} 
                library={[]} 
              />
            )}
            
            {isCinematicExportOpen && (
              <CinematicExport 
                isOpen={isCinematicExportOpen} 
                onClose={() => setIsCinematicExportOpen(false)} 
                library={[]} 
              />
            )}
          </div>
          </div>
        </CollapsibleSection>

        {/* Gaming Style Dashboard */}
        {behaviorProfile ? (
          <CollapsibleSection
            title="Your Gaming Style"
            subtitle="A compact view of the behavior model learning from your sessions."
            badge={`${behaviorProfile.totalSelectionsTracked} sessions`}
            icon={<TrendingUp size={18} />}
            className={getSectionClass(8)}
          >
            <div className="gaming-identity-card">
              <h3>🎮 Your Gaming Style</h3>

              <div className="gaming-style-overview">
                <div className="overview-stat">
                  <span className="stat-number">{behaviorProfile.totalSelectionsTracked}</span>
                  <span className="stat-label">Sessions Tracked</span>
                </div>
                <div className="overview-stat">
                  <span className="stat-number">{behaviorProfile.totalCompleted}</span>
                  <span className="stat-label">Games Played</span>
                </div>
                <div className="overview-stat">
                  <span className="stat-number">{behaviorProfile.topMoods?.[0]?.sharePercent || 0}%</span>
                  <span className="stat-label">Top Mood Share</span>
                </div>
                <div className="overview-stat">
                  <span className="stat-number">{behaviorProfile.avgSessionLength}</span>
                  <span className="stat-label">Avg Session (min)</span>
                </div>
              </div>

              {behaviorProfile.topMoods && behaviorProfile.topMoods.length > 0 && (
                <div className="gaming-preference-section">
                  <h4>🎭 Favorite Moods</h4>
                  <div className="preference-grid">
                    {behaviorProfile.topMoods.map((mood, idx) => (
                      <div key={idx} className="preference-card">
                        <div className="preference-name">{mood.label}</div>
                        <div className="preference-stats">
                          <div className="stat-row">
                            <span>Sessions:</span>
                            <span className="stat-value">{mood.count}x</span>
                          </div>
                          <div className="stat-row">
                            <span>Share:</span>
                            <span className="stat-value">{mood.sharePercent}%</span>
                          </div>
                          <div className="stat-row">
                            <span>Avg Time:</span>
                            <span className="stat-value">{mood.avgPlaytime}m</span>
                          </div>
                        </div>
                        <div className="completion-bar">
                          <div className="completion-fill" style={{ width: `${mood.sharePercent}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {behaviorProfile.topGenres && behaviorProfile.topGenres.length > 0 && (
                <div className="gaming-preference-section">
                  <h4>🎯 Favorite Genres</h4>
                  <div className="preference-grid">
                    {behaviorProfile.topGenres.map((genre, idx) => (
                      <div key={idx} className="preference-card">
                        <div className="preference-name">{genre.label}</div>
                        <div className="preference-stats">
                          <div className="stat-row">
                            <span>Sessions:</span>
                            <span className="stat-value">{genre.count}x</span>
                          </div>
                          <div className="stat-row">
                            <span>Share:</span>
                            <span className="stat-value">{genre.sharePercent}%</span>
                          </div>
                          <div className="stat-row">
                            <span>Avg Time:</span>
                            <span className="stat-value">{genre.avgPlaytime}m</span>
                          </div>
                        </div>
                        <div className="completion-bar">
                          <div className="completion-fill" style={{ width: `${genre.sharePercent}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sessionStats && sessionStats.peakHours && sessionStats.peakHours.length > 0 && (
                <div className="gaming-preference-section">
                  <h4>⏰ Peak Gaming Times</h4>
                  <div className="peak-hours-grid">
                    {sessionStats.peakHours.map((hour, idx) => (
                      <div key={idx} className="peak-hour-card">
                        <div className="hour-time">{String(hour.hour).padStart(2, '0')}:00</div>
                        <div className="hour-label">{hour.timeOfDay}</div>
                        <div className="hour-count">{hour.count} sessions</div>
                        <div className="hour-bar">
                          <div
                            className="hour-fill"
                            style={{ height: `${(hour.count / Math.max(...sessionStats.peakHours.map((entry) => entry.count))) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sessionStats && sessionStats.mostPlayedGames && sessionStats.mostPlayedGames.length > 0 && (
                <div className="gaming-preference-section">
                  <h4>🏆 Most Played Games</h4>
                  <div className="most-played-list">
                    {sessionStats.mostPlayedGames.map((game, idx) => (
                      <div key={idx} className="most-played-item">
                        <div className="rank-badge">{idx + 1}</div>
                        <div className="game-info">
                          <div className="game-title">{game.gameName}</div>
                          <div className="game-stats">
                            {Math.round(game.totalPlaytime / 60)}h • {game.sessions} sessions
                          </div>
                        </div>
                        <div className="playtime-bar">
                          <div
                            className="playtime-fill"
                            style={{ width: `${(game.totalPlaytime / Math.max(...sessionStats.mostPlayedGames.map((entry) => entry.totalPlaytime))) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="learning-status">
                <div className="status-message">
                  <TrendingUp size={16} />
                  <span>GamePilot is learning your playstyle. The more you play, the better recommendations become!</span>
                </div>
                <div className="last-updated">
                  Last updated: {behaviorProfile.lastUpdated ? new Date(behaviorProfile.lastUpdated).toLocaleDateString() : 'Never'}
                </div>
              </div>
            </div>
          </CollapsibleSection>
        ) : (
          <CollapsibleSection
            title="Your Gaming Style"
            subtitle="A compact view of the behavior model learning from your sessions."
            badge="Calibrating"
            icon={<TrendingUp size={18} />}
            className={getSectionClass(8)}
          >
            <div className="gaming-identity-card">
              <h3>🎮 Your Gaming Style</h3>
              <EmptyState
                icon="📡"
                title="Your gaming style is still calibrating"
                description="Once GamePilot has enough local session history, it will summarize your top moods, genres, peak hours, and most-played habits here."
                compact
              />
            </div>
          </CollapsibleSection>
        )}

        {/* Game Release Calendar */}
        <CollapsibleSection
          title="Release Calendar"
          subtitle="Upcoming launches and saved event reminders."
          badge="Calendar"
          icon={<Clock size={18} />}
          className={getSectionClass(9)}
        >
          <GameCalendar />
        </CollapsibleSection>

        {/* Playtime Heatmap */}
        <CollapsibleSection
          title="Activity Heatmap"
          subtitle="Your gaming activity over the past year."
          badge="Stats"
          icon={<Clock size={18} />}
          className={getSectionClass(10)}
        >
          <PlaytimeHeatmap library={library} />
        </CollapsibleSection>

        {/* Data & Sync Section */}
        <CollapsibleSection
          title="Data & Sync Management"
          subtitle="Backup, restore, manual sync, and local data controls."
          badge={isSyncing ? 'Syncing' : 'Local-first'}
          icon={<Download size={18} />}
          className={getSectionClass(11)}
        >
          <div className="gaming-identity-card">
            <h3>⚙️ Data & Sync Management</h3>
          <div className="data-management-grid">
            <div className="data-action-card">
              <h4>Backup & Restore</h4>
              <div className="data-buttons">
                <button onClick={handleExportData} className="data-btn export">
                  <Download size={16} /> Export
                </button>
                <label className="data-btn import">
                  <Upload size={16} /> Import
                  <input type="file" accept=".json" onChange={handleImportData} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            <div className="data-action-card">
              <h4>Cloud Sync</h4>
              <div className="data-buttons">
                <button onClick={handleManualSync} disabled={isSyncing} className="data-btn sync">
                  <Clock size={16} /> {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
                <button onClick={handleClearData} className="data-btn clear">
                  <X size={16} /> Clear All
                </button>
              </div>
            </div>
          </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  </div>
  );
};

export default Profile;