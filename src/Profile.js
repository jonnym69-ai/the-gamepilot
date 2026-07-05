import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { Clock, Download, X, Trophy, Star, User, Camera, Check, Crown, Edit2, TrendingUp, Image as ImageIcon, Sparkles, Award, Dna, BookOpen } from 'lucide-react';
import './Profile.css';
import { useToast } from './components/Toast';
import { AchievementTracker, ACHIEVEMENTS } from './AchievementSystem';
import CollapsibleSection from './components/CollapsibleSection';
import StorageService from './services/StorageService';
import ProfileService, { SOCIAL_PLATFORMS } from './services/ProfileService';
import { UserBehaviorProfile } from './services/UserBehaviorProfile';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';
import { StartupPersonalizationService } from './services/StartupPersonalizationService';
import CalendarXPService from './services/CalendarXPService';
import NavBar from './NavBar';
import { GamingIdentity } from './GamingIdentity';
import GameCalendar from './components/GameCalendar';
import EmptyState from './components/EmptyState';
import ExportModal from './components/ExportModal';
import CinematicExport from './components/CinematicExport';
import PersonaEvolutionCard from './components/PersonaEvolutionCard';
import { IdentityShareCard, IDENTITY_SHARE_CARD_SIZE_PX } from './components/IdentityShareCard';
import GamingStoryPanel from './components/GamingStoryPanel';
import { GamingStoryService } from './services/GamingStoryService';
import { YearInReviewService } from './services/YearInReviewService';
import { LocalShareService } from './services/LocalShareService';
import ShareMenu from './components/ShareMenu';
import { GENRES, MOODS } from './constants/GenresMoods';

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

const readActiveSessions = () => StorageService.get('activeGameSessions', {});

const dispatchProfileUpdatedEvent = (detail = {}) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('gamepilot:profile-updated', {
    detail
  }));
};

const Profile = ({ theme, library = [] }) => {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [tempUsername, setTempUsername] = useState('');
  const personaEvolution = useMemo(
    () => YearInReviewService.getLifetimePersonaEvolution(library),
    [library]
  );
  const [tempMessage, setTempMessage] = useState('Ready to find your perfect play?');
  const [tempBirthdayMonth, setTempBirthdayMonth] = useState('');
  const [tempBirthdayDay, setTempBirthdayDay] = useState('');
  const [socialLinks, setSocialLinks] = useState([]);
  const [tempSocialLinks, setTempSocialLinks] = useState([]);
  const [gamingIdentity, setGamingIdentity] = useState(null);
  const [gamingStory, setGamingStory] = useState(() => GamingStoryService.getCurrentStory());
  const [periodStory, setPeriodStory] = useState(() => GamingStoryService.getPeriodStory());
  const identityShareCardRef = useRef(null);
  const [isCapturingIdentity, setIsCapturingIdentity] = useState(false);
  const [xpStats, setXpStats] = useState(null);
  const [xpBoost, setXpBoost] = useState(null);
  const [completedGames, setCompletedGames] = useState([]);
  const [founderTier, setFounderTier] = useState(null);
  const [username, setUsername] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('Ready to find your perfect play?');
  const [isEditing, setIsEditing] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCinematicExportOpen, setIsCinematicExportOpen] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [startupPersonalization, setStartupPersonalization] = useState(() => StartupPersonalizationService.getProfile());
  const [isEditingStartupPersonalization, setIsEditingStartupPersonalization] = useState(false);
  const [startupDraft, setStartupDraft] = useState(() => StartupPersonalizationService.getProfile());
  const [rewardCatalog, setRewardCatalog] = useState(() => ProgressionUnlockService.getProfileRewardCatalog());
  const [rewardSummary, setRewardSummary] = useState(() => ProgressionUnlockService.getRewardCatalogSummary());
  const [recapCustomization] = useState(() => ProgressionUnlockService.getRecapCustomization());
  const [selectedSection, setSelectedSection] = useState(0);

  const refreshRewardCatalog = useCallback(() => {
    setRewardCatalog(ProgressionUnlockService.getProfileRewardCatalog());
    setRewardSummary(ProgressionUnlockService.getRewardCatalogSummary());
  }, []);


  const generateIdentityShareCardBlob = useCallback(async () => {
    if (!identityShareCardRef.current) return null;
    setIsCapturingIdentity(true);
    try {
      const canvas = await html2canvas(identityShareCardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        logging: false
      });
      return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    } catch (err) {
      console.error('Failed to generate identity share card:', err);
      return null;
    } finally {
      setIsCapturingIdentity(false);
    }
  }, []);

  const handleCopyIdentityShareText = useCallback(async (text = null) => {
    const shareText = text || ProfileService.appendSocialLinksToShareText(LocalShareService.buildIdentityShareText(gamingIdentity, username));
    const copied = await LocalShareService.copyTextToClipboard(shareText);
    if (copied) {
      success('Identity share text copied to clipboard.');
    } else {
      error('Could not copy identity text.');
    }
    return copied;
  }, [gamingIdentity, username, success, error]);

  const handleDownloadIdentityShareCard = useCallback(async () => {
    const blob = await generateIdentityShareCardBlob();
    if (!blob) {
      error('Could not generate identity share card.');
      return;
    }
    const { filename } = LocalShareService.buildIdentityShareCardPackage(gamingIdentity, username);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    success('Identity share card saved.');
  }, [generateIdentityShareCardBlob, gamingIdentity, username, success, error]);

  const handleCopyIdentityShareCard = useCallback(async () => {
    const blob = await generateIdentityShareCardBlob();
    if (!blob) {
      error('Could not generate identity share card.');
      return false;
    }
    const copied = await LocalShareService.copyImageToClipboard(blob);
    success(copied ? 'Identity card copied to clipboard.' : 'Could not copy identity card.');
    return copied;
  }, [generateIdentityShareCardBlob, success, error]);

  const handleShareIdentityToChannel = useCallback(async (channel, text = null) => {
    const shareText = text || ProfileService.appendSocialLinksToShareText(LocalShareService.buildIdentityShareText(gamingIdentity, username));
    const result = await LocalShareService.openShareIntent(channel, shareText);
    success(result.success ? `Opened ${result.label}.` : result.message || 'Could not open share.');
  }, [gamingIdentity, username, success]);

  const handleShareIdentityToDiscord = useCallback(async (text = null) => {
    const shareText = text || ProfileService.appendSocialLinksToShareText(LocalShareService.buildIdentityShareText(gamingIdentity, username));
    const blob = await generateIdentityShareCardBlob();
    const { filename } = LocalShareService.buildIdentityShareCardPackage(gamingIdentity, username);
    const result = await LocalShareService.shareToDiscord({ imageBlob: blob, text: shareText, filename });
    success(result.success ? 'Discord opened with identity card.' : result.message || 'Could not share to Discord.');
  }, [generateIdentityShareCardBlob, gamingIdentity, username, success]);

  const handleShareIdentityToMessenger = useCallback(async (text = null) => {
    const shareText = text || ProfileService.appendSocialLinksToShareText(LocalShareService.buildIdentityShareText(gamingIdentity, username));
    const blob = await generateIdentityShareCardBlob();
    const { filename } = LocalShareService.buildIdentityShareCardPackage(gamingIdentity, username);
    const result = await LocalShareService.shareToMessenger({ imageBlob: blob, text: shareText, filename });
    success(result.success ? 'Messenger opened with identity card.' : result.message || 'Could not share to Messenger.');
  }, [generateIdentityShareCardBlob, gamingIdentity, username, success]);

  const handleNativeShareIdentityCard = useCallback(async (text = null) => {
    const blob = await generateIdentityShareCardBlob();
    if (!blob) {
      error('Could not generate identity share card.');
      return;
    }
    const { title, filename } = LocalShareService.buildIdentityShareCardPackage(gamingIdentity, username);
    const file = new File([blob], filename, { type: 'image/png' });
    const shareText = text || ProfileService.appendSocialLinksToShareText(LocalShareService.buildIdentityShareText(gamingIdentity, username));
    const result = await LocalShareService.shareWithNativeShare({
      title,
      text: shareText,
      files: [file]
    });
    success(result.success ? 'Native share opened.' : result.message || 'Could not share.');
  }, [generateIdentityShareCardBlob, gamingIdentity, username, success, error]);


  // Load completed games from localStorage
  useEffect(() => {
    const savedCompletedGames = StorageService.get('completedGames', []);
    if (savedCompletedGames?.length) {
      try {
        const parsedCompletedGames = savedCompletedGames;
        setCompletedGames(Array.isArray(parsedCompletedGames) ? parsedCompletedGames : []);
      } catch (error) {
        setCompletedGames([]);
      }
    }
  }, []);

  // Save completed games to localStorage
  const saveCompletedGames = useCallback((newCompletedGames) => {
    StorageService.set('completedGames', newCompletedGames);
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

  const selectedProfileBanner = useMemo(() => {
    const selectedId = rewardCatalog?.customization?.selectedBanner;
    return rewardCatalog?.banners?.find((banner) => banner.id === selectedId) || rewardCatalog?.banners?.[0] || null;
  }, [rewardCatalog]);

  const selectedProfileTitle = useMemo(() => {
    const selectedId = rewardCatalog?.customization?.selectedTitle;
    return rewardCatalog?.titles?.find((title) => title.id === selectedId) || rewardCatalog?.titles?.[0] || null;
  }, [rewardCatalog]);

  const selectedProfileFrame = useMemo(() => {
    const selectedId = rewardCatalog?.customization?.selectedFrame;
    return rewardCatalog?.frames?.find((frame) => frame.id === selectedId) || rewardCatalog?.frames?.[0] || null;
  }, [rewardCatalog]);

  const startupInfluence = UserBehaviorProfile.getStartupInfluenceSummary();

  const founderAccentStyle = useMemo(() => {
    if (!isFounder || !founderTier) {
      return undefined;
    }

    const accentMap = {
      Platinum: {
        '--founder-accent': '#e5e7eb',
        '--founder-glow': 'rgba(229, 231, 235, 0.28)',
        '--founder-banner': 'linear-gradient(135deg, rgba(229, 231, 235, 0.28), rgba(148, 163, 184, 0.18))',
        '--founder-border': 'rgba(229, 231, 235, 0.22)',
        '--founder-border-strong': 'rgba(229, 231, 235, 0.34)',
        '--founder-surface': 'rgba(229, 231, 235, 0.12)'
      },
      Gold: {
        '--founder-accent': '#facc15',
        '--founder-glow': 'rgba(250, 204, 21, 0.24)',
        '--founder-banner': 'linear-gradient(135deg, rgba(250, 204, 21, 0.3), rgba(251, 146, 60, 0.18))',
        '--founder-border': 'rgba(250, 204, 21, 0.2)',
        '--founder-border-strong': 'rgba(250, 204, 21, 0.3)',
        '--founder-surface': 'rgba(250, 204, 21, 0.14)'
      },
      Silver: {
        '--founder-accent': '#cbd5e1',
        '--founder-glow': 'rgba(203, 213, 225, 0.24)',
        '--founder-banner': 'linear-gradient(135deg, rgba(203, 213, 225, 0.24), rgba(148, 163, 184, 0.16))',
        '--founder-border': 'rgba(203, 213, 225, 0.2)',
        '--founder-border-strong': 'rgba(203, 213, 225, 0.3)',
        '--founder-surface': 'rgba(203, 213, 225, 0.12)'
      },
      Bronze: {
        '--founder-accent': '#fb923c',
        '--founder-glow': 'rgba(251, 146, 60, 0.22)',
        '--founder-banner': 'linear-gradient(135deg, rgba(251, 146, 60, 0.26), rgba(180, 83, 9, 0.16))',
        '--founder-border': 'rgba(251, 146, 60, 0.2)',
        '--founder-border-strong': 'rgba(251, 146, 60, 0.3)',
        '--founder-surface': 'rgba(251, 146, 60, 0.14)'
      }
    };

    return accentMap[founderTier] || undefined;
  }, [founderTier, isFounder]);

  const unlockedShowcaseSlotCount = rewardSummary?.showcaseSlotsUnlocked || 0;

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

  const emptyShowcaseSlots = Math.max(0, unlockedShowcaseSlotCount - showcasedAchievements.length);

  const achievementSummary = useMemo(() => {
    const total = Object.values(ACHIEVEMENTS).reduce((sum, category) => sum + (category?.length || 0), 0);
    const unlocked = AchievementTracker.getUnlockedAchievements() || [];
    const pointsMap = AchievementTracker.getAchievementPoints();
    const unlockedPoints = unlocked.reduce((sum, id) => sum + (pointsMap[id] || 0), 0);
    return {
      total,
      unlocked: unlocked.length,
      percent: total > 0 ? Math.round((unlocked.length / total) * 100) : 0,
      points: unlockedPoints
    };
  }, []);

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

        success(`Ended session for ${gameName}: ${sessionMinutes} minutes recorded`);
        delete sessions[gameName];
        StorageService.set('activeGameSessions', sessions);
      }
    }
  };

  // Calculate active sessions
  const activeSessionGames = useMemo(() => {
    const activeSessions = readActiveSessions();
    return Object.keys(activeSessions).map(gameName => {
      const game = library?.find(g => g.name === gameName);
      return {
        name: gameName,
        platform: game?.platform || game?.source || 'Unknown',
        startTime: getSessionStartTime(activeSessions[gameName])
      };
    });
  }, [library]);

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
    const savedUsername = StorageService.getString('profileUsername', '');
    const savedProfilePic = StorageService.getString('profilePic', '');
    const savedMessage = StorageService.getString('welcomeMessage', 'Ready to find your perfect play?');

    setUsername(savedUsername);
    setProfilePic(savedProfilePic);
    setWelcomeMessage(savedMessage);
    setTempUsername(savedUsername);
    setTempMessage(savedMessage);
    const savedSocialLinks = ProfileService.getSocialLinks();
    setSocialLinks(savedSocialLinks);
    setTempSocialLinks(savedSocialLinks);

    let userFounders = [];
    try {
      const parsedFounders = StorageService.get('userFounders', []);
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
    setGamingStory(GamingStoryService.updateStory(library));
    setPeriodStory(GamingStoryService.updatePeriodStory(GamingStoryService.getStoryFrequency()));
    setStartupPersonalization(StartupPersonalizationService.getProfile());
    setStartupDraft(StartupPersonalizationService.getProfile());

    const xpData = AchievementTracker.getXPStats();
    setXpStats(xpData);
    setXpBoost(AchievementTracker.getPatreonBoostProfile());
    refreshRewardCatalog();
  }, [library, refreshRewardCatalog]);

  useEffect(() => {
    const handleStartupQuestionnaireCompleted = (event) => {
      const nextProfile = event?.detail || StartupPersonalizationService.getProfile();
      setStartupPersonalization(nextProfile);
      setStartupDraft(nextProfile);
      setIsEditingStartupPersonalization(false);
      setGamingIdentity(GamingIdentity.getProfile());
    };

    window.addEventListener('gamepilot:startup-questionnaire-completed', handleStartupQuestionnaireCompleted);
    return () => window.removeEventListener('gamepilot:startup-questionnaire-completed', handleStartupQuestionnaireCompleted);
  }, []);

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
          StorageService.setString('profilePic', result);
          dispatchProfileUpdatedEvent({ profilePic: result });
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
      setSocialLinks(tempSocialLinks);
      StorageService.setString('profileUsername', tempUsername.trim());
      StorageService.setString('profilePic', profilePic);
      StorageService.setString('welcomeMessage', tempMessage);
      ProfileService.setSocialLinks(tempSocialLinks);

      // Persist birthday for annual XP bonus / seasonal events
      if (tempBirthdayMonth && tempBirthdayDay) {
        const month = parseInt(tempBirthdayMonth, 10) - 1; // 0-indexed
        const day = parseInt(tempBirthdayDay, 10);
        if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
          CalendarXPService.setBirthday(month, day);
        }
      }

      dispatchProfileUpdatedEvent({
        username: tempUsername.trim(),
        profilePic,
        welcomeMessage: tempMessage
      });
      success('Profile updated successfully!');
      setIsEditing(false);
    } else {
      error('Username cannot be empty!');
    }
  };

  const loadBirthdayDraft = () => {
    const birthday = CalendarXPService.getBirthday();
    if (birthday && Number.isInteger(birthday.month) && Number.isInteger(birthday.day)) {
      setTempBirthdayMonth(String(birthday.month + 1));
      setTempBirthdayDay(String(birthday.day));
    } else {
      setTempBirthdayMonth('');
      setTempBirthdayDay('');
    }
  };

  const handleCancel = () => {
    setTempUsername(username);
    setTempMessage(welcomeMessage);
    setTempSocialLinks(socialLinks);
    loadBirthdayDraft();
    setIsEditing(false);
  };

  const handleEdit = () => {
    setTempUsername(username);
    setTempMessage(welcomeMessage);
    setTempSocialLinks(socialLinks);
    loadBirthdayDraft();
    setIsEditing(true);
  };

  const removeProfilePic = () => {
    setProfilePic('');
    StorageService.remove('profilePic');
    dispatchProfileUpdatedEvent({ profilePic: '' });
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
      return true;
    }
    return false;
  }, [selectedSection]);

  const getSectionClass = (index) => `profile-section profile-section-${index}`;

  const handleRetunePersonalization = useCallback(() => {
    navigate('/startup-questionnaire');
  }, [navigate]);

  const handleStartupDraftToggle = useCallback((field, value) => {
    setStartupDraft((current) => {
      const currentList = current[field] || [];
      const nextList = currentList.includes(value)
        ? currentList.filter((entry) => entry !== value)
        : [...currentList, value];

      return {
        ...current,
        [field]: nextList
      };
    });
  }, []);

  const handleSaveStartupPersonalization = useCallback(() => {
    const nextProfile = StartupPersonalizationService.updateOnboardingProfile(startupDraft);
    setStartupPersonalization(nextProfile);
    setStartupDraft(nextProfile);
    setGamingIdentity(GamingIdentity.getProfile());
    setIsEditingStartupPersonalization(false);
    window.dispatchEvent(new CustomEvent('gamepilot:startup-questionnaire-completed', {
      detail: nextProfile
    }));
    success('Startup personalization updated.');
  }, [startupDraft, success]);

  const handleCancelStartupPersonalizationEdit = useCallback(() => {
    setStartupDraft(startupPersonalization);
    setIsEditingStartupPersonalization(false);
  }, [startupPersonalization]);

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
            <div className="profile-header-actions" style={{ display: 'none', gap: '10px' }}>
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
            className={`profile-card reward-profile-card ${isFounder && founderTier ? `founder-profile-card founder-profile-card-${founderTier.toLowerCase()}` : ''}`}
            style={{
              ...(selectedProfileBanner ? { '--profile-banner-preview': selectedProfileBanner.preview } : {}),
              ...(founderAccentStyle || {})
            }}
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
              className={`profile-identity-banner ${isFounder && founderTier ? `founder-identity-banner founder-identity-banner-${founderTier.toLowerCase()}` : ''}`}
              style={selectedProfileBanner ? { background: selectedProfileBanner.preview } : undefined}
            >
              <div className="profile-identity-banner-copy">
                <span className="profile-identity-label">{isFounder ? 'Founder Identity Banner' : 'Equipped Banner'}</span>
                <strong>{selectedProfileBanner?.name || 'Pilot Sunset'}</strong>
                <p>{isFounder && founderTier ? `${founderTier} Founder • ${selectedProfileTitle?.name || 'Rookie Pilot'}` : (selectedProfileTitle?.name || 'Rookie Pilot')}</p>
              </div>
              <div className="profile-identity-banner-meta">
                {isFounder && founderTier && (
                  <span>{founderTier} Founder Lounge</span>
                )}
                <span>{selectedProfileFrame?.name || 'Starter Halo'}</span>
                <span>{unlockedShowcaseSlotCount} showcase slot{unlockedShowcaseSlotCount === 1 ? '' : 's'}</span>
                <span className="profile-achievement-badge">
                  <Trophy size={14} />
                  {achievementSummary.unlocked} / {achievementSummary.total} badges
                </span>
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

                <div className="form-group">
                  <label>Birthday (annual XP bonus)</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                      value={tempBirthdayMonth}
                      onChange={(e) => setTempBirthdayMonth(e.target.value)}
                      className="profile-select"
                      style={{ flex: 2 }}
                    >
                      <option value="">Month</option>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i} value={i + 1}>
                          {new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                    <select
                      value={tempBirthdayDay}
                      onChange={(e) => setTempBirthdayDay(e.target.value)}
                      className="profile-select"
                      style={{ flex: 1 }}
                    >
                      <option value="">Day</option>
                      {Array.from({ length: 31 }, (_, i) => (
                        <option key={i} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Social Links</label>
                  <div className="social-links-editor">
                    {tempSocialLinks.length === 0 && (
                      <p style={{ margin: '0 0 10px', fontSize: 12, opacity: 0.7 }}>
                        Add your social links to include them on share cards and captions.
                      </p>
                    )}
                    {tempSocialLinks.map((link, index) => (
                      <div key={link.id} className="social-link-row" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <select
                          value={link.platform}
                          onChange={(e) => {
                            const next = [...tempSocialLinks];
                            next[index] = { ...next[index], platform: e.target.value };
                            setTempSocialLinks(next);
                          }}
                          className="profile-select"
                          style={{ flex: 1 }}
                        >
                          {SOCIAL_PLATFORMS.map((p) => (
                            <option key={p.key} value={p.key}>{p.icon} {p.label}</option>
                          ))}
                        </select>
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => {
                            const next = [...tempSocialLinks];
                            next[index] = { ...next[index], url: e.target.value };
                            setTempSocialLinks(next);
                          }}
                          placeholder="https://..."
                          className="profile-input"
                          style={{ flex: 2 }}
                        />
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 4 }} title="Include by default">
                          <input
                            type="checkbox"
                            checked={link.enabled}
                            onChange={(e) => {
                              const next = [...tempSocialLinks];
                              next[index] = { ...next[index], enabled: e.target.checked };
                              setTempSocialLinks(next);
                            }}
                          />
                          <span style={{ fontSize: 12 }}>Share</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setTempSocialLinks(tempSocialLinks.filter((_, i) => i !== index));
                          }}
                          className="cancel-button"
                          style={{ padding: '6px 10px' }}
                          title="Remove"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setTempSocialLinks([
                          ...tempSocialLinks,
                          { id: `social-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, platform: 'youtube', url: '', enabled: true }
                        ]);
                      }}
                      className="edit-button"
                      style={{ marginTop: 4 }}
                    >
                      + Add social link
                    </button>
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 12, opacity: 0.7 }}>
                    Manual only. GamePilot will never auto-post on your behalf.
                  </p>
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
                  {isFounder && founderTier && <span>Founder Status: {founderTier} Lounge</span>}
                  <span>Frame: {selectedProfileFrame?.name || 'Starter Halo'}</span>
                  <span>Banner: {selectedProfileBanner?.name || 'Pilot Sunset'}</span>
                </div>
                {socialLinks.length > 0 && (
                  <div className="profile-social-links" style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {socialLinks.map((link) => {
                      const platform = SOCIAL_PLATFORMS.find((p) => p.key === link.platform) || SOCIAL_PLATFORMS[SOCIAL_PLATFORMS.length - 1];
                      return (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="profile-social-chip"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 13,
                            padding: '4px 10px',
                            borderRadius: 999,
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: 'inherit',
                            textDecoration: 'none',
                            opacity: link.enabled ? 1 : 0.6
                          }}
                          title={link.enabled ? 'Included in shares' : 'Not included in shares'}
                        >
                          <span>{platform.icon}</span>
                          <span>{platform.label}</span>
                          {!link.enabled && <span style={{ fontSize: 10, marginLeft: 2 }}>(hidden)</span>}
                        </a>
                      );
                    })}
                  </div>
                )}
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
              <div className="gaming-identity-card-header">
                <h3>Gaming Identity</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="gaming-dna-link"
                    onClick={() => navigate('/gaming-dna')}
                  >
                    <Dna size={14} />
                    View Full DNA
                  </button>
                  <ShareMenu
                    imageAvailable={Boolean(gamingIdentity)}
                    onCopyText={handleCopyIdentityShareText}
                    onCopyImage={handleCopyIdentityShareCard}
                    onSaveImage={handleDownloadIdentityShareCard}
                    onShareText={handleShareIdentityToChannel}
                    onShareToDiscord={handleShareIdentityToDiscord}
                    onShareToMessenger={handleShareIdentityToMessenger}
                    onDownloadText={handleCopyIdentityShareText}
                    onNativeShare={handleNativeShareIdentityCard}
                    buildCaption={() => ProfileService.appendSocialLinksToShareText(LocalShareService.buildIdentityShareText(gamingIdentity, username))}
                    disabled={isCapturingIdentity}
                    triggerLabel="Share Identity"
                  />
                </div>
              </div>
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
              {isFounder && founderTier && (
                <div className={`founder-plaque founder-plaque-${founderTier.toLowerCase()}`}>
                  <div>
                    <span className="trait-label">Founder Plaque</span>
                    <strong>{founderTier} Founder Lounge Member</strong>
                    <p className="identity-description">Your supporter identity now carries premium profile, recap, and export presentation throughout GamePilot.</p>
                  </div>
                  <span className="founder-plaque-badge">Founding Supporter</span>
                </div>
              )}
              {startupPersonalization?.completed && (
                <div className="startup-personalization-panel">
                  <div className="startup-personalization-header">
                    <div>
                      <span className="trait-label">Startup Personalization</span>
                      <strong>{startupPersonalization.playerVibe} • {startupPersonalization.personalizationStyle}</strong>
                      <p className="identity-description">Your cold-start profile seeds recommendations and identity until real play behavior takes over.</p>
                      <div className="startup-personalization-status">
                        <span className={`startup-personalization-status-badge strength-${startupInfluence.shortLabel.toLowerCase().replace(/\s+/g, '-')}`}>{startupInfluence.label}</span>
                        <p>{startupInfluence.description}</p>
                      </div>
                    </div>
                    <div className="startup-personalization-actions">
                      <button type="button" className="startup-personalization-button" onClick={() => setIsEditingStartupPersonalization((current) => !current)}>{isEditingStartupPersonalization ? 'Close editor' : 'Edit inline'}</button>
                      <button type="button" className="startup-personalization-button" onClick={handleRetunePersonalization}>Retune</button>
                    </div>
                  </div>
                  {isEditingStartupPersonalization && (
                    <div className="startup-personalization-editor">
                      <div className="startup-personalization-field">
                        <span className="trait-label">Seeded Moods</span>
                        <div className="startup-personalization-chip-grid">
                          {MOODS.map((moodOption) => (
                            <button
                              key={moodOption}
                              type="button"
                              className={`startup-personalization-chip ${startupDraft.selectedMoods.includes(moodOption) ? 'selected' : ''}`}
                              onClick={() => handleStartupDraftToggle('selectedMoods', moodOption)}
                            >
                              {moodOption}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="startup-personalization-field">
                        <span className="trait-label">Favorite Genres</span>
                        <div className="startup-personalization-chip-grid genre-grid">
                          {GENRES.map((genreOption) => (
                            <button
                              key={genreOption}
                              type="button"
                              className={`startup-personalization-chip ${startupDraft.favoriteGenres.includes(genreOption) ? 'selected' : ''}`}
                              onClick={() => handleStartupDraftToggle('favoriteGenres', genreOption)}
                            >
                              {genreOption}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="startup-personalization-editor-grid">
                        <label className="startup-personalization-field">
                          <span className="trait-label">Session Preference</span>
                          <select
                            className="profile-select startup-personalization-select"
                            value={startupDraft.sessionPreference}
                            onChange={(event) => setStartupDraft((current) => ({ ...current, sessionPreference: event.target.value }))}
                          >
                            {StartupPersonalizationService.getSessionOptions().map((option) => (
                              <option key={option.id} value={option.id}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="startup-personalization-field">
                          <span className="trait-label">Player Vibe</span>
                          <select
                            className="profile-select startup-personalization-select"
                            value={startupDraft.playerVibe}
                            onChange={(event) => setStartupDraft((current) => ({ ...current, playerVibe: event.target.value }))}
                          >
                            {StartupPersonalizationService.getPlayerVibes().map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </label>
                        <label className="startup-personalization-field">
                          <span className="trait-label">Personalization Style</span>
                          <select
                            className="profile-select startup-personalization-select"
                            value={startupDraft.personalizationStyle}
                            onChange={(event) => setStartupDraft((current) => ({ ...current, personalizationStyle: event.target.value }))}
                          >
                            {StartupPersonalizationService.getPersonalizationStyles().map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="startup-personalization-editor-actions">
                        <button type="button" className="startup-personalization-button" onClick={handleSaveStartupPersonalization}>Save tuning</button>
                        <button type="button" className="startup-personalization-button" onClick={handleCancelStartupPersonalizationEdit}>Cancel</button>
                      </div>
                    </div>
                  )}
                  <div className="identity-stats startup-personalization-stats">
                    <div className="identity-trait">
                      <span className="trait-label">Seeded Moods</span>
                      <span className="trait-value">{startupPersonalization.selectedMoods.join(', ') || 'Not set'}</span>
                    </div>
                    <div className="identity-trait">
                      <span className="trait-label">Favorite Genres</span>
                      <span className="trait-value">{startupPersonalization.favoriteGenres.join(', ') || 'Not set'}</span>
                    </div>
                    <div className="identity-trait">
                      <span className="trait-label">Session Preference</span>
                      <span className="trait-value">{startupPersonalization.sessionPreference}</span>
                    </div>
                  </div>
                </div>
              )}
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

                {gamingIdentity.identity.archetype && (
                  <div className="identity-trait">
                    <span className="trait-label">Archetype:</span>
                    <span className="trait-value">{gamingIdentity.identity.archetype}</span>
                  </div>
                )}
              </div>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* Gaming Story Section */}
        <CollapsibleSection
          title="Gaming Story"
          subtitle="Your identity story and recent recap."
          badge={periodStory?.period || gamingStory?.chapter || 'Anchor'}
          icon={<BookOpen size={18} />}
          className={getSectionClass(14)}
        >
          <GamingStoryPanel story={gamingStory} />
          {GamingStoryService.getStoryFrequency() !== 'off' && periodStory && (
            <div style={{ marginTop: '20px' }}>
              <h4 style={{ marginBottom: '12px', fontSize: '14px', opacity: 0.8 }}>Recent Story</h4>
              <GamingStoryPanel story={periodStory} />
            </div>
          )}
        </CollapsibleSection>

        {/* Persona Evolution Section */}
        <CollapsibleSection
          title="Identity Arc"
          subtitle="How your taste has shifted across your tracked sessions."
          badge={personaEvolution ? 'Lifetime' : 'Building...'}
          icon={<TrendingUp size={18} />}
          className={getSectionClass(1)}
        >
          <PersonaEvolutionCard evolution={personaEvolution} />
        </CollapsibleSection>

        {/* Identity Rewards Section */}
        <CollapsibleSection
          title="Identity Rewards"
          subtitle="Earned titles based on your playstyle and identity."
          badge={GamingIdentity.getIdentityRewards().filter((r) => r.unlocked).length}
          icon={<Award size={18} />}
          className={getSectionClass(1)}
          defaultOpen={false}
        >
          <div className="identity-rewards-grid">
            {GamingIdentity.getIdentityRewards().map((reward) => (
              <div key={reward.id} className={`identity-reward-card ${reward.unlocked ? 'unlocked' : 'locked'}`}>
                <span className="identity-reward-icon">{reward.icon}</span>
                <span className="identity-reward-name">{reward.name}</span>
                <span className="identity-reward-desc">{reward.desc}</span>
                {reward.unlocked ? (
                  <span className="identity-reward-status">Unlocked</span>
                ) : (
                  <span className="identity-reward-status">Locked</span>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>

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
                  <TrendingUp size={16} />
                  <span>Habits: {(xpStats.habitXP || 0).toLocaleString()} XP</span>
                </div>
                <div className="xp-source">
                  <Clock size={16} />
                  <span>Playtime: {(xpStats.playtimeXP || 0).toLocaleString()} XP</span>
                </div>
                <div className="xp-source">
                  <Star size={16} />
                  <span>Total: {xpStats.totalXP.toLocaleString()} XP</span>
                </div>
              </div>
              {xpBoost && xpBoost.multiplier > 1 && (
                <div className="xp-boost-indicator">
                  <Sparkles size={16} />
                  <span>
                    <strong>{xpBoost.multiplier}x XP Boost</strong> active
                    {xpBoost.tier && ` (${xpBoost.tier} tier)`}
                    {xpBoost.isMonthly && ' — monthly'}
                  </span>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Removed duplicate achievement counter block; stats page owns this display */}

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


        {/* Active Game Sessions Section */}
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
                  <div className="active-session-info">
                    <div className="active-session-name">{game.name}</div>
                    <div className="active-session-platform">{game.platform || 'Unknown platform'}</div>
                    {game.startTime && (
                      <div className="active-session-time">
                        Started {new Date(game.startTime).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleEndSession(game.name)}
                    className="end-session-button"
                  >
                    End Session
                  </button>
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

        {/* Game Release Calendar */}
        <CollapsibleSection
          title="Release Calendar"
          subtitle="Upcoming launches and saved event reminders."
          badge="Calendar"
          icon={<Clock size={18} />}
          className={getSectionClass(11)}
        >
          <GameCalendar />
        </CollapsibleSection>

        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: -10000,
            left: -10000,
            width: IDENTITY_SHARE_CARD_SIZE_PX,
            height: IDENTITY_SHARE_CARD_SIZE_PX,
            pointerEvents: 'none',
            zIndex: -1
          }}
        >
          <div ref={identityShareCardRef}>
            {gamingIdentity && (
              <IdentityShareCard
                profile={gamingIdentity}
                evolution={personaEvolution}
                library={library}
                watermark={recapCustomization.shareCardWatermark || 'gamepilot'}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default Profile;
