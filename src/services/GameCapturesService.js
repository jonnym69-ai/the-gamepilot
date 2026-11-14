import SessionRepository from './SessionRepository';

const api = () => (typeof window !== 'undefined' ? window.electronAPI : null);

// Clips/shots are often saved seconds-to-minutes after the moment — allow a
// little drift past the recorded session end before calling it unattributed.
const SESSION_GRACE_MS = 15 * 60 * 1000;
const CACHE_TTL_MS = 60 * 1000;

const normalizeTitle = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const sessionBounds = (session) => {
  const start = Number(session?.startTime || session?.startedAt || session?.date || 0);
  const end = Number(session?.endTime || session?.ended_at || session?.timestamp || 0);
  if (!Number.isFinite(start) || start <= 0) return null;
  return { start, end: Number.isFinite(end) && end > 0 ? end : start };
};

export class GameCapturesService {
  static cache = null;
  static cacheAt = 0;

  static async listCaptures({ force = false } = {}) {
    const now = Date.now();
    if (!force && this.cache && now - this.cacheAt < CACHE_TTL_MS) return this.cache;
    const result = await api()
      ?.listGameCaptures?.()
      .catch(() => null);
    this.cache = result?.ok && Array.isArray(result.captures) ? result.captures : [];
    this.cacheAt = now;
    return this.cache;
  }

  /** filename title prefix → library game (exact-normalized, then substring). */
  static matchByTitle(capture, library = []) {
    const hint = normalizeTitle(capture?.titleHint);
    if (!hint || hint.length < 4) return null;
    const candidates = (Array.isArray(library) ? library : [])
      .map((game) => ({ game, slug: normalizeTitle(game?.name) }))
      .filter(({ slug }) => slug.length >= 4);
    const exact = candidates.find(({ slug }) => slug === hint);
    if (exact) return exact.game;
    return candidates.find(({ slug }) => slug.includes(hint) || hint.includes(slug))?.game || null;
  }

  /** capturedAt → the session that was live then (with a post-save grace). */
  static matchBySession(capture, sessions = []) {
    const t = Number(capture?.capturedAt);
    if (!Number.isFinite(t) || t <= 0) return null;
    let best = null;
    for (const session of Array.isArray(sessions) ? sessions : []) {
      const bounds = sessionBounds(session);
      if (!bounds || !session?.gameName) continue;
      if (t < bounds.start || t > bounds.end + SESSION_GRACE_MS) continue;
      if (!best || bounds.start > sessionBounds(best).start) best = session;
    }
    return best;
  }

  /**
   * Every capture lands with a game or in the unattributed pool:
   * title-prefix first, then "which session was live when this was saved".
   * Returns { byGame: Map<gameName, captures[]>, unattributed: [] }.
   */
  static attribute(captures = [], library = [], sessions = []) {
    const byGame = new Map();
    const unattributed = [];
    const push = (name, capture) => {
      if (!byGame.has(name)) byGame.set(name, []);
      byGame.get(name).push(capture);
    };
    for (const capture of Array.isArray(captures) ? captures : []) {
      const titled = this.matchByTitle(capture, library);
      if (titled) {
        push(titled.name, capture);
        continue;
      }
      const session = this.matchBySession(capture, sessions);
      if (session) {
        push(session.gameName, capture);
        continue;
      }
      unattributed.push(capture);
    }
    return { byGame, unattributed };
  }

  static async getForGame(gameName, { library = [] } = {}) {
    const captures = await this.listCaptures();
    if (!captures.length) return [];
    const sessions = SessionRepository.getSessionHistory();
    const { byGame } = this.attribute(captures, library, sessions);
    return byGame.get(gameName) || [];
  }

  static async getAttribution({ library = [] } = {}) {
    const captures = await this.listCaptures();
    const sessions = SessionRepository.getSessionHistory();
    const attributed = this.attribute(captures, library, sessions);
    return { captures, ...attributed };
  }

  /** Full-res image as a data URL — for share-card backgrounds. */
  static async readImageDataUrl(capture) {
    if (!capture || capture.kind !== 'image') return null;
    const result = await api()
      ?.readCaptureImage?.({ dir: capture.dir, name: capture.name })
      .catch(() => null);
    return result?.ok ? result.dataUrl : null;
  }

  /**
   * Poster frame for a clip: hidden <video> seeks a couple of seconds in and
   * draws one frame to canvas. Works on file:// URLs (renderer is file://).
   */
  static getClipPosterFrame(capture, { atSeconds = 2, maxWidth = 720 } = {}) {
    return new Promise((resolve) => {
      if (!capture?.fileUrl || capture.kind !== 'video') {
        resolve(null);
        return;
      }
      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'auto';
      video.playsInline = true;
      const finish = (value) => {
        video.removeAttribute('src');
        video.load();
        resolve(value);
      };
      const timer = setTimeout(() => finish(null), 12000);
      const done = (value) => {
        clearTimeout(timer);
        finish(value);
      };
      video.addEventListener('error', () => done(null));
      video.addEventListener('loadeddata', () => {
        const target = Math.min(atSeconds, Math.max(0, (video.duration || atSeconds) - 0.5));
        try {
          video.currentTime = target;
        } catch {
          done(null);
        }
      });
      video.addEventListener('seeked', () => {
        try {
          const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round((video.videoWidth || maxWidth) * scale));
          canvas.height = Math.max(1, Math.round((video.videoHeight || 1) * scale));
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          done(canvas.toDataURL('image/jpeg', 0.85));
        } catch {
          done(null);
        }
      });
      video.src = capture.fileUrl;
    });
  }

  static open(capture) {
    return api()
      ?.openCapture?.({ dir: capture?.dir, name: capture?.name })
      .catch(() => null);
  }
}

export default GameCapturesService;
