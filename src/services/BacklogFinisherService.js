/**
 * BacklogFinisherService - Helps users prioritize and finish their backlog
 * Identifies games that are worth finishing based on time invested, progress, etc.
 */

class BacklogFinisherService {
  /**
   * Analyzes a game to determine if it's a good candidate for finishing
   * @param {Object} game - Game object with playtime and other metadata
   * @returns {Object} - Analysis result with score and reasoning
   */
  static analyzeGameForFinishing(game) {
    if (!game || typeof game !== 'object') {
      return null;
    }

    const timePlayed = game.time_played || 0;
    const hoursPlayed = timePlayed / 60;
    
    // Skip games with no playtime (never started) or already completed
    if (timePlayed === 0) {
      return { 
        isCandidate: false, 
        reason: 'Never played',
        score: 0 
      };
    }

    // Check if game is already completed
    try {
      const completedGames = JSON.parse(localStorage.getItem('completedGames') || '[]');
      if (completedGames.some(cg => cg.name === game.name)) {
        return { 
          isCandidate: false, 
          reason: 'Already completed',
          score: 0 
        };
      }
    } catch (error) {
      console.error('Error checking completed games:', error);
    }

    let score = 0;
    const reasons = [];

    // Factor 1: Time invested (sunk cost fallacy - but useful for prioritization)
    if (hoursPlayed >= 20) {
      score += 40;
      reasons.push('Significant time invested (20+ hours)');
    } else if (hoursPlayed >= 10) {
      score += 30;
      reasons.push('Good progress made (10+ hours)');
    } else if (hoursPlayed >= 5) {
      score += 20;
      reasons.push('Started but not deep (5+ hours)');
    } else {
      score += 10;
      reasons.push('Just started');
    }

    // Factor 2: Recent play (if played recently, user is engaged)
    const lastPlayed = game.last_played;
    if (lastPlayed) {
      const lastPlayedDate = new Date(lastPlayed);
      const daysSincePlayed = (Date.now() - lastPlayedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSincePlayed < 7) {
        score += 25;
        reasons.push('Played recently (within a week)');
      } else if (daysSincePlayed < 30) {
        score += 15;
        reasons.push('Played this month');
      } else if (daysSincePlayed < 90) {
        score += 5;
        reasons.push('Played within 3 months');
      }
    }

    // Factor 3: Completion percentage (if available)
    if (game.achievements?.unlocked && game.achievements?.total) {
      const achievementRate = game.achievements.unlocked / game.achievements.total;
      if (achievementRate >= 0.7) {
        score += 30;
        reasons.push('Near completion (70%+ achievements)');
      } else if (achievementRate >= 0.5) {
        score += 20;
        reasons.push('Halfway there (50%+ achievements)');
      } else if (achievementRate >= 0.25) {
        score += 10;
        reasons.push('Making progress (25%+ achievements)');
      }
    }

    // Factor 4: Game rating (if user rated it highly, they enjoyed it)
    if (game.userRating) {
      if (game.userRating >= 4) {
        score += 20;
        reasons.push('Highly rated by you');
      } else if (game.userRating >= 3) {
        score += 10;
        reasons.push('Positive rating');
      }
    }

    // Factor 5: Game length estimation
    const estimatedHours = game.hltb?.mainStory || game.playtimeEstimate || 0;
    if (estimatedHours > 0 && hoursPlayed > 0) {
      const completionPercentage = hoursPlayed / estimatedHours;
      if (completionPercentage >= 0.75) {
        score += 25;
        reasons.push('75%+ of estimated completion time');
      } else if (completionPercentage >= 0.5) {
        score += 15;
        reasons.push('Halfway through estimated time');
      } else if (completionPercentage >= 0.25) {
        score += 5;
        reasons.push('Started estimated playtime');
      }
    }

    // Factor 6: Genre completion tendency
    const genres = game.genres || [];
    if (genres.includes('RPG') || genres.includes('Adventure')) {
      score += 5;
      reasons.push('Story-driven game (worth finishing)');
    }

    // Factor 7: Campaign/Story mode presence
    if (game.hasCampaign || game.storyMode || game.singleplayer) {
      score += 10;
      reasons.push('Has story/campaign mode');
    }

    return {
      isCandidate: score > 30,
      score: Math.min(100, score),
      reasons: reasons,
      hoursPlayed: Math.round(hoursPlayed * 10) / 10,
      estimatedRemaining: estimatedHours > hoursPlayed ? Math.round((estimatedHours - hoursPlayed) * 10) / 10 : 0
    };
  }

  /**
   * Gets prioritized list of backlog games to finish
   * @param {Array} library - Array of game objects
   * @param {number} limit - Maximum number of games to return
   * @returns {Array} - Prioritized list with analysis
   */
  static getBacklogPriorities(library, limit = 5) {
    if (!Array.isArray(library) || library.length === 0) {
      return [];
    }

    const analyzedGames = library
      .map(game => ({
        game,
        analysis: this.analyzeGameForFinishing(game)
      }))
      .filter(({ analysis }) => analysis && analysis.isCandidate)
      .sort((a, b) => b.analysis.score - a.analysis.score);

    return analyzedGames.slice(0, limit).map(({ game, analysis }) => ({
      game,
      priorityScore: analysis.score,
      reasons: analysis.reasons,
      hoursPlayed: analysis.hoursPlayed,
      estimatedRemaining: analysis.estimatedRemaining,
      franchise: this.detectFranchise(game.name)
    }));
  }

  /**
   * Gets backlog statistics
   * @param {Array} library - Array of game objects
   * @returns {Object} - Statistics about the backlog
   */
  static getBacklogStats(library) {
    if (!Array.isArray(library)) {
      return {
        totalBacklog: 0,
        totalHoursInvested: 0,
        estimatedHoursToFinish: 0,
        highPriorityCount: 0
      };
    }

    let totalBacklog = 0;
    let totalHoursInvested = 0;
    let estimatedHoursToFinish = 0;
    let highPriorityCount = 0;

    const priorities = this.getBacklogPriorities(library, 999);

    library.forEach(game => {
      const analysis = this.analyzeGameForFinishing(game);
      if (analysis && analysis.isCandidate) {
        totalBacklog++;
        totalHoursInvested += analysis.hoursPlayed;
        estimatedHoursToFinish += analysis.estimatedRemaining;
      }
    });

    highPriorityCount = priorities.filter(p => p.priorityScore >= 60).length;

    return {
      totalBacklog,
      totalHoursInvested: Math.round(totalHoursInvested),
      estimatedHoursToFinish: Math.round(estimatedHoursToFinish),
      highPriorityCount,
      averageScore: priorities.length > 0 
        ? Math.round(priorities.reduce((sum, p) => sum + p.priorityScore, 0) / priorities.length)
        : 0
    };
  }

  /**
   * Simple franchise detection for grouping
   * @param {string} gameName - Game name
   * @returns {string|null} - Franchise name or null
   */
  static detectFranchise(gameName) {
    if (!gameName) return null;
    
    const franchises = [
      { pattern: /dark\s*souls|demon['']?s\s*souls|elden\s*ring|bloodborne|sekiro/i, name: 'Souls Series' },
      { pattern: /witcher/i, name: 'The Witcher' },
      { pattern: /mass\s*effect/i, name: 'Mass Effect' },
      { pattern: /dragon\s*age/i, name: 'Dragon Age' },
      { pattern: /fallout/i, name: 'Fallout' },
      { pattern: /elder\s*scrolls|skyrim|oblivion/i, name: 'Elder Scrolls' },
      { pattern: /assassin['']?s\s*creed/i, name: 'Assassin\'s Creed' },
      { pattern: /god\s*of\s*war/i, name: 'God of War' },
      { pattern: /horizon.*(dawn|west)/i, name: 'Horizon' },
      { pattern: /final\s*fantasy/i, name: 'Final Fantasy' },
      { pattern: /resident\s*evil|biohazard/i, name: 'Resident Evil' },
      { pattern: /metal\s*gear|mgs/i, name: 'Metal Gear' },
      { pattern: /uncharted/i, name: 'Uncharted' },
      { pattern: /the\s*last\s*of\s*us|tlou/i, name: 'The Last of Us' },
      { pattern: /bioshock/i, name: 'BioShock' },
      { pattern: /borderlands/i, name: 'Borderlands' },
      { pattern: /doom/i, name: 'DOOM' },
      { pattern: /half.life|halflife/i, name: 'Half-Life' },
      { pattern: /portal/i, name: 'Portal' },
      { pattern: /gta|grand\s*theft\s*auto/i, name: 'Grand Theft Auto' },
      { pattern: /red\s*dead\s*redemption|rdr/i, name: 'Red Dead Redemption' }
    ];

    for (const franchise of franchises) {
      if (franchise.pattern.test(gameName)) {
        return franchise.name;
      }
    }
    return null;
  }

  /**
   * Gets a motivational message based on backlog stats
   * @param {Object} stats - Backlog statistics
   * @returns {string} - Motivational message
   */
  static getMotivationalMessage(stats) {
    if (stats.totalBacklog === 0) {
      return 'Your backlog is clear! Time to start something new.';
    }
    if (stats.highPriorityCount >= 5) {
      return `You have ${stats.highPriorityCount} high-priority games waiting. Time to focus!`;
    }
    if (stats.totalHoursInvested > 100) {
      return `You've invested ${stats.totalHoursInvested} hours. Let's finish what you started!`;
    }
    if (stats.estimatedHoursToFinish < 20) {
      return `Only ~${stats.estimatedHoursToFinish} hours left to clear your backlog!`;
    }
    return `You have ${stats.totalBacklog} games to finish. Let's tackle them one by one.`;
  }

  /**
   * Suggests a game to finish based on current mood/time
   * @param {Array} backlogPriorities - Prioritized backlog games
   * @param {string} mood - Current mood preference
   * @param {number} availableTime - Available time in minutes
   * @returns {Object|null} - Suggested game with reasoning
   */
  static suggestGameToFinish(backlogPriorities, mood, availableTime) {
    if (!Array.isArray(backlogPriorities) || backlogPriorities.length === 0) {
      return null;
    }

    // Filter by available time if specified
    let candidates = backlogPriorities;
    if (availableTime && availableTime > 0) {
      candidates = backlogPriorities.filter(p => 
        p.estimatedRemaining === 0 || (p.estimatedRemaining * 60) <= availableTime
      );
    }

    if (candidates.length === 0) {
      // If no games fit the time, just return the highest priority
      candidates = backlogPriorities;
    }

    // Mood-based filtering (simplified)
    if (mood) {
      const moodMatches = candidates.filter(p => {
        const genres = p.game.genres || [];
        const moodMap = {
          'Action': ['Action', 'Shooter', 'Fighting'],
          'Relaxing': ['Casual', 'Puzzle', 'Simulation'],
          'Story': ['RPG', 'Adventure', 'Visual Novel'],
          'Challenge': ['Strategy', 'Rogue-like', 'Souls-like']
        };
        const matchingGenres = moodMap[mood] || [];
        return genres.some(g => matchingGenres.includes(g));
      });
      
      if (moodMatches.length > 0) {
        candidates = moodMatches;
      }
    }

    const suggestion = candidates[0];
    return {
      game: suggestion.game,
      priorityScore: suggestion.priorityScore,
      reason: suggestion.reasons[0] || 'High priority backlog game',
      hoursToFinish: suggestion.estimatedRemaining,
      franchise: suggestion.franchise
    };
  }
}

export { BacklogFinisherService };
export default BacklogFinisherService;
