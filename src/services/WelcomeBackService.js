import { GamingPersonaService } from './GamingPersonaService';
import { RecommendationExplainer } from './RecommendationExplainer';
import SessionRepository from './SessionRepository';

function normalizeArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((v) => String(v || '').toLowerCase().trim()).filter(Boolean);
}

function scoreSimilarity(anchorGame, candidateGame) {
  if (!anchorGame || !candidateGame) return 0;
  if (anchorGame.name === candidateGame.name) return -1;

  const anchorGenres = normalizeArray(anchorGame.genres);
  const candGenres = normalizeArray(candidateGame.genres);
  const anchorTags = normalizeArray(anchorGame.tags);
  const candTags = normalizeArray(candidateGame.tags);

  let score = 0;

  const genreOverlap = candGenres.filter((g) => anchorGenres.includes(g)).length;
  score += genreOverlap * 20;

  const tagOverlap = candTags.filter((t) => anchorTags.includes(t)).length;
  score += tagOverlap * 8;

  if (anchorGame.mood && candidateGame.mood && anchorGame.mood === candidateGame.mood) {
    score += 15;
  }

  if (candidateGame.time_played > 0) {
    score -= 5;
  } else {
    score += 10;
  }

  if (candidateGame.last_played) {
    const daysSince = (Date.now() - new Date(candidateGame.last_played).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < 3) score -= 12;
    else if (daysSince < 7) score -= 6;
  }

  try {
    const personaId = GamingPersonaService.getPrimaryPersona()?.id;
    if (personaId && GamingPersonaService.gameMatchesPersona(candidateGame, personaId)) {
      score += 18;
    }
  } catch {
    // persona optional
  }

  return score;
}

function getRecentGames(library) {
  if (!Array.isArray(library) || library.length === 0) return [];

  // Filter games with valid last_played timestamp and playtime
  const withLastPlayed = library
    .filter((g) => g?.name && g.last_played && Number(g?.time_played) > 0)
    .sort((a, b) => new Date(b.last_played) - new Date(a.last_played));

  if (withLastPlayed.length > 0) {
    return withLastPlayed;
  }

  // Fallback if no last_played timestamps exist yet
  return library
    .filter((g) => g?.name && Number(g?.time_played) > 0)
    .sort((a, b) => (b.time_played || 0) - (a.time_played || 0));
}

function pickAnchorGame(library) {
  const recent = getRecentGames(library);
  return recent.length > 0 ? recent[0] : null;
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'recently';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'recently';

  const diffMs = Math.max(0, Date.now() - date.getTime());
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

function buildReason(anchorGame, recommendedGame, secondRecentGame, publicIdentity) {
  const anchorName = anchorGame?.name || 'your last game';
  const timeAgoStr = formatTimeAgo(anchorGame?.last_played);
  const recName = recommendedGame?.name || 'this pick';
  const anchorGenres = normalizeArray(anchorGame?.genres);
  const recGenres = normalizeArray(recommendedGame?.genres);
  const sharedGenres = recGenres.filter((g) => anchorGenres.includes(g));

  const label = publicIdentity?.label;

  // Case 1: Active 2-game rotation (played 2 different games recently)
  if (secondRecentGame && secondRecentGame.name !== anchorGame?.name) {
    const secondName = secondRecentGame.name;
    if (recommendedGame?.name === secondName) {
      return `Welcome back! You were playing ${anchorName} (${timeAgoStr}), but your other recent go-to is ${secondName}. Ready to switch gears?`;
    }
    return `You're currently rotating between ${anchorName} (${timeAgoStr}) and ${secondName}. Here's a relatable pick to match your vibe — ${recName}.`;
  }

  // Case 2: Shared genre continuation from last played
  if (sharedGenres.length > 0) {
    const genreText = sharedGenres.slice(0, 2).map((g) => g.charAt(0).toUpperCase() + g.slice(1)).join(' / ');
    return `Last played ${anchorName} ${timeAgoStr}. Since you're in a ${genreText} mood, pick up ${recName} next!`;
  }

  try {
    const explainerRoast = RecommendationExplainer.getArchetypePersonaReasoning(recommendedGame, null, recGenres[0]);
    if (explainerRoast) {
      return `Last session: ${anchorName} (${timeAgoStr}). ${explainerRoast}`;
    }
  } catch {
    // ignore
  }

  if (label) {
    return `${label} take: Fresh off ${anchorName} (${timeAgoStr}), ${recName} is your most relatable next move.`;
  }

  return `Picked up ${anchorName} ${timeAgoStr} — ${recName} is a great pick to keep your gaming momentum going.`;
}

function formatSessionDuration(minutes) {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function getLastSessionForGame(gameName) {
  try {
    const history = SessionRepository.getSessionHistory();
    if (!Array.isArray(history) || history.length === 0) return null;
    const sorted = [...history].sort((a, b) => {
      const aTs = new Date(a.endTime || a.timestamp || 0).getTime();
      const bTs = new Date(b.endTime || b.timestamp || 0).getTime();
      return bTs - aTs;
    });
    const match = sorted.find((s) => {
      const sName = String(s.gameName || s.gameId || '').trim().toLowerCase();
      return sName && sName === String(gameName || '').trim().toLowerCase();
    });
    if (!match) return null;
    const minutes = Number(match.playtimeMinutes ?? match.playtime ?? match.duration ?? match.minutes ?? 0);
    return { minutes, endTime: match.endTime || match.timestamp || null };
  } catch {
    return null;
  }
}

function buildRecentHeadline(anchor, secondRecent, lastSession) {
  const anchorName = anchor?.name || 'your last game';
  const timeAgoStr = formatTimeAgo(anchor?.last_played);
  const sessionDur = lastSession ? formatSessionDuration(lastSession.minutes) : null;

  if (secondRecent && secondRecent.name !== anchor?.name) {
    return `Last session: ${anchorName} (${timeAgoStr}). Rotating with ${secondRecent.name} — what's next?`;
  }

  if (sessionDur) {
    return `Last session: ${anchorName} for ${sessionDur} (${timeAgoStr}). Ready to jump back in?`;
  }

  return `Last played ${anchorName} ${timeAgoStr}. Ready to pick it back up?`;
}

function buildWelcomeBack(library) {
  if (!Array.isArray(library) || library.length < 2) return null;

  const recentList = getRecentGames(library);
  if (recentList.length === 0) return null;

  const anchor = recentList[0];
  const secondRecent = recentList.length > 1 ? recentList[1] : null;

  const candidates = library.filter((g) => g?.name && g.name !== anchor.name);
  if (candidates.length === 0) return null;

  let best = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    const s = scoreSimilarity(anchor, c);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }

  if (!best || bestScore < 0) return null;

  let publicIdentity = null;
  try {
    publicIdentity = GamingPersonaService.getPublicIdentity();
  } catch {
    // optional
  }

  const lastSession = getLastSessionForGame(anchor.name);
  const reason = buildReason(anchor, best, secondRecent, publicIdentity);
  const headline = buildRecentHeadline(anchor, secondRecent, lastSession);

  return {
    anchorGame: anchor,
    secondRecentGame: secondRecent,
    recommendedGame: best,
    reason,
    label: publicIdentity?.label || null,
    roast: publicIdentity?.roast || null,
    headline,
    lastSessionDuration: lastSession ? formatSessionDuration(lastSession.minutes) : null,
    allTimeLabel: publicIdentity?.label || null,
    allTimeRoast: publicIdentity?.roast || null,
    score: bestScore
  };
}

export const WelcomeBackService = {
  buildWelcomeBack,
  pickAnchorGame,
  scoreSimilarity
};

export default WelcomeBackService;
