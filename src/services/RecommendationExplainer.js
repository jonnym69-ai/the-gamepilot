/**
 * RecommendationExplainer Service
 * Generates human-readable explanations for why games are recommended
 */

import { UserBehaviorProfile } from './UserBehaviorProfile';
import { PersonaPerformanceInsights } from './PersonaPerformanceInsights';
import { StartupPersonalizationService } from './StartupPersonalizationService';
import { GamingIdentity } from '../GamingIdentity';
import { GamingPersonaService } from './GamingPersonaService';

export class RecommendationExplainer {
  /**
   * Generate explanation for a recommended game
   */
  static explainRecommendation(game, mood, genre, timeAvailable, recommendationType = 'perfect-play') {
    const reasons = [];
    const profile = UserBehaviorProfile.getProfile();
    const personaSnapshot = UserBehaviorProfile.getPersonaSnapshot();
    const startupSeed = StartupPersonalizationService.getSeededRecommendationContext();
    const startupInfluence = UserBehaviorProfile.getStartupInfluenceSummary();
    const normalizedTimeAvailable = UserBehaviorProfile.normalizeTimeAvailable(timeAvailable);

    // Get base reasoning from behavior profile
    const behaviorReasons = UserBehaviorProfile.getRecommendationReasoning(game, mood, genre);
    reasons.push(...behaviorReasons);

    // Gaming Identity reasoning (factual stats)
    const identityReason = this.getIdentityReasoning(game, mood, genre);
    if (identityReason) {
      reasons.push(identityReason);
    }

    const startupReason = this.getStartupSeedReasoning(game, mood, genre, startupSeed, normalizedTimeAvailable, startupInfluence);
    if (startupReason) {
      reasons.push(startupReason);
    }

    reasons.push(...this.getLocalSignalReasoning(game, recommendationType));

    // Signature game + taste cluster reasoning
    const signatureReason = this.getSignatureGameReasoning(game);
    if (signatureReason) {
      reasons.push(signatureReason);
    }

    // Generate the two-tier card-intent hooks separately from the detail list.
    const cardIntent = this.getCardIntent(recommendationType);
    const { global: globalHook, gameSpecific: gameSpecificHook } = this.generateCardIntentReasons(cardIntent, game, profile);

    let uniqueReasons = [...new Set(reasons.filter(Boolean))];

    // Inject the two-tier hooks at the front so they dominate the preview.
    if (globalHook && !uniqueReasons.includes(globalHook)) uniqueReasons.unshift(globalHook);
    if (gameSpecificHook && !uniqueReasons.includes(gameSpecificHook)) uniqueReasons.unshift(gameSpecificHook);

    // One archetype roast per game, placed at the very front as the headline
    const archetypeRoast = this.getArchetypePersonaReasoning(game, mood, genre);
    if (archetypeRoast && !uniqueReasons.includes(archetypeRoast)) {
      uniqueReasons.unshift(archetypeRoast);
    }

    // Classify familiarity for this game
    let familiarityLabel = null;
    let familiarityReason = null;
    try {
      const classification = GamingIdentity.classifyFamiliarity(game);
      familiarityLabel = classification.label;
      if (classification.reasons.length > 0) {
        familiarityReason = classification.label === 'familiar'
          ? `Familiar territory — ${classification.reasons.join(', ')}`
          : `Fresh pick — outside your usual rotation`;
      } else {
        familiarityReason = classification.label === 'familiar'
          ? 'Familiar territory — matches your proven tastes'
          : 'Fresh pick — new territory for you';
      }
      uniqueReasons.push(familiarityReason);
    } catch { /* optional */ }

    const prioritizedReasons = this.prioritizeReasons(uniqueReasons, game);
    // Limit to 5 unique reasons for library recs to avoid overwhelming the user
    const limitedReasons = prioritizedReasons.slice(0, 5);
    const previewReasons = limitedReasons.slice(0, 5);

    return {
      game: game.name,
      recommendationType,
      reasons: limitedReasons,
      previewReasons,
      globalHook,
      gameSpecificHook,
      familiarity: familiarityLabel,
      confidence: this.calculateConfidence(game, mood, genre, profile, personaSnapshot),
      matchScore: this.calculateMatchScore(game, mood, genre, profile, personaSnapshot),
      personaIdentity: personaSnapshot?.personaIdentity || null,
      startupSeed,
      startupInfluence,
      hardwareSummary: null
    };
  }

  static getSignatureGameReasoning(game) {
    try {
      const identity = GamingIdentity.getProfile();
      const sigGames = identity?.signatureGames || [];
      const clusters = identity?.tasteClusters || [];
      const gameGenres = Array.isArray(game?.genres) ? game.genres : [];
      const reasons = [];

      // Check taste cluster membership first — this is the strongest signal
      if (clusters.length > 0) {
        const topCluster = clusters[0];
        const clusterGenres = new Set(
          topCluster.gameNames
            .map((n) => sigGames.find((s) => s.name === n)?.genres || [])
            .flat()
        );
        const genreOverlap = gameGenres.filter((g) => clusterGenres.has(g)).length;
        if (genreOverlap > 0) {
          reasons.push(
            `Shares your ${topCluster.label} taste — your signature includes ${topCluster.gameNames.slice(0, 2).join(' and ')}`
          );
        }
      }

      // Check direct genre overlap with signature games
      if (sigGames.length > 0 && reasons.length === 0) {
        const sigGenres = new Set(sigGames.flatMap((s) => s.genres || []));
        const overlap = gameGenres.filter((g) => sigGenres.has(g));
        if (overlap.length >= 2) {
          const topSig = sigGames[0];
          reasons.push(
            `Overlaps with ${overlap.length} genres from your signature game ${topSig.name} (${topSig.playtimeHours}h played)`
          );
        }
      }

      return reasons.length > 0 ? reasons[0] : null;
    } catch {
      return null;
    }
  }

  static getPersonaReasoning(personaSnapshot, mood, genre) {
    if (!personaSnapshot || !personaSnapshot.personaIdentity) {
      return null;
    }

    const gamingPersona = GamingPersonaService.getPersona();
    const { personaIdentity } = personaSnapshot;
    const label = gamingPersona?.primaryPersona?.label || personaIdentity.label;
    const anchors = personaIdentity.anchors?.filter(Boolean) || [];
    const anchorText = anchors.length ? anchors.join(' + ') : null;
    if (anchorText && mood && anchors.includes(mood)) {
      return `${label} pick — ${anchorText} moods are your comfort zone`;
    }

    if (anchorText && genre) {
      return `${label} thrives when ${genre} adventures appear`;
    }

    return null;
  }

  static getArchetypePersonaReasoning(game, mood, genre) {
    try {
      const persona = GamingPersonaService.getPersona();
      if (!persona?.primaryPersona) return null;

      const archetype = persona.primaryPersona;
      const gameName = game?.name || 'this game';
      const gameGenres = Array.isArray(game?.genres) ? game.genres : [];
      const gameHours = game?.time_played ? Math.round(game.time_played / 60) : 0;

      // Build signals object for template filling
      const signals = {
        GAME: gameName,
        HOURS: gameHours,
        GENRE: gameGenres[0] || genre || 'gaming'
      };

      // Pick a context roast if available, otherwise fall back to generic roast
      // Use game name hash for consistent selection per game
      const seed = gameName.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      const roastPool = archetype.contextRoasts && archetype.contextRoasts.length > 0
        ? archetype.contextRoasts
        : archetype.roasts || [];
      const roastIndex = seed % roastPool.length;
      const roastTemplate = roastPool[roastIndex];

      // Fill template with game-specific details
      const filledRoast = roastTemplate
        .replace(/\{GAME\}/g, signals.GAME)
        .replace(/\{HOURS\}/g, signals.HOURS)
        .replace(/\{GENRE\}/g, signals.GENRE);

      return filledRoast || null;
    } catch {
      return null;
    }
  }

  static getIdentityReasoning(game, mood, genre) {
    try {
      const identity = GamingIdentity.getProfile();
      if (!identity?.identity) return null;

      const id = identity.identity;
      const gameGenres = Array.isArray(game?.genres) ? game.genres : [];
      const reasons = [];

      if (mood && id.favoriteMood && mood === id.favoriteMood) {
        reasons.push(`Matches your signature ${id.favoriteMood} mood`);
      }

      if (genre && id.favoriteGenre && genre === id.favoriteGenre) {
        reasons.push(`Fits your ${id.favoriteGenre} specialty`);
      } else if (id.favoriteGenre && gameGenres.includes(id.favoriteGenre)) {
        reasons.push(`From your favorite genre: ${id.favoriteGenre}`);
      }

      if (id.playStyle) {
        const estimated = PersonaPerformanceInsights.estimateSessionMinutes(game);
        if (id.playStyle === 'Marathon' && estimated > 120) {
          reasons.push('Suits your marathon playstyle');
        } else if (id.playStyle === 'Quick Sessions' && estimated <= 60) {
          reasons.push('Perfect for your quick-session habit');
        } else if (id.playStyle === 'Strategic' && estimated >= 60 && estimated <= 180) {
          reasons.push('Matches your strategic session pace');
        }
      }

      return reasons.length > 0 ? reasons[0] : null;
    } catch {
      return null;
    }
  }

  static getStartupSeedReasoning(game, mood, genre, startupSeed, timeAvailable, startupInfluence) {
    if (!startupSeed || !startupInfluence?.active) {
      return null;
    }

    const gameGenres = Array.isArray(game?.genres) ? game.genres : [];
    const startupMoods = Array.isArray(startupSeed.moods) ? startupSeed.moods : [];
    const startupGenres = Array.isArray(startupSeed.genres) ? startupSeed.genres : [];
    const estimatedSessionMinutes = PersonaPerformanceInsights.estimateSessionMinutes(game);
    const reasons = [];

    if (mood && startupMoods.includes(mood)) {
      reasons.push(`${mood} was part of your startup tuning`);
    }

    if (genre && startupGenres.includes(genre)) {
      reasons.push(`${genre} was one of your first-picked genres`);
    }

    const overlappingGenre = startupGenres.find((seedGenre) => gameGenres.includes(seedGenre));
    if (!genre && overlappingGenre) {
      reasons.push(`Matches your onboarding taste for ${overlappingGenre}`);
    }

    const seededSessionMinutes = UserBehaviorProfile.normalizeTimeAvailable(startupSeed.sessionPreference);
    if (seededSessionMinutes && estimatedSessionMinutes) {
      const diff = Math.abs(seededSessionMinutes - estimatedSessionMinutes);
      if (diff <= 30) {
        reasons.push(`Lands close to your ${this.formatDuration(seededSessionMinutes)} startup session preference`);
      }
    } else if (timeAvailable && startupSeed.sessionPreference === timeAvailable) {
      reasons.push(`Aligned with your startup session preference`);
    }

    if (startupSeed.playerVibe) {
      reasons.push(`Fits your ${startupSeed.playerVibe.toLowerCase()} profile`);
    }

    return reasons.length > 0
      ? `${startupInfluence.shortLabel} startup seed: ${reasons.slice(0, 2).join(' • ')}`
      : null;
  }

  static getLocalSignalReasoning(game, recommendationType) {
    const reasons = [];
    const playtimeMinutes = Number(game?.time_played || 0);
    const launchCount = Number(game?.launch_count || game?.launchCount || 0);
    const lastPlayedTime = game?.last_played ? new Date(game.last_played).getTime() : 0;

    if (playtimeMinutes > 0) {
      reasons.push(`Your local history already has ${this.formatDuration(playtimeMinutes)} logged here`);
    } else if (recommendationType === 'perfect-play' || recommendationType === 'surprise-me') {
      reasons.push('Unplayed in your local history, so it adds discovery without repeating recent sessions');
    }

    if (launchCount > 1) {
      reasons.push(`You have launched it ${launchCount} times, which makes it a proven library signal`);
    }

    if (Number.isFinite(lastPlayedTime) && lastPlayedTime > 0) {
      const daysSince = Math.max(0, Math.floor((Date.now() - lastPlayedTime) / (1000 * 60 * 60 * 24)));
      if (daysSince <= 7) {
        reasons.push('Recently active in your library, so it is easy to resume');
      } else if (daysSince >= 30) {
        reasons.push(`Last played ${daysSince} days ago, making it a strong rediscovery candidate`);
      }
    }

    return reasons.slice(0, 3);
  }

  /**
   * Map the internal recommendation type to a card intent for reasoning.
   */
  static getCardIntent(recommendationType) {
    switch (recommendationType) {
      case 'perfect-play':
      case 'favorite-anchor':
        return 'tonight';
      case 'continue-playing':
        return 'continue';
      case 'rediscover':
        return 'rediscover';
      case 'surprise-me':
        return 'surprise';
      case 'buy':
        return 'buy';
      default:
        return 'tonight';
    }
  }

  /**
   * Build a context object from local-only telemetry so templates can fill in
   * game-specific and player-specific metrics without reaching for external APIs.
   */
  static buildCardReasonContext(game, profile) {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const hour = now.getHours();
    const currentTime = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : hour < 22 ? 'evening' : 'night';

    const playtimeMinutes = Number(game?.time_played || game?.timePlayedMinutes || 0);
    const launchCount = Number(game?.launch_count || game?.launchCount || 0);
    const lastPlayedAt = game?.last_played ? new Date(game.last_played) : null;
    let daysSince = null;
    let lastPlayedText = '';
    if (lastPlayedAt && Number.isFinite(lastPlayedAt.getTime())) {
      const msSince = Date.now() - lastPlayedAt.getTime();
      daysSince = Math.max(0, Math.floor(msSince / (1000 * 60 * 60 * 24)));
      if (daysSince === 0) {
        const hoursSince = Math.max(0, Math.floor(msSince / (1000 * 60 * 60)));
        if (hoursSince === 0) {
          const minutesSince = Math.max(0, Math.floor(msSince / (1000 * 60)));
          lastPlayedText = minutesSince <= 1 ? 'just now' : `${minutesSince} minutes ago`;
        } else {
          lastPlayedText = `${hoursSince} hour${hoursSince === 1 ? '' : 's'} ago`;
        }
      } else {
        lastPlayedText = `${daysSince} day${daysSince === 1 ? '' : 's'} ago`;
      }
    }
    const gameAvgSession = launchCount > 0 ? Math.round(playtimeMinutes / launchCount) : 0;

    const avgSession = Number(profile?.playstylePatterns?.avgSessionLength || 0);

    const genrePreferences = profile?.genrePreferences || {};
    const topGenre = Object.entries(genrePreferences)
      .sort((a, b) => {
        const scoreA = (Number(a[1].totalPlaytime || 0) + (Number(a[1].count || 0) * 60));
        const scoreB = (Number(b[1].totalPlaytime || 0) + (Number(b[1].count || 0) * 60));
        return scoreB - scoreA;
      })
      .map(([genre]) => genre)[0] || '';

    const genres = Array.isArray(game?.genres) ? game.genres : [];
    const genreA = genres[0] || '';
    const genreB = genres[1] || genreA;

    const playStyle = avgSession > 120 ? 'marathon' : avgSession < 45 ? 'bursts' : 'mixed';

    const timeSlotPreferences = profile?.timeSlotPreferences || {};
    const preferredTime = Object.entries(timeSlotPreferences)
      .sort((a, b) => (Number(b[1].count || 0) - Number(a[1].count || 0)))
      .map(([slot]) => slot)[0] || currentTime;

    return {
      gameName: game?.name || 'this game',
      genreA,
      genreB,
      avgSession: avgSession > 0 ? this.formatDuration(avgSession) : '',
      gameAvgSession: gameAvgSession > 0 ? this.formatDuration(gameAvgSession) : '',
      daysSince: lastPlayedText || '',
      lastPlayedText: lastPlayedText || '',
      timePlayed: playtimeMinutes > 0 ? this.formatDuration(playtimeMinutes) : '',
      launchCount: launchCount > 0 ? String(launchCount) : '',
      currentDay,
      currentTime,
      preferredTime,
      topGenre,
      playStyle
    };
  }

  static safeTemplate(value, fallback = '') {
    return value !== undefined && value !== null && value !== '' ? value : fallback;
  }

  static fillTemplate(template, context) {
    return template
      .replace(/\{gameName\}/g, this.safeTemplate(context.gameName))
      .replace(/\{genreA\}/g, this.safeTemplate(context.genreA))
      .replace(/\{genreB\}/g, this.safeTemplate(context.genreB, this.safeTemplate(context.genreA, 'Gaming')))
      .replace(/\{avgSession\}/g, this.safeTemplate(context.avgSession))
      .replace(/\{gameAvgSession\}/g, this.safeTemplate(context.gameAvgSession))
      .replace(/\{daysSince\}/g, this.safeTemplate(context.lastPlayedText, this.safeTemplate(context.daysSince)))
      .replace(/\{lastPlayedText\}/g, this.safeTemplate(context.lastPlayedText))
      .replace(/\{timePlayed\}/g, this.safeTemplate(context.timePlayed))
      .replace(/\{launchCount\}/g, this.safeTemplate(context.launchCount))
      .replace(/\{currentDay\}/g, this.safeTemplate(context.currentDay))
      .replace(/\{currentTime\}/g, this.safeTemplate(context.currentTime))
      .replace(/\{preferredTime\}/g, this.safeTemplate(context.preferredTime))
      .replace(/\{topGenre\}/g, this.safeTemplate(context.topGenre))
      .replace(/\{playStyle\}/g, this.safeTemplate(context.playStyle));
  }

  static extractPlaceholders(template) {
    const matches = template.match(/\{(\w+)\}/g) || [];
    return [...new Set(matches.map((m) => m.slice(1, -1)))];
  }

  static sharesHook(globalTemplate, gameTemplate) {
    const metrics = ['avgSession', 'gameAvgSession', 'launchCount', 'daysSince', 'lastPlayedText', 'timePlayed', 'genreA', 'genreB', 'topGenre', 'playStyle'];
    const globalPlaceholders = this.extractPlaceholders(globalTemplate);
    const gamePlaceholders = this.extractPlaceholders(gameTemplate);
    return metrics.some((m) => globalPlaceholders.includes(m) && gamePlaceholders.includes(m));
  }

  static pickRandom(items) {
    if (!Array.isArray(items) || items.length === 0) return null;
    return items[Math.floor(Math.random() * items.length)];
  }

  static getCardIntentTemplates(intent) {
    const templates = {
      tonight: {
        global: [
          { text: 'Your {currentDay} {currentTime} window is your most active launch slot, averaging {avgSession}.', weight: 1, condition: (ctx) => ctx.avgSession && ctx.currentDay && ctx.currentTime },
          { text: 'You lean into {topGenre} during {currentTime} sessions more than any other time.', weight: 1, condition: (ctx) => ctx.topGenre && ctx.currentTime },
          { text: 'Your play style is {playStyle}, so tonight\'s pick should match your typical {avgSession} burst.', weight: 1, condition: (ctx) => ctx.playStyle && ctx.avgSession }
        ],
        game: [
          { text: '{gameName}\'s average session length is {gameAvgSession}, matching your {currentDay} {currentTime} window.', weight: 1, condition: (ctx) => ctx.gameAvgSession && ctx.currentDay && ctx.currentTime },
          { text: 'Your {currentTime} launches often include {genreA}; {gameName} fits that pattern.', weight: 1, condition: (ctx) => ctx.currentTime && ctx.genreA },
          { text: '{gameName} is a {genreA}/{genreB} blend, which aligns with your {currentTime} genre rotation.', weight: 1, condition: (ctx) => ctx.genreA && ctx.genreB && ctx.currentTime && ctx.genreB !== ctx.genreA },
          { text: 'With a {gameAvgSession} average, {gameName} won\'t overrun your typical {avgSession} session.', weight: 1, condition: (ctx) => ctx.gameAvgSession && ctx.avgSession }
        ]
      },
      continue: {
        global: [
          { text: 'You tend to return to games within a few days of your last session.', weight: 1, condition: () => true },
          { text: 'Your average session length is {avgSession}, and you tend to chain sessions on the same game.', weight: 1, condition: (ctx) => ctx.avgSession },
          { text: 'You prefer {playStyle} sessions, which makes this a natural continuation.', weight: 1, condition: (ctx) => ctx.playStyle }
        ],
        game: [
          { text: 'You logged {launchCount} sessions in {gameName}.', weight: 1, condition: (ctx) => ctx.launchCount && ctx.gameName },
          { text: 'Last played {gameName} {lastPlayedText} — jump back in before the rhythm fades.', weight: 1, condition: (ctx) => ctx.gameName && ctx.lastPlayedText },
          { text: 'Your {gameName} sessions average {gameAvgSession}, close to your overall {avgSession} average.', weight: 1, condition: (ctx) => ctx.gameAvgSession && ctx.avgSession },
          { text: 'You have {timePlayed} in {gameName}; one more session keeps it fresh.', weight: 1, condition: (ctx) => ctx.timePlayed && ctx.gameName }
        ]
      },
      rediscover: {
        global: [
          { text: 'You have several high-investment games that went cold after a strong start.', weight: 1, condition: () => true },
          { text: 'Your library has games with long playtime but no recent launch.', weight: 1, condition: () => true },
          { text: 'You often abandon games after {playStyle} bursts; this one had staying power before it dropped off.', weight: 1, condition: (ctx) => ctx.playStyle }
        ],
        game: [
          { text: 'You played {gameName} for {timePlayed} across {launchCount} sessions, then stopped {lastPlayedText}.', weight: 1, condition: (ctx) => ctx.gameName && ctx.timePlayed && ctx.launchCount && ctx.lastPlayedText },
          { text: '{gameName} has {timePlayed} on record but no launch since {lastPlayedText}.', weight: 1, condition: (ctx) => ctx.gameName && ctx.timePlayed && ctx.lastPlayedText },
          { text: 'You used to play {gameName} in {gameAvgSession} bursts; it\'s been quiet since {lastPlayedText}.', weight: 1, condition: (ctx) => ctx.gameName && ctx.gameAvgSession && ctx.lastPlayedText },
          { text: '{gameName} was one of your more-played {genreA} titles before it dropped off your rotation.', weight: 1, condition: (ctx) => ctx.gameName && ctx.genreA && ctx.timePlayed }
        ]
      },
      surprise: {
        global: [
          { text: 'A random pick from your wishlist that still fits your local taste profile.', weight: 1, condition: () => true },
          { text: 'A change of pace from your usual top recommendation.', weight: 1, condition: () => true }
        ],
        game: [
          { text: '{gameName} sits in your wishlist with {genreA} tags that match your {topGenre} history.', weight: 1, condition: (ctx) => ctx.gameName && ctx.genreA && ctx.topGenre },
          { text: '{gameName} is a {genreA}/{genreB} pick that fits your {playStyle} pattern.', weight: 1, condition: (ctx) => ctx.gameName && ctx.genreA && ctx.genreB && ctx.playStyle && ctx.genreB !== ctx.genreA },
          { text: 'A {genreA} title from your wishlist to consider alongside your current rotation.', weight: 1, condition: (ctx) => ctx.genreA }
        ]
      },
      buy: {
        global: [
          { text: 'This buy recommendation aligns with your {topGenre} play history.', weight: 1, condition: (ctx) => ctx.topGenre },
          { text: 'Your wishlist picks lean toward {playStyle} sessions like your library average.', weight: 1, condition: (ctx) => ctx.playStyle }
        ],
        game: [
          { text: '{gameName} is a {genreA} title that fits your {playStyle} pattern.', weight: 1, condition: (ctx) => ctx.gameName && ctx.genreA && ctx.playStyle },
          { text: '{gameName} adds a {genreA} option to your {topGenre}-heavy rotation.', weight: 1, condition: (ctx) => ctx.gameName && ctx.genreA && ctx.topGenre }
        ]
      }
    };
    return templates[intent] || templates.tonight;
  }

  /**
   * Generate a two-tier reason for a given card intent using only local telemetry.
   * Returns { global: string, gameSpecific: string }.
   */
  static generateCardIntentReasons(intent, game, profile) {
    const ctx = this.buildCardReasonContext(game, profile);
    const templates = this.getCardIntentTemplates(intent);

    const validGlobal = templates.global.filter((t) => t.condition(ctx));
    const validGame = templates.game.filter((t) => t.condition(ctx));

    let globalTemplate = this.pickRandom(validGlobal);
    let gameTemplate = this.pickRandom(validGame);

    // Avoid the same telemetry hook appearing in both tiers.
    if (globalTemplate && gameTemplate && this.sharesHook(globalTemplate.text, gameTemplate.text)) {
      const alternative = validGame.find((t) => !this.sharesHook(globalTemplate.text, t.text));
      if (alternative) gameTemplate = alternative;
    }

    const global = globalTemplate ? this.fillTemplate(globalTemplate.text, ctx) : null;
    const gameSpecific = gameTemplate ? this.fillTemplate(gameTemplate.text, ctx) : null;

    return { global, gameSpecific };
  }

  /**
   * Get Perfect Play specific reasoning (Tonight's Best Pick)
   */
  static getPerfectPlayReasoning(game, mood, genre, timeAvailable, profile) {
    const { global, gameSpecific } = this.generateCardIntentReasons('tonight', game, profile);
    return [global, gameSpecific].filter(Boolean).join(' ');
  }

  /**
   * Get Surprise Me specific reasoning
   */
  static getSurpriseMeReasoning(game, profile) {
    const { global, gameSpecific } = this.generateCardIntentReasons('surprise', game, profile);
    return [global, gameSpecific].filter(Boolean).join(' ');
  }

  /**
   * Get Rediscover specific reasoning
   */
  static getRediscoverReasoning(game, profile) {
    const { global, gameSpecific } = this.generateCardIntentReasons('rediscover', game, profile);
    return [global, gameSpecific].filter(Boolean).join(' ');
  }

  /**
   * Get Continue Playing specific reasoning
   */
  static getContinuePlayingReasoning(game, profile) {
    const { global, gameSpecific } = this.generateCardIntentReasons('continue', game, profile);
    return [global, gameSpecific].filter(Boolean).join(' ');
  }

  static getFavoriteAnchorReasoning(game) {
    if (game?.time_played > 0) {
      return `Kept close because your local play history shows this is already part of your identity`;
    }

    return 'Kept close as a personal anchor pick from your library shelf';
  }

  /**
   * Calculate confidence score (0-100)
   */
  static calculateConfidence(game, mood, genre, profile, personaSnapshot) {
    let confidence = 50; // Base confidence

    // Mood match bonus
    if (mood) {
      const moodData = profile.moodPreferences[mood];
      if (moodData && moodData.count > 5) {
        const completionRate = moodData.completedCount / moodData.count;
        confidence += completionRate * 30;
      }
    }

    // Genre match bonus
    if (genre) {
      const genreData = profile.genrePreferences[genre];
      if (genreData && genreData.count > 5) {
        const completionRate = genreData.completedCount / genreData.count;
        confidence += completionRate * 20;
      }
    }

    // Prior playtime bonus
    if (game.time_played && game.time_played > 0) {
      confidence += 10;
    }

    const personaAlignment = UserBehaviorProfile.getPersonaAlignmentScore({
      mood,
      genres: game?.genres || [],
      sessionMinutes: PersonaPerformanceInsights.estimateSessionMinutes(game)
    });
    if (personaAlignment > 0) {
      confidence += Math.min(15, personaAlignment * 0.15);
    }

    if (personaSnapshot?.personaIdentity && personaSnapshot.personaIdentity.completionSignal > 0) {
      confidence += Math.min(10, personaSnapshot.personaIdentity.completionSignal * 0.1);
    }

    return Math.min(confidence, 100);
  }

  /**
   * Calculate match score (0-100) based on how well game matches user profile
   */
  static calculateMatchScore(game, mood, genre, profile, personaSnapshot) {
    let score = 0;
    let factors = 0;
    const estimatedSessionMinutes = PersonaPerformanceInsights.estimateSessionMinutes(game);

    // Mood match
    if (mood) {
      const moodData = profile.moodPreferences[mood];
      if (moodData && moodData.count > 0) {
        score += (moodData.completedCount / moodData.count) * 100;
        factors++;
      }
    }

    // Genre match
    if (genre) {
      const genreData = profile.genrePreferences[genre];
      if (genreData && genreData.count > 0) {
        score += (genreData.completedCount / genreData.count) * 100;
        factors++;
      }
    }

    // Session length match
    const avgSession = profile.playstylePatterns.avgSessionLength;
    if (avgSession > 0 && estimatedSessionMinutes) {
      const lengthMatch = Math.max(0, 100 - Math.abs(estimatedSessionMinutes - avgSession) * (100 / 180));
      score += lengthMatch;
      factors++;
    }

    const personaAlignment = UserBehaviorProfile.getPersonaAlignmentScore({
      mood,
      genres: game?.genres || [],
      sessionMinutes: PersonaPerformanceInsights.estimateSessionMinutes(game)
    });
    if (personaAlignment > 0) {
      score += personaAlignment;
      factors++;
    }

    if (personaSnapshot?.personaIdentity?.anchors?.length) {
      score += 80;
      factors++;
    }

    return factors > 0 ? Math.round(score / factors) : 50;
  }

  static formatDuration(minutes) {
    if (!minutes || !Number.isFinite(minutes)) {
      return 'any time';
    }

    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }

    const hours = minutes / 60;
    if (Number.isInteger(hours)) {
      return `${hours}h`;
    }

    return `${hours.toFixed(1)}h`;
  }

  /**
   * Score how game-specific a reason is. Higher means more distinctive to this game,
   * lower means it could be copy-pasted onto almost any recommendation.
   */
  static scoreReasonDistinctiveness(reason, gameName) {
    if (!reason) return 0;
    let score = 0;
    const lower = reason.toLowerCase();

    // Mentions the actual game name -> very distinctive.
    if (gameName && lower.includes(gameName.toLowerCase())) score += 5;

    // References concrete, game-specific signals.
    if (/estimated \d+ min/i.test(reason)) score += 2;
    if (/you rated this/i.test(reason)) score += 2;
    if (/last played/i.test(reason)) score += 2;
    if (/you('ve| have) (spent|invested|already|launched)/i.test(reason)) score += 2;
    if (/shares your .* taste/i.test(reason)) score += 2;
    if (/signature/i.test(reason)) score += 1;
    if (/unplayed in your local history/i.test(reason)) score += 1;
    if (/fits within your/i.test(reason)) score += 1;

    // Generic profile boilerplate that repeats across every card.
    if (/peak gaming time/i.test(reason)) score -= 3;
    if (/average session length/i.test(reason)) score -= 3;
    if (/comfort zone$/i.test(reason)) score -= 2;
    if (/aligned with your/i.test(reason)) score -= 2;
    if (/startup seed/i.test(reason)) score -= 2;
    if (/recommended based on your gaming profile/i.test(reason)) score -= 2;

    return score;
  }

  /**
   * Reorder reasons so the most distinctive ones surface first, then rotate ties
   * by a per-game daily seed so each card shows a different mix.
   */
  static prioritizeReasons(reasons, game) {
    if (!Array.isArray(reasons) || reasons.length === 0) return reasons;

    const gameName = game?.name || '';
    const daySeed = new Date().toISOString().slice(0, 10);
    const baseSeed = gameName.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 0)
      + daySeed.split('').reduce((acc, ch) => acc * 31 + ch.charCodeAt(0), 0);

    const scored = reasons.map((reason, index) => ({
      reason,
      index,
      score: this.scoreReasonDistinctiveness(reason, gameName)
    }));

    // Group by score so we can rotate within ties without changing relative priority.
    const groups = [];
    scored.forEach((item) => {
      const last = groups[groups.length - 1];
      if (last && last[0].score === item.score) {
        last.push(item);
      } else {
        groups.push([item]);
      }
    });

    groups.sort((a, b) => b[0].score - a[0].score);

    const rotated = groups.flatMap((group, groupIndex) => {
      if (group.length <= 1) return group;
      const offset = Math.abs(baseSeed + groupIndex) % group.length;
      return [...group.slice(offset), ...group.slice(0, offset)];
    });

    // Preserve original order for ties that don't get rotated (defensive).
    rotated.sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      return a.index - b.index;
    });

    return rotated.map((item) => item.reason);
  }

  /**
   * Get detailed explanation for display
   */
  static getDetailedExplanation(game, mood, genre, timeAvailable, recommendationType = 'perfect-play') {
    const explanation = this.explainRecommendation(game, mood, genre, timeAvailable, recommendationType);
    const headlineReason = explanation.previewReasons?.[0]
      || explanation.reasons?.[0]
      || 'Recommended for you';

    return {
      ...explanation,
      summary: `${explanation.confidence}% confident match - ${headlineReason}`,
      fullExplanation: explanation.reasons.join('\n')
    };
  }
}
