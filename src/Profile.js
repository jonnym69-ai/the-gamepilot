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
import ExportModal from './components/ExportModal';
import CinematicExport from './components/CinematicExport';
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

  const handleEquipLibraryVariant = useCallback((variantId) => {
    handleApplyRewardChange(ProgressionUnlockService.selectLibraryPresentationVariant(variantId));
  }, [handleApplyRewardChange]);

  const handleEquipHomeLayout = useCallback((layoutId) => {
    handleApplyRewardChange(ProgressionUnlockService.selectHomeLayoutVariant(layoutId));
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
      if (Number.isNaN(sessionStart.getTime())) return null;

      const sessionMinutes = Math.max(0, Math.floor((currentTime.getTime() - sessionStart.getTime()) / (1000 * 60)));
      
      return {
        ...game,
        sessionMinutes,
        sessionStart: sessionStart.toLocaleString()
      };
    }).filter(Boolean);
  }, [currentTime, library]);

  const selectedProfileFrame = useMemo(() => {
    const selectedId = rewardCatalog?.customization?.selectedFrame;
    return rewardCatalog?.frames?.find((frame) => frame.id === selectedId) || rewardCatalog?.frames?.[0] || null;
  }, [rewardCatalog]);

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
    const profile = UserBehaviorProfile.getProfileSummary();
    setBehaviorProfile(profile);

    const statsDashboard = StatsAggregationService.getDashboardData(library);
    const allTimeSnapshot = statsDashboard?.periods?.all;

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
      topMoods: UserBehaviorProfile.getTopMoods(3),
      topGenres: UserBehaviorProfile.getTopGenres(3),
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
    } else if (action === 'up' && selectedSection > 0) {
      setSelectedSection(prev => prev - 1);
    } else if (action === 'confirm') {
      // Trigger action based on selected section, e.g., open a modal or navigate
      console.log('Controller confirm on section:', selectedSection);
    }
  }, [selectedSection]);

  const getSectionClass = useCallback((index) => {
    return `profile-section ${selectedSection === index ? 'selected' : ''}`;
  }, [selectedSection]);

  useEffect(() => {
    const handleGlobalControllerInput = (event) => {
      handleProfileControllerInput(event.detail.action);
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
                <span className="reward-summary-caption">Sample and synth click sets for UI feedback</span>
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
                  <h4>XP milestones that change how GamePilot looks and sounds</h4>
                  <p>These rewards unlock premium themes and individual audio packs that you can activate from Settings as your XP grows.</p>
                </div>

                <div className="reward-customization-section">
                  <div className="reward-section-heading">
                    <div>
                      <h4>Theme Tier Roadmap</h4>
                      <p>Each tier unlocks a new pool of premium themes.</p>
                    </div>
                    <span className="reward-count-pill">{rewardTypeSummary.themes.unlocked}/{rewardTypeSummary.themes.total} themes unlocked</span>
                  </div>
                  <div className="reward-summary-grid">
                    {rewardCatalog.themeTiers.map((tier) => (
                      <div key={tier.id} className="reward-summary-card">
                        <span className="reward-summary-label">{tier.name}</span>
                        <strong className="reward-summary-value">{tier.unlockedThemeCount}/{tier.totalThemeCount}</strong>
                        <span className="reward-summary-caption">
                          {tier.requiredXP.toLocaleString()} XP {tier.unlocked ? 'reached' : 'required'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="reward-customization-section">
                  <div className="reward-section-heading">
                    <div>
                      <h4>Premium Themes</h4>
                      <p>Color systems and mood variants unlocked through tier progression.</p>
                    </div>
                    <span className="reward-count-pill">{rewardSummary.unlockedCounts.premiumThemes}/{rewardSummary.totalCounts.premiumThemes} unlocked</span>
                  </div>
                  <div className="reward-option-grid">
                    {rewardCatalog.premiumThemes.map((themeReward) => (
                      <button
                        key={themeReward.id}
                        type="button"
                        className={`reward-option-card${themeReward.unlocked ? '' : ' locked'}`}
                        disabled
                        style={{ cursor: 'default' }}
                      >
                        <span className="reward-option-preview reward-banner-preview" style={{ background: themeReward.preview }}></span>
                        <span className="reward-option-name">{themeReward.name}</span>
                        <span className="reward-option-description">{themeReward.description}</span>
                        <span className="reward-option-meta">
                          {themeReward.unlocked
                            ? `Unlocked in ${themeReward.requiredTier} tier`
                            : `Unlock at ${themeReward.requiredXP.toLocaleString()} XP`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="reward-customization-section">
                  <div className="reward-section-heading">
                    <div>
                      <h4>Music Packs</h4>
                      <p>Background tracks for the Settings music player.</p>
                    </div>
                    <span className="reward-count-pill">{rewardSummary.unlockedCounts.musicPacks}/{rewardSummary.totalCounts.musicPacks} unlocked</span>
                  </div>
                  <div className="reward-option-grid">
                    {rewardCatalog.musicPacks.map((pack) => (
                      <button
                        key={pack.id}
                        type="button"
                        className={`reward-option-card${pack.unlocked ? '' : ' locked'}`}
                        disabled
                        style={{ cursor: 'default' }}
                      >
                        <span className="reward-option-preview reward-banner-preview" style={{ background: pack.preview }}></span>
                        <span className="reward-option-name">{pack.label}</span>
                        <span className="reward-option-description">{pack.description}</span>
                        <span className="reward-option-meta">
                          {pack.unlocked ? 'Available in Settings' : `Unlock at ${pack.requiredXP.toLocaleString()} XP`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="reward-customization-section">
                  <div className="reward-section-heading">
                    <div>
                      <h4>Atmosphere Packs</h4>
                      <p>Ambient loops that can match your theme or be selected manually.</p>
                    </div>
                    <span className="reward-count-pill">{rewardSummary.unlockedCounts.ambientPacks}/{rewardSummary.totalCounts.ambientPacks} unlocked</span>
                  </div>
                  <div className="reward-option-grid">
                    {rewardCatalog.ambientPacks.map((pack) => (
                      <button
                        key={pack.id}
                        type="button"
                        className={`reward-option-card${pack.unlocked ? '' : ' locked'}`}
                        disabled
                        style={{ cursor: 'default' }}
                      >
                        <span className="reward-option-preview reward-banner-preview" style={{ background: pack.preview }}></span>
                        <span className="reward-option-name">{pack.label}</span>
                        <span className="reward-option-description">{pack.description}</span>
                        <span className="reward-option-meta">
                          {pack.unlocked ? 'Available in Settings' : `Unlock at ${pack.requiredXP.toLocaleString()} XP`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="reward-customization-section">
                  <div className="reward-section-heading">
                    <div>
                      <h4>Button Packs</h4>
                      <p>Sample packs and synth click sets for UI interactions.</p>
                    </div>
                    <span className="reward-count-pill">{rewardSummary.unlockedCounts.buttonPacks}/{rewardSummary.totalCounts.buttonPacks} unlocked</span>
                  </div>
                  <div className="reward-option-grid">
                    {rewardCatalog.buttonPacks.map((pack) => (
                      <button
                        key={pack.id}
                        type="button"
                        className={`reward-option-card${pack.unlocked ? '' : ' locked'}`}
                        disabled
                        style={{ cursor: 'default' }}
                      >
                        <span className="reward-option-preview reward-banner-preview" style={{ background: pack.preview }}></span>
                        <span className="reward-option-name">{pack.label}</span>
                        <span className="reward-option-description">{pack.description}</span>
                        <span className="reward-option-meta">
                          {pack.unlocked
                            ? `Available in Settings • ${pack.packType === 'synth' ? 'Synth' : 'Sample'}`
                            : `Unlock at ${pack.requiredXP.toLocaleString()} XP`}
                        </span>
                      </button>
                    ))}
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
                  <p>These unlock new ways to surface your achievements and reshape how Home and Library present your collection.</p>
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
                      <h4>Library Presentation</h4>
                      <p>Change how your collection cards and list rows feel in the Library.</p>
                    </div>
                    <span className="reward-count-pill">{rewardSummary.unlockedCounts.libraryVariants}/{rewardSummary.totalCounts.libraryVariants} unlocked</span>
                  </div>
                  <div className="reward-option-grid">
                    {rewardCatalog.libraryVariants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        className={`reward-option-card${selectedLibraryVariant?.id === variant.id ? ' selected' : ''}${variant.unlocked ? '' : ' locked'}`}
                        onClick={() => handleEquipLibraryVariant(variant.id)}
                        disabled={!variant.unlocked}
                      >
                        <span className="reward-option-preview reward-banner-preview" style={{ background: variant.preview }}></span>
                        <span className="reward-option-name">{variant.name}</span>
                        <span className="reward-option-description">{variant.description}</span>
                        <span className="reward-option-meta">
                          {variant.unlocked
                            ? (selectedLibraryVariant?.id === variant.id ? 'Equipped in Library' : 'Equip variant')
                            : `Unlock at ${variant.requiredXP.toLocaleString()} XP`}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="reward-customization-section">
                  <div className="reward-section-heading">
                    <div>
                      <h4>Home Layouts</h4>
                      <p>Swap the layout of your mission-control landing page.</p>
                    </div>
                    <span className="reward-count-pill">{rewardSummary.unlockedCounts.homeLayouts}/{rewardSummary.totalCounts.homeLayouts} unlocked</span>
                  </div>
                  <div className="reward-option-grid">
                    {rewardCatalog.homeLayouts.map((layout) => (
                      <button
                        key={layout.id}
                        type="button"
                        className={`reward-option-card${selectedHomeLayout?.id === layout.id ? ' selected' : ''}${layout.unlocked ? '' : ' locked'}`}
                        onClick={() => handleEquipHomeLayout(layout.id)}
                        disabled={!layout.unlocked}
                      >
                        <span className="reward-option-preview reward-banner-preview" style={{ background: layout.preview }}></span>
                        <span className="reward-option-name">{layout.name}</span>
                        <span className="reward-option-description">{layout.description}</span>
                        <span className="reward-option-meta">
                          {layout.unlocked
                            ? (selectedHomeLayout?.id === layout.id ? 'Equipped on Home' : 'Equip layout')
                            : `Unlock at ${layout.requiredXP.toLocaleString()} XP`}
                        </span>
                      </button>
                    ))}
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
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleEndSession(game.name)} className="end-session-button">End Session</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-active-sessions"><p>No active game sessions found.</p></div>
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
            <div className="no-playtime-data"><p>No playtime data available yet.</p></div>
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
        {behaviorProfile && (
          <CollapsibleSection
            title="Your Gaming Style"
            subtitle="A compact view of the behavior model learning from your sessions."
            badge={`${behaviorProfile.overallCompletionRate}% completion`}
            icon={<TrendingUp size={18} />}
            className={getSectionClass(8)}
          >
            <div className="gaming-identity-card">
              <h3>🎮 Your Gaming Style</h3>
            
            {/* Overview Stats */}
            <div className="gaming-style-overview">
              <div className="overview-stat">
                <span className="stat-number">{behaviorProfile.totalSelectionsTracked}</span>
                <span className="stat-label">Selections Tracked</span>
              </div>
              <div className="overview-stat">
                <span className="stat-number">{behaviorProfile.totalCompleted}</span>
                <span className="stat-label">Games Completed</span>
              </div>
              <div className="overview-stat">
                <span className="stat-number">{behaviorProfile.overallCompletionRate}%</span>
                <span className="stat-label">Completion Rate</span>
              </div>
              <div className="overview-stat">
                <span className="stat-number">{behaviorProfile.avgSessionLength}</span>
                <span className="stat-label">Avg Session (min)</span>
              </div>
            </div>

            {/* Top Moods */}
            {behaviorProfile.topMoods && behaviorProfile.topMoods.length > 0 && (
              <div className="gaming-preference-section">
                <h4>🎭 Favorite Moods</h4>
                <div className="preference-grid">
                  {behaviorProfile.topMoods.map((mood, idx) => (
                    <div key={idx} className="preference-card">
                      <div className="preference-name">{mood.mood}</div>
                      <div className="preference-stats">
                        <div className="stat-row">
                          <span>Selected:</span>
                          <span className="stat-value">{mood.count}x</span>
                        </div>
                        <div className="stat-row">
                          <span>Completion:</span>
                          <span className="stat-value">{mood.completionRate}%</span>
                        </div>
                        <div className="stat-row">
                          <span>Avg Time:</span>
                          <span className="stat-value">{mood.avgPlaytime}m</span>
                        </div>
                      </div>
                      <div className="completion-bar">
                        <div 
                          className="completion-fill" 
                          style={{ width: `${mood.completionRate}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Genres */}
            {behaviorProfile.topGenres && behaviorProfile.topGenres.length > 0 && (
              <div className="gaming-preference-section">
                <h4>🎯 Favorite Genres</h4>
                <div className="preference-grid">
                  {behaviorProfile.topGenres.map((genre, idx) => (
                    <div key={idx} className="preference-card">
                      <div className="preference-name">{genre.genre}</div>
                      <div className="preference-stats">
                        <div className="stat-row">
                          <span>Selected:</span>
                          <span className="stat-value">{genre.count}x</span>
                        </div>
                        <div className="stat-row">
                          <span>Completion:</span>
                          <span className="stat-value">{genre.completionRate}%</span>
                        </div>
                        <div className="stat-row">
                          <span>Avg Time:</span>
                          <span className="stat-value">{genre.avgPlaytime}m</span>
                        </div>
                      </div>
                      <div className="completion-bar">
                        <div 
                          className="completion-fill" 
                          style={{ width: `${genre.completionRate}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Peak Play Hours */}
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
                          style={{ 
                            height: `${(hour.count / Math.max(...sessionStats.peakHours.map(h => h.count))) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Most Played Games */}
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
                          style={{ 
                            width: `${(game.totalPlaytime / Math.max(...sessionStats.mostPlayedGames.map(g => g.totalPlaytime))) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Learning Status */}
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

        {/* Data & Sync Section */}
        <CollapsibleSection
          title="Data & Sync Management"
          subtitle="Backup, restore, manual sync, and local data controls."
          badge={isSyncing ? 'Syncing' : 'Local-first'}
          icon={<Download size={18} />}
          className={getSectionClass(10)}
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