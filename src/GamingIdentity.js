// GamingIdentity.js - Enhanced Gaming Identity System
import { AchievementTracker } from './AchievementSystem';
import { StatsAggregationService } from './services/StatsAggregationService';
import { StartupPersonalizationService } from './services/StartupPersonalizationService';
import { UserBehaviorProfile } from './services/UserBehaviorProfile';
import { getEnhancedIdentity } from './services/GamingIdentityEnhancements';
import { GameRatingService } from './services/GameRatingService';
import StorageService from './services/StorageService';
import { getGameGenres } from './GameGenreDatabase';
import GamingPersonaService from './services/GamingPersonaService';

const IDENTITY_SNAPSHOTS_KEY = 'identitySnapshots';
const IDENTITY_REWARDS_KEY = 'identityRewards';

// Lightweight 500ms memoization to prevent duplicate expensive computations
// within a single React render cycle or rapid successive calls.
let _profileCache = null;
let _profileCacheTime = 0;
let _statsCache = null;
let _statsCacheTime = 0;
let _signatureGamesCache = null;
let _signatureGamesCacheTime = 0;
const CACHE_TTL_MS = 500;

export class GamingIdentity {
  static getProfile() {
    const now = Date.now();
    if (_profileCache && now - _profileCacheTime < CACHE_TTL_MS) {
      return _profileCache;
    }
    const stats = this.getGamingStats();
    const identity = this.getGamingIdentity(stats);
    
    // Get or set join date
    let joinDate = StorageService.getString('joinDate');
    if (!joinDate) {
      joinDate = new Date().toISOString();
      StorageService.setString('joinDate', joinDate);
    }

    const enhanced = getEnhancedIdentity();
    const behaviorPersona = UserBehaviorProfile.getPersonaSnapshot();

    const gamingPersona = GamingPersonaService.getPersona();

    const profile = {
      username: StorageService.getString('profileUsername', 'Gamer'),
      profilePic: StorageService.getString('profilePic', ''),
      welcomeMessage: StorageService.getString('welcomeMessage', 'Ready to find your perfect play?'),
      joinDate: joinDate,
      level: this.calculateGamerLevel(stats),
      title: this.getGamerTitle(stats),
      badges: this.getAchievedBadges(),
      stats: stats,
      identity: identity,
      streaks: enhanced.streaks,
      backlog: enhanced.backlog,
      milestones: enhanced.milestones,
      timeline: enhanced.timeline,
      seasonalTags: enhanced.seasonalTags,
      currentSeasonalTag: enhanced.currentSeasonalTag,
      archetype: enhanced.archetype,
      // Behavioral persona learned from actual play patterns
      persona: behaviorPersona,
      // Memeish data-backed gaming persona (primary + sub-traits + roast)
      gamingPersona,
      // Signature games + emergent taste clusters (derived from actual play data)
      signatureGames: identity?.signatureGames || [],
      tasteClusters: identity?.tasteClusters || []
    };
    _profileCache = profile;
    _profileCacheTime = Date.now();
    return profile;
  }

  static calculateGamerLevel(_stats) {
    return AchievementTracker.getXPStats().level || 1;
  }

  static getGamerTitle(stats) {
    const level = this.calculateGamerLevel(stats);
    const platformStats = AchievementTracker.getPlatformStats();
    
    const titles = [
      { name: 'Newbie', requirement: () => level >= 1 },
      { name: 'Casual Gamer', requirement: () => level >= 3 },
      { name: 'Dedicated Player', requirement: () => level >= 5 },
      { name: 'Game Enthusiast', requirement: () => level >= 10 },
      { name: 'Hardcore Gamer', requirement: () => level >= 15 },
      { name: 'Gaming Legend', requirement: () => level >= 20 },
      { name: 'Platform Master', requirement: () => Object.keys(platformStats).length >= 5 },
      { name: 'Time Lord', requirement: () => stats.totalPlayTime >= 60000 }, // 1000+ hours (totalPlayTime is in minutes)
      { name: 'Achievement Hunter', requirement: () => stats.achievementProgress?.unlocked >= 20 },
      { name: 'Game Master', requirement: () => level >= 25 }
    ];
    
    // Find highest title achieved
    for (let i = titles.length - 1; i >= 0; i--) {
      if (titles[i].requirement()) {
        return titles[i].name;
      }
    }
    
    return 'Newbie';
  }

  static getAchievedBadges() {
    const achievements = AchievementTracker.getUnlockedAchievements();
    const badges = [];
    
    // Achievement badges
    achievements.forEach(achievementId => {
      badges.push({
        id: achievementId,
        type: 'achievement',
        icon: this.getAchievementIcon(achievementId),
        name: this.getAchievementName(achievementId),
        date: StorageService.getString(`achievement_${achievementId}_date`, new Date().toISOString())
      });
    });
    
    // Weekly mood badges
    const weeklyBadge = AchievementTracker.getWeeklyMoodBadge();
    if (weeklyBadge) {
      badges.push({
        id: 'weekly_mood',
        type: 'weekly',
        icon: '🏆',
        name: weeklyBadge.badge,
        description: `Most used mood: ${weeklyBadge.mood}`,
        date: new Date().toISOString()
      });
    }
    
    // Platform badges
    const platformStats = AchievementTracker.getPlatformStats();
    Object.entries(platformStats).forEach(([platform, count]) => {
      if (count >= 10) {
        badges.push({
          id: `platform_${platform}`,
          type: 'platform',
          icon: this.getPlatformIcon(platform),
          name: `${platform} Fan`,
          description: `${count} launches on ${platform}`,
          date: new Date().toISOString()
        });
      }
    });
    
    return badges.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  static getGamingStats() {
    const now = Date.now();
    if (_statsCache && now - _statsCacheTime < CACHE_TTL_MS) {
      return _statsCache;
    }
    const library = StorageService.get('library', []);
    const librarySize = library.length;
    const dashboardData = StatsAggregationService.getDashboardData(library);
    const allTimeSnapshot = dashboardData?.periods?.all;
    const onboardingSeed = StartupPersonalizationService.getSeededRecommendationContext();
    const legacyTimeStats = AchievementTracker.getTimeStats();
    const platformStats = Object.keys(allTimeSnapshot?.platformCounts || {}).length > 0
      ? allTimeSnapshot.platformCounts
      : AchievementTracker.getPlatformStats();
    const featureStats = Object.keys(allTimeSnapshot?.featureUsage?.counts || {}).length > 0
      ? allTimeSnapshot.featureUsage.counts
      : AchievementTracker.getFeatureStats();
    const moodStats = Object.keys(allTimeSnapshot?.moodCounts || {}).length > 0
      ? allTimeSnapshot.moodCounts
      : AchievementTracker.getMoodStats();
    const genreStats = Object.keys(allTimeSnapshot?.genreCounts || {}).length > 0
      ? allTimeSnapshot.genreCounts
      : AchievementTracker.getGenreStats();
    const trackedPlayTime = Number(allTimeSnapshot?.playtimeMinutes || legacyTimeStats.total || 0);
    // Lifetime floor from library (Steam/GOG imports + local). Never show a
    // "0h identity" when the library clearly has hundreds of imported hours.
    const libraryLifetimeMinutes = Array.isArray(library)
      ? library.reduce((sum, game) => {
          const candidates = [
            Number(game?.time_played) || 0,
            Number(game?.playtime?.total) || 0,
            Number(game?.importedPlaytimeMinutes) || 0,
            Number(game?.playtimeForever) || 0
          ];
          return sum + Math.max(...candidates, 0);
        }, 0)
      : 0;
    const importedSummaryMinutes = Number(dashboardData?.importedPlaytime?.totalMinutes) || 0;
    const totalPlayTime = Math.max(trackedPlayTime, libraryLifetimeMinutes, importedSummaryMinutes);
    const totalSessions = Number(allTimeSnapshot?.sessions || legacyTimeStats.sessions || 0);
    
    const stats = {
      totalPlayTime,
      trackedPlayTime,
      importedPlayTime: Math.max(libraryLifetimeMinutes, importedSummaryMinutes),
      totalSessions,
      averageSessionTime: totalSessions > 0 ? Math.round(trackedPlayTime / totalSessions) : 0,
      favoritePlatform: this.getFavoritePlatform(platformStats),
      mostUsedFeature: this.getMostUsedFeature(featureStats),
      favoriteMood: this.getFavoriteMood(moodStats) !== 'None' ? this.getFavoriteMood(moodStats) : (onboardingSeed?.moods?.[0] || 'None'),
      favoriteGenre: this.getFavoriteGenre(genreStats) !== 'None' ? this.getFavoriteGenre(genreStats) : (onboardingSeed?.genres?.[0] || 'None'),
      platformDiversity: Object.keys(platformStats).length,
      achievementProgress: {
        unlocked: AchievementTracker.getUnlockedAchievements().length,
        total: this.getTotalAchievements()
      },
      librarySize: librarySize,
      onboardingSeed
    };
    _statsCache = stats;
    _statsCacheTime = Date.now();
    return stats;
  }

  static getGamingIdentity(stats) {
    const behaviorPersona = UserBehaviorProfile.getPersonaSnapshot();
    const gamerType = this.determineGamerType(stats);
    const playStyle = this.determinePlayStyle(stats);
    const preferences = this.determinePreferences(stats);
    const habits = this.determineHabits(stats);

    // Mood persona is canonical; gamer type / archetype are secondary
    const behaviorLabel = behaviorPersona?.personaIdentity?.label || null;
    const dominantMood = behaviorPersona?.dominantMood || stats.favoriteMood || 'None';
    const dominantGenre = behaviorPersona?.dominantGenre || stats.favoriteGenre || null;

    // Use the roast-backed persona service as the primary public voice.
    // It produces punchier labels (e.g. "The Backlog Archaeologist") and roasts.
    const gamingPersona = GamingPersonaService.getPersona();
    const primaryPersona = gamingPersona?.primaryPersona;
    const personaLabel = primaryPersona?.label || behaviorLabel;

    const { GenreArchetypes } = require('./services/GamingIdentityEnhancements');
    const genreStats = dominantGenre && dominantGenre !== 'None' ? { [dominantGenre]: stats.totalPlayTime || 0 } : {};
    const archetype = GenreArchetypes.getArchetype(genreStats, stats);

    const signatureGames = this.getSignatureGames();
    const tasteClusters = this.detectTasteClusters(signatureGames);

    // Build a concise, punchy description: persona label + roast + anchors.
    const descriptionParts = [];
    if (personaLabel) {
      descriptionParts.push(personaLabel);
    }
    if (gamingPersona?.summaryRoast) {
      descriptionParts.push(gamingPersona.summaryRoast);
    } else if (primaryPersona?.roast) {
      descriptionParts.push(primaryPersona.roast);
    } else if (behaviorPersona?.personaIdentity?.description) {
      descriptionParts.push(behaviorPersona.personaIdentity.description);
    }
    if (signatureGames.length > 0) {
      const topNames = signatureGames.slice(0, 3).map((g) => g.name).join(', ');
      descriptionParts.push(`Anchored by ${topNames}.`);
    }

    return {
      personality: personaLabel || gamerType,
      playStyle,
      favoriteMood: dominantMood,
      favoriteGenre: dominantGenre,
      archetype: archetype?.name || null,
      description: descriptionParts.join(' ') || `${habits.frequency} ${gamerType} gamer with ${playStyle.toLowerCase()} playstyle`,
      preferences,
      habits,
      signature: this.generateGamerSignature(stats, { personaLabel: primaryPersona?.label || behaviorLabel, gamerType, playStyle }),
      personaTags: behaviorPersona?.personaTags || [],
      signatureGames,
      tasteClusters
    };
  }

  /**
   * Derive the player's signature games — the titles that most define their
   * taste. Scored by playtime weight + user rating + launch frequency, then
   * de-duplicated and capped at 5.
   *
   * Returns an array of { name, appid, platform, playtimeHours, rating, score, genres }
   */
  static getSignatureGames(maxResults = 5) {
    const now = Date.now();
    // Serve from a short-lived cache to avoid O(N^2) rescans when scoring the
    // whole library (scoreGameByBehavior calls this once per game).
    if (_signatureGamesCache && now - _signatureGamesCacheTime < CACHE_TTL_MS) {
      return _signatureGamesCache.slice(0, maxResults);
    }

    const library = StorageService.get('library', []);
    if (!Array.isArray(library) || library.length === 0) {
      _signatureGamesCache = [];
      _signatureGamesCacheTime = now;
      return [];
    }

    const scored = library
      .map((game) => {
        const playtimeMinutes = Math.max(
          Number(game.time_played) || 0,
          Number(game.playtime && game.playtime.total) || 0,
          Number(game.importedPlaytimeMinutes) || 0,
          Number(game.playtimeForever) || 0
        );
        const displayName = String(game.name || game.title || '').trim();
        if (!displayName || /^(untitled|unknown|unknown game|null|undefined)$/i.test(displayName)) {
          return null;
        }
        if (playtimeMinutes <= 0 && !game.last_played) return null;

        const playtimeHours = Math.round(playtimeMinutes / 60);
        const gameId = String(game.appid || game.name || '');
        const rating = GameRatingService.getRating(gameId);
        const ratingValue = rating?.value || 0;
        const launchCount = Number(game.launch_count || 0);

        // Score: lifetime playtime is the primary signal, rating amplifies it,
        // launch count adds engagement breadth. Recent last_played is a light boost
        // so present play still surfaces without burying history.
        let score = Math.min(50, playtimeHours / 10); // up to 50 pts from playtime (500h+)
        if (ratingValue > 0) {
          score += (ratingValue / 10) * 25; // up to 25 pts from a 10/10 rating
        }
        score += Math.min(15, launchCount); // up to 15 pts from launch frequency
        if (rating?.wouldReplay === true) score += 10; // would-replay bonus
        if (game.last_played) {
          const daysSince = (Date.now() - new Date(game.last_played).getTime()) / (1000 * 60 * 60 * 24);
          if (Number.isFinite(daysSince) && daysSince >= 0 && daysSince < 14) {
            score += Math.max(0, 8 - daysSince * 0.4);
          }
        }

        let genres = Array.isArray(game.genres) ? game.genres.filter(Boolean) : [];
        if (genres.length === 0) {
          try { genres = getGameGenres(game.name) || []; } catch (e) { genres = []; }
        }

        return {
          name: displayName,
          appid: game.appid || '',
          platform: game.platform || '',
          playtimeHours,
          playtimeMinutes,
          rating: ratingValue,
          wouldReplay: rating?.wouldReplay || null,
          score: Math.round(score * 10) / 10,
          genres
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    _signatureGamesCache = scored;
    _signatureGamesCacheTime = now;
    return scored.slice(0, maxResults);
  }

  /**
   * Detect emergent taste clusters from signature games — patterns that go
   * beyond single-genre tags. For example, a player with heavy playtime across
   * Dark Souls, Elden Ring, and Sekiro has a "Souls-like Specialist" cluster
   * even though Steam tags those as "Action" / "RPG".
   *
   * Returns an array of { label, description, gameNames, matchCount }
   */
  static detectTasteClusters(signatureGames = []) {
    if (!Array.isArray(signatureGames) || signatureGames.length === 0) return [];

    // Each cluster definition tests game names + genres for membership.
    // A cluster activates when >= 2 signature games match.
    const CLUSTER_DEFINITIONS = [
      {
        id: 'soulslike',
        label: 'Souls-like Specialist',
        description: 'Drawn to punishing combat, methodical bosses, and the one-more-attempt loop.',
        test: (game) => /\b(dark souls|elden ring|sekiro|bloodborne|demon.?s souls|nioh|lies of p|wo long|lords of the fallen|salt and sanctuary|blasphemous|the surge|mortal shell|thymesia|steelrising|hellpoint|remnant|ashen|code vein|hollow knight)\b/i.test(game.name)
          || (game.genres || []).some((g) => /souls/i.test(g))
      },
      {
        id: 'survival-craft',
        label: 'Survival Architect',
        description: 'Thrives in gather-build-survive loops where every raid and base matters.',
        test: (game) => /\b(rust|valheim|the forest|sons of the forest|ark|7 days to die|conan exiles|green hell|the long dark|grounded|stranded deep|raft|icarus|scum|dayz|v rising|enshrouded|palworld)\b/i.test(game.name)
          || (game.genres || []).includes('Survival')
      },
      {
        id: 'factory-automation',
        label: 'Automation Engineer',
        description: 'Optimizes production lines and chases the perfect throughput curve.',
        test: (game) => /\b(factorio|dyson sphere|satisfactory|shapez|big pharma|game dev tycoon|rise of industry|production line|project hospital)\b/i.test(game.name)
          || (game.genres || []).includes('Management')
      },
      {
        id: 'story-rpg',
        label: 'Narrative RPG Voyager',
        description: 'Loses hours to branching dialogue, companion arcs, and world-shaping choices.',
        test: (game) => /\b(the witcher|cyberpunk|baldur.?s gate|mass effect|dragon age|disco elysium|the outer worlds|fallout|skyrim|oblivion|pillars of eternity|tyranny|torment|elex|greedfall)\b/i.test(game.name)
          || ((game.genres || []).includes('RPG') && (game.genres || []).some((g) => /story|narrative|adventure/i.test(g)))
      },
      {
        id: 'competitive-shooter',
        label: 'Ranked Sharpshooter',
        description: 'Lives on the ladder — aim, map control, and clutch moments are the core loop.',
        test: (game) => /\b(counter.strike|csgo|cs2|valorant|rainbow six|siege|apex|overwatch|call of duty|pubg|fortnite|warzone|escape from tarkov|hunt showdown)\b/i.test(game.name)
          || ((game.genres || []).includes('Shooter') && (game.genres || []).some((g) => /competitive|multiplayer|fps/i.test(g)))
      },
      {
        id: 'strategy-tactics',
        label: 'Grand Tactician',
        description: 'Commands empires, plots turn-by-turn, and outthinks the board.',
        test: (game) => /\b(civilization|civ |endless legend|age of wonders|total war|crusader kings|stellaris|europa universalis|hearts of iron|xcom|into the breach|fire emblem|advanced wars|age of empires|starcraft|warcraft)\b/i.test(game.name)
          || (game.genres || []).includes('Strategy')
      },
      {
        id: 'cozy-sandbox',
        label: 'Cozy Sandbox Dweller',
        description: 'Unwinds in open-ended worlds where the pace is yours and the stakes are low.',
        test: (game) => /\b(stardew valley|animal crossing|minecraft|terraria|spiritfarer|cozy grove|coral island|fields of mistria|dragon quest builders)\b/i.test(game.name)
          || ((game.genres || []).includes('Sandbox') && (game.genres || []).some((g) => /casual|relaxed|indie/i.test(g)))
      },
      {
        id: 'horror-immersion',
        label: 'Dread Survivor',
        description: 'Seeks the tension — the darker and more atmospheric, the better.',
        test: (game) => /\b(resident evil|silent hill|amnesia|outlast|alien isolation|phasmophobia|the evil within|dead space|frictional|soma|little nightmares|visage|mortuary assistant)\b/i.test(game.name)
          || (game.genres || []).includes('Horror')
      },
      {
        id: 'platformer-purist',
        label: 'Precision Platformer',
        description: 'Finds flow in jumping, dashing, and timing-perfect platforming challenges.',
        test: (game) => /\b(celeste|hollow knight|ori and the blind forest|ori and the will of the wisps|cuphead|shovel knight|super meat boy|a hat in time|yooka-laylee|banjo-kazooie|crash bandicoot|spyro|ratchet and clank|sonic|super mario|little big planet|guacamelee|donkey kong country|kirby|metroid dread|metroidvania|castlevania|axiom verge)\b/i.test(game.name)
          || (game.genres || []).some((g) => /platformer|metroidvania/i.test(g))
      },
      {
        id: 'roguelike-obsessed',
        label: 'Run Chaser',
        description: 'One-more-run is a lifestyle. Mastery through repetition and build variety.',
        test: (game) => /\b(hades|dead cells|binding of isaac|slay the spire|enter the gungeon|risk of rain|rogue legacy|hollow knight|spelunky|cult of the lamb|balatro|inkbound|ftl|into the breach|darkest dungeon)\b/i.test(game.name)
          || (game.genres || []).includes('Roguelike')
      },
      {
        id: 'mmo-dedicated',
        label: 'Realm Citizen',
        description: 'Commits to shared worlds — raid nights, guild politics, and persistent progression.',
        test: (game) => /\b(world of warcraft|wow|final fantasy xiv|ffxiv|eso|elder scrolls online|guild wars|black desert|eve online|new world|lost ark|star citizen|albion)\b/i.test(game.name)
          || (game.genres || []).includes('MMO')
      }
    ];

    const results = [];
    for (const def of CLUSTER_DEFINITIONS) {
      const matched = signatureGames.filter((g) => {
        try { return def.test(g); } catch { return false; }
      });
      if (matched.length >= 2) {
        results.push({
          id: def.id,
          label: def.label,
          description: def.description,
          gameNames: matched.map((g) => g.name),
          matchCount: matched.length
        });
      }
    }

    // Sort by match count descending — the cluster with the most signature
    // games is the player's strongest emergent taste.
    return results.sort((a, b) => b.matchCount - a.matchCount);
  }

  /**
   * Classify a single game as 'familiar' or 'fresh' based on the player's
   * relationship with it. A game is familiar if:
   *   - It has 5+ hours of playtime, OR
   *   - It shares 2+ genres with the player's signature games, OR
   *   - It has been launched recently (last 90 days)
   * Otherwise it's fresh.
   *
   * @param {object} game - library game with time_played, genres, last_played
   * @param {object} [context] - optional pre-computed signature genres Set
   * @returns {{ label: 'familiar'|'fresh', reasons: string[] }}
   */
  static classifyFamiliarity(game, context = null) {
    const playtimeMinutes = Number(game?.time_played || 0);
    const playtimeHours = playtimeMinutes / 60;
    const reasons = [];

    // Build signature genre set if not provided
    let sigGenres = context?.sigGenres || null;
    if (!sigGenres) {
      try {
        const sigGames = this.getSignatureGames(3);
        if (sigGames.length > 0) {
          sigGenres = new Set(sigGames.flatMap((s) => s.genres || []));
        }
      } catch { /* optional */ }
    }

    // Check playtime threshold
    if (playtimeHours >= 5) {
      reasons.push(`${Math.round(playtimeHours)}h played`);
    }

    // Check signature genre overlap
    if (sigGenres && sigGenres.size > 0) {
      const gameGenres = Array.isArray(game?.genres) ? game.genres : [];
      const overlap = gameGenres.filter((g) => sigGenres.has(g)).length;
      if (overlap >= 2) {
        reasons.push(`${overlap} genres shared with signature games`);
      }
    }

    // Check recent launch
    if (game?.last_played) {
      const daysSince = (Date.now() - new Date(game.last_played).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince <= 90) {
        reasons.push(`launched ${Math.round(daysSince)}d ago`);
      }
    }

    const isFamiliar = reasons.length > 0;
    return {
      label: isFamiliar ? 'familiar' : 'fresh',
      reasons
    };
  }

  /**
   * Build two genre profiles from the library — one from familiar games
   * (proven tastes) and one from fresh/unplayed games (unexplored territory).
   * Used by BuyRecommendationService to rank wishlist items against either
   * the player's comfort zone or their expansion frontier.
   *
   * @returns {{ familiarGenres: string[], freshGenres: string[], familiarGames: object[], freshGames: object[] }}
   */
  static getFamiliarityProfiles() {
    const library = StorageService.get('library', []);
    if (!Array.isArray(library) || library.length === 0) {
      return { familiarGenres: [], freshGenres: [], familiarGames: [], freshGames: [] };
    }

    let sigGenres = null;
    try {
      const sigGames = this.getSignatureGames(3);
      if (sigGames.length > 0) {
        sigGenres = new Set(sigGames.flatMap((s) => s.genres || []));
      }
    } catch { /* optional */ }

    const familiarGenres = new Map();
    const freshGenres = new Map();
    const familiarGames = [];
    const freshGames = [];

    library.forEach((game) => {
      const classification = this.classifyFamiliarity(game, { sigGenres });
      let genres = Array.isArray(game.genres) ? game.genres.filter(Boolean) : [];
      if (genres.length === 0) {
        try { genres = getGameGenres(game.name) || []; } catch { genres = []; }
      }

      if (classification.label === 'familiar') {
        familiarGames.push(game);
        genres.forEach((g) => familiarGenres.set(g, (familiarGenres.get(g) || 0) + 1));
      } else {
        freshGames.push(game);
        genres.forEach((g) => freshGenres.set(g, (freshGenres.get(g) || 0) + 1));
      }
    });

    return {
      familiarGenres: [...familiarGenres.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g),
      freshGenres: [...freshGenres.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g),
      familiarGames,
      freshGames
    };
  }

  static determineGamerType(stats) {
    const { totalPlayTime, platformDiversity, favoriteMood } = stats;
    
    if (totalPlayTime > 500) return 'Hardcore';
    if (platformDiversity > 4) return 'Explorer';
    if (favoriteMood === 'Social') return 'Competitor';
    if (favoriteMood === 'Relaxed') return 'Casual';
    if (totalPlayTime > 100) return 'Dedicated';
    return 'Newcomer';
  }

  static determinePlayStyle(stats) {
    const { averageSessionTime, favoriteMood, mostUsedFeature } = stats;
    
    if (averageSessionTime > 120) return 'Marathon';
    if (averageSessionTime < 30) return 'Quick Sessions';
    if (mostUsedFeature === 'perfect_play' || mostUsedFeature === 'perfectPlay') return 'Strategic';
    if (favoriteMood === 'Competitive') return 'Competitor';
    return 'Balanced';
  }

  static determinePreferences(stats) {
    return {
      sessionLength: stats.averageSessionTime > 60 ? 'Long' : 'Short',
      platformVariety: stats.platformDiversity > 3 ? 'Diverse' : 'Focused',
      moodStability: stats.favoriteMood ? 'Consistent' : 'Varied',
      achievementFocus: stats.achievementProgress.unlocked > 10 ? 'Achievement Hunter' : 'Casual'
    };
  }

  static determineHabits(stats) {
    const { totalSessions, totalPlayTime } = stats;
    const sessionsPerWeek = Math.round((totalSessions / 30) * 7); // Assuming 30 days of data
    
    return {
      frequency: sessionsPerWeek > 7 ? 'Daily' : sessionsPerWeek > 3 ? 'Regular' : 'Occasional',
      consistency: totalPlayTime > 0 ? 'Consistent' : 'New',
      engagement: stats.achievementProgress.unlocked > 5 ? 'Highly Engaged' : 'Developing'
    };
  }

  static generateGamerSignature(stats, personality) {
    const title = this.getGamerTitle(stats);
    const level = this.calculateGamerLevel(stats);
    const type = personality.personaLabel || personality.gamerType;
    const platform = stats.favoritePlatform;

    return `${title} • Level ${level} • ${type} • ${platform} Gamer`;
  }

  // Helper functions
  static getAchievementIcon(achievementId) {
    const icons = {
      'first_game': '🎮',
      'collector_5': '📚',
      'hour_1': '⏱️',
      'relaxed_5': '😌',
      'perfect_play_1': '✨',
      'platform_diverse': '🔄'
    };
    return icons[achievementId] || '🏆';
  }

  static getAchievementName(achievementId) {
    const names = {
      'first_game': 'First Steps',
      'collector_5': 'Collector',
      'hour_1': 'Quick Session',
      'relaxed_5': 'Chill Master',
      'perfect_play_1': 'Perfect Start',
      'platform_diverse': 'Platform Diverse'
    };
    return names[achievementId] || 'Achievement';
  }

  static getPlatformIcon(platform) {
    const icons = {
      'Steam': '🚂', 'Epic': '🎮', 'GOG': '🌌', 'EA': '🎪',
      'Uplay': '🔷', 'Battle.net': '⚔️', 'Xbox': '🎯',
      'PlayStation': '🎮', 'Rockstar': '🪨', 'BSG': '🔫', 'Riot': '👊', 'Manual': '📝'
    };
    return icons[platform] || '❓';
  }

  static getFavoritePlatform(platformStats) {
    const entries = Object.entries(platformStats);
    if (entries.length === 0) return 'None';
    return entries.sort(([,a], [,b]) => b - a)[0][0];
  }

  static getMostUsedFeature(featureStats) {
    const entries = Object.entries(featureStats);
    if (entries.length === 0) return 'None';
    return entries.sort(([,a], [,b]) => b - a)[0][0];
  }

  static getFavoriteMood(moodStats) {
    const entries = Object.entries(moodStats || {});
    if (entries.length === 0) return 'None';

    if (typeof entries[0][1] === 'number') {
      return entries.sort(([,a], [,b]) => b - a)[0][0];
    }

    const moodCounts = {};
    entries.forEach(([, moods]) => {
      Object.entries(moods || {}).forEach(([mood, count]) => {
        moodCounts[mood] = (moodCounts[mood] || 0) + Number(count || 0);
      });
    });

    const aggregatedEntries = Object.entries(moodCounts);
    if (aggregatedEntries.length === 0) return 'None';
    return aggregatedEntries.sort(([,a], [,b]) => b - a)[0][0];
  }

  static getFavoriteGenre(genreStats) {
    const entries = Object.entries(genreStats);
    if (entries.length === 0) return 'None';
    return entries.sort(([,a], [,b]) => b - a)[0][0];
  }

  static getTotalAchievements() {
    // Count total achievements from AchievementSystem
    return 50; // Approximate total number of achievements
  }

  static updateGamingIdentity() {
    // Update level and title when achievements are unlocked
    const profile = this.getProfile();
    StorageService.setString('gamerLevel', profile.level);
    StorageService.setString('gamerTitle', profile.title);
    StorageService.setString('gamerType', this.determineGamerType(profile.stats));
  }

  static resetJoinDate() {
    // Reset join date to current date (for testing or correction)
    const currentDate = new Date().toISOString();
    StorageService.setString('joinDate', currentDate);
    return currentDate;
  }

  static getJoinDateFormatted() {
    const joinDate = StorageService.getString('joinDate');
    if (!joinDate) return 'Unknown';

    const date = new Date(joinDate);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // ---- Identity Snapshot History ----

  static saveIdentitySnapshot() {
    const profile = this.getProfile();
    const snapshots = StorageService.get(IDENTITY_SNAPSHOTS_KEY, []);
    const today = new Date().toISOString().split('T')[0];

    // Only save one snapshot per day
    if (snapshots.length > 0) {
      const last = snapshots[snapshots.length - 1];
      if (last.date.startsWith(today)) return snapshots;
    }

    snapshots.push({
      date: new Date().toISOString(),
      level: profile.level,
      title: profile.title,
      archetype: profile.identity?.archetype || null,
      favoriteMood: profile.identity?.favoriteMood || null,
      favoriteGenre: profile.identity?.favoriteGenre || null,
      playStyle: profile.identity?.playStyle || null,
      totalPlayTime: profile.stats?.totalPlayTime || 0,
      totalSessions: profile.stats?.totalSessions || 0,
      librarySize: profile.stats?.librarySize || 0
    });

    // Keep last 52 snapshots (roughly a year of weekly snapshots)
    const trimmed = snapshots.slice(-52);
    StorageService.set(IDENTITY_SNAPSHOTS_KEY, trimmed);
    return trimmed;
  }

  static getIdentitySnapshots() {
    return StorageService.get(IDENTITY_SNAPSHOTS_KEY, []);
  }

  // ---- Completion-Driven Identity Rewards ----

  static checkIdentityRewards() {
    const profile = this.getProfile();
    const unlocked = StorageService.get(IDENTITY_REWARDS_KEY, []);
    const newRewards = [];

    const rewardDefs = [
      { id: 'mood_master', name: 'Mood Master', icon: '🎭', requirement: () => profile.identity?.favoriteMood && profile.stats?.totalSessions >= 10 },
      { id: 'genre_specialist', name: 'Genre Specialist', icon: '🎯', requirement: () => profile.identity?.favoriteGenre && profile.stats?.totalPlayTime >= 300 },
      { id: 'archetype_unlocked', name: 'True Identity', icon: '🏆', requirement: () => profile.identity?.archetype !== null && profile.stats?.librarySize >= 5 },
      { id: 'marathon_runner', name: 'Marathon Runner', icon: '⏱️', requirement: () => profile.identity?.playStyle === 'Marathon' && profile.stats?.totalPlayTime >= 600 },
      { id: 'quick_session_king', name: 'Quick Session King', icon: '⚡', requirement: () => profile.identity?.playStyle === 'Quick Sessions' && profile.stats?.totalSessions >= 20 },
      { id: 'strategist', name: 'Strategist', icon: '♟️', requirement: () => profile.identity?.playStyle === 'Strategic' && profile.stats?.totalSessions >= 15 },
      { id: 'explorer', name: 'Explorer', icon: '🗺️', requirement: () => profile.identity?.playStyle === 'Explorer' && profile.stats?.librarySize >= 8 }
    ];

    for (const def of rewardDefs) {
      if (!unlocked.includes(def.id) && def.requirement()) {
        unlocked.push(def.id);
        newRewards.push(def);
      }
    }

    if (newRewards.length > 0) {
      StorageService.set(IDENTITY_REWARDS_KEY, unlocked);
    }

    return { unlocked, newRewards };
  }

  static getIdentityRewards() {
    const all = [
      { id: 'mood_master', name: 'Mood Master', icon: '🎭', desc: 'Found your signature mood after 10 sessions.' },
      { id: 'genre_specialist', name: 'Genre Specialist', icon: '🎯', desc: '5+ hours in your favorite genre.' },
      { id: 'archetype_unlocked', name: 'True Identity', icon: '🏆', desc: 'Discovered your archetype with 5+ games.' },
      { id: 'marathon_runner', name: 'Marathon Runner', icon: '⏱️', desc: '10+ hours as a marathon player.' },
      { id: 'quick_session_king', name: 'Quick Session King', icon: '⚡', desc: '20+ quick sessions logged.' },
      { id: 'strategist', name: 'Strategist', icon: '♟️', desc: '15+ strategic sessions played.' },
      { id: 'explorer', name: 'Explorer', icon: '🗺️', desc: '8+ games in your library as an explorer.' }
    ];
    const unlocked = StorageService.get(IDENTITY_REWARDS_KEY, []);
    return all.map((r) => ({ ...r, unlocked: unlocked.includes(r.id) }));
  }
}
