import { GamingPersonaService } from './GamingPersonaService';
import { RecommendationExplainer } from './RecommendationExplainer';

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

function pickAnchorGame(library) {
  if (!Array.isArray(library) || library.length === 0) return null;

  const played = library
    .filter((g) => Number(g?.time_played) > 0)
    .sort((a, b) => (b.time_played || 0) - (a.time_played || 0));

  if (played.length > 0) {
    const top = played[0];
    const second = played[1];
    if (second && top.time_played > second.time_played * 1.5) {
      return top;
    }
    const recent = library
      .filter((g) => g?.last_played && Number(g?.time_played) > 0)
      .sort((a, b) => new Date(b.last_played) - new Date(a.last_played));
    if (recent.length > 0 && recent[0].name !== top.name) {
      return recent[0];
    }
    return top;
  }

  return null;
}

function buildReason(anchorGame, recommendedGame, publicIdentity) {
  const anchorName = anchorGame?.name || 'your last game';
  const recName = recommendedGame?.name || 'this one';
  const anchorGenres = normalizeArray(anchorGame?.genres);
  const recGenres = normalizeArray(recommendedGame?.genres);
  const sharedGenres = recGenres.filter((g) => anchorGenres.includes(g));

  const label = publicIdentity?.label;
  const roast = publicIdentity?.roast;

  if (sharedGenres.length > 0) {
    const genreText = sharedGenres.slice(0, 2).map((g) => g.charAt(0).toUpperCase() + g.slice(1)).join(' / ');
    if (label && roast) {
      return `Since you've been living in ${anchorName}, here's another ${genreText} pick — ${recName}. ${roast}`;
    }
    return `Since you've been playing ${anchorName}, try ${recName} — same ${genreText} energy.`;
  }

  try {
    const explainerRoast = RecommendationExplainer.getArchetypePersonaReasoning(recommendedGame, null, recGenres[0]);
    if (explainerRoast) {
      return `You've been grinding ${anchorName}. ${explainerRoast}`;
    }
  } catch {
    // ignore
  }

  if (label && roast) {
    return `${label} take: you've been in ${anchorName}, try ${recName} next. ${roast}`;
  }

  return `You've been playing ${anchorName} — ${recName} might be your next thing.`;
}

function buildWelcomeBack(library) {
  if (!Array.isArray(library) || library.length < 2) return null;

  const anchor = pickAnchorGame(library);
  if (!anchor) return null;

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

  const reason = buildReason(anchor, best, publicIdentity);

  return {
    anchorGame: anchor,
    recommendedGame: best,
    reason,
    label: publicIdentity?.label || null,
    roast: publicIdentity?.roast || null,
    headline: publicIdentity?.headline || null,
    score: bestScore
  };
}

export const WelcomeBackService = {
  buildWelcomeBack,
  pickAnchorGame,
  scoreSimilarity
};

export default WelcomeBackService;
