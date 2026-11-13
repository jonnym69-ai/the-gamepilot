/**
 * AchievementCompletionService — bridges Steam achievements and the
 * completion list.
 *
 * Two detection tiers:
 *  - "100%": every Steam achievement unlocked. Unambiguous — applied to the
 *    completion history automatically during scans.
 *  - "beaten": a name/description heuristic on unlocked achievements
 *    ("complete the story", "roll credits", "the end"...). Fuzzy, so these
 *    surface as review candidates and are only written when the user
 *    confirms via AchievementCompletionCard.
 *
 * Manual statuses always win: a suggestion is only applied when it outranks
 * the stored status, so we never downgrade 'completed'/'100%' or overwrite
 * something the user set themselves. Dismissed candidates stay dismissed.
 */
import StorageService from './StorageService';
import SteamAchievementsService from './SteamAchievementsService';
import SteamPublicService from './SteamPublicService';
import { GameCurationService } from './GameCurationService';
import HowLongToBeatService from './HowLongToBeatService';

const DISMISSED_KEY = 'achievementCompletionDismissedV1';
const CANDIDATES_KEY = 'achievementCompletionCandidatesV1';
const LAST_SCAN_KEY = 'achievementCompletionLastScanV1';
const SCAN_STATS_KEY = 'achievementCompletionScanStatsV1';
const SCAN_INTERVAL_MS = 6 * 60 * 60 * 1000; // matches the achievement cache TTL
const MAX_PER_SCAN = 30; // cap per pass — a big library scans over several visits
const NETWORK_DELAY_MS = 350; // pause between live (non-cached) relay calls

// Achievement names/descriptions that suggest the game is *finished* — the
// story is done, on any difficulty — which is 'beaten', not '100%'. Slightly
// generous on purpose: detections are always user-reviewed, so recall beats
// precision. A false positive just costs a dismiss click.
const DIFFICULTY =
  'easy|normal|medium|hard|hardcore|casual|nightmare|insane|veteran|heroic|' +
  'legendary|extreme|brutal|survival|expert|master|apocalyptic|deadly|higher';

const BEATEN_PATTERNS = [
  // Direct story/campaign completions: "Complete the Story", "Finished the Campaign"
  /complete[sd]? the (main )?(story|campaign|game|main quest|adventure)/i,
  /finish(ed)? the (game|story|campaign)/i,
  /clear(ed)? (the )?(story|campaign|game)/i,
  /(story|campaign|game) (complete[sd]?|cleared|finished)/i,
  // Difficulty-qualified finishes: "Completed on Normal", "Finished on any
  // difficulty", "Beat the game on Hard or higher"
  new RegExp(
    `(complete[sd]?|finish(ed)?|clear(ed)?|beat|completed on).{0,25}(difficulty|on (any )?(${DIFFICULTY})\\b)`,
    'i'
  ),
  new RegExp(`(${DIFFICULTY}) (mode|difficulty).{0,20}(complete[sd]?|cleared|finished|beat)`, 'i'),
  new RegExp(`(complete[sd]?|cleared|finished|beat) (the )?(${DIFFICULTY}) (mode|difficulty)`, 'i'),
  // Reaching an ending — any ending counts as finished
  /(reach|saw|see|witness|unlock|achieve|earn|get|obtain)(ed)?\b.{0,12}\bending/i,
  /\bending\b.{0,12}(achieved|unlocked|reached|seen|complete)/i,
  // Classic endgame markers
  /(roll|watch(ed)?|sit through|see|saw) (the )?credits/i,
  /\bthe end\b/i,
  /\bepilogue\b/i,
  /beat(en)? the (game|final boss)/i,
  /(complete[sd]?|clear(ed)?|defeat(ed)?|beat) (the )?final (boss|mission|chapter|level|act)/i,
  /final (boss|mission|chapter|level|act) (complete[sd]?|clear(ed)?|defeat(ed)?)/i,
];

// Higher rank = stronger completion claim. Only upgrades ever auto-apply.
const STATUS_RANK = {
  'not-started': 0,
  playing: 1,
  abandoned: 1,
  beaten: 2,
  completed: 3,
  '100%': 4,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A tracked session inside this window implies 'playing' when no explicit
// status exists — explicit statuses (incl. 'abandoned') always win.
const RECENT_SESSION_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export class AchievementCompletionService {
  /** Steam public-data opt-in is the gate for the whole feature. */
  static isAvailable() {
    try {
      return SteamPublicService.isEnabled();
    } catch {
      return false;
    }
  }

  /**
   * Evaluate one getForGame() payload.
   * Returns { status:'100%', reason } | { status:'beaten', achievementName, reason } | null.
   */
  static evaluate(result) {
    if (!result?.ok) return null;
    const total = Number(result.total) || 0;
    const unlocked = Number(result.unlocked) || 0;
    if (total > 0 && unlocked >= total) {
      return { status: '100%', reason: `All ${total} achievements unlocked` };
    }
    const list = Array.isArray(result.achievements) ? result.achievements : [];
    const hit = list.find(
      (a) => a?.achieved && BEATEN_PATTERNS.some((p) => p.test(a.name || '') || p.test(a.description || ''))
    );
    if (hit) {
      return {
        status: 'beaten',
        achievementName: hit.name || 'a completion achievement',
        achievementApiname: hit.apiname || '',
        reason: `Unlocked "${hit.name || 'a completion achievement'}"`,
      };
    }
    return null;
  }

  /** Steam reports unlock times as epoch seconds; sessions are epoch ms. */
  static unlockMs(unlockTime) {
    const t = Number(unlockTime) || 0;
    return t > 0 ? (t < 1e12 ? t * 1000 : t) : 0;
  }

  /** { start, end } ms for a session-history entry, or null when undated. */
  static sessionWindowMs(entry) {
    const parse = (v) => {
      if (v == null) return 0;
      const n = typeof v === 'number' ? v : new Date(v).getTime();
      return Number.isFinite(n) ? n : 0;
    };
    const end = parse(entry?.endTime) || parse(entry?.timestamp);
    if (!end) return null;
    const minutes = Number(entry?.playtimeMinutes ?? entry?.playtime ?? entry?.duration ?? entry?.minutes) || 0;
    return { start: parse(entry?.startTime) || end - Math.max(0, minutes) * 60000, end };
  }

  /** Session for `gameName` containing an unlock timestamp, if one exists. */
  static sessionForUnlockMs(gameName, unlockTimeMs, sessions) {
    if (!unlockTimeMs || !Array.isArray(sessions)) return null;
    const name = String(gameName || '').toLowerCase();
    return (
      sessions.find((s) => {
        if (String(s?.gameName || s?.gameId || '').toLowerCase() !== name) return false;
        const win = this.sessionWindowMs(s);
        return win && unlockTimeMs >= win.start && unlockTimeMs <= win.end;
      }) || null
    );
  }

  static sessionEvidenceOf(session, unlockTimeMs) {
    if (!session) return null;
    return {
      unlockMs: unlockTimeMs,
      endTime: this.sessionWindowMs(session)?.end || 0,
      minutes:
        Math.round(
          Number(session?.playtimeMinutes ?? session?.playtime ?? session?.duration ?? session?.minutes) || 0
        ) || 0,
    };
  }

  /**
   * "The session where it happened" evidence for a beaten candidate — reads
   * the achievement cache and the local session history only.
   */
  static getCandidateSessionEvidence(candidate, sessions) {
    if (!candidate?.appid) return null;
    const list = SteamAchievementsService.getCachedForGame?.(candidate.appid)?.achievements || [];
    const hit = list.find(
      (a) =>
        a?.achieved &&
        ((candidate.achievementApiname && a.apiname === candidate.achievementApiname) ||
          (candidate.achievementName &&
            (a.name === candidate.achievementName || a.apiname === candidate.achievementName)))
    );
    const unlockMs = this.unlockMs(hit?.unlockTime);
    return this.sessionEvidenceOf(this.sessionForUnlockMs(candidate.name, unlockMs, sessions), unlockMs);
  }

  /** Same evidence for an auto-100% game: the session holding its last unlock. */
  static getCompletionSessionEvidence(appid, gameName, sessions) {
    const list = SteamAchievementsService.getCachedForGame?.(appid)?.achievements || [];
    const last = Math.max(0, ...list.filter((a) => a?.achieved).map((a) => this.unlockMs(a?.unlockTime)));
    if (!last) return null;
    return this.sessionEvidenceOf(this.sessionForUnlockMs(gameName, last, sessions), last);
  }

  /** True when `suggested` is a stronger claim than `current` — never downgrades. */
  static shouldApply(currentStatus, suggestedStatus) {
    const current = STATUS_RANK[currentStatus] ?? 0;
    const suggested = STATUS_RANK[suggestedStatus] ?? 0;
    return suggested > current;
  }

  static getDismissed() {
    try {
      const list = StorageService.get(DISMISSED_KEY, []);
      return new Set(Array.isArray(list) ? list : []);
    } catch {
      return new Set();
    }
  }

  /** Beaten suggestions awaiting user review, persisted across sessions. */
  static getCandidates() {
    try {
      const list = StorageService.get(CANDIDATES_KEY, []);
      if (!Array.isArray(list)) return [];
      const dismissed = this.getDismissed();
      return list.filter(
        (c) =>
          c?.appid &&
          !dismissed.has(String(c.appid)) &&
          this.shouldApply(GameCurationService.getGameCompletion(c.name)?.status || 'not-started', 'beaten')
      );
    } catch {
      return [];
    }
  }

  static setCandidates(list) {
    try {
      StorageService.set(CANDIDATES_KEY, Array.isArray(list) ? list.filter((c) => c?.appid && c?.name) : []);
    } catch {
      /* best-effort */
    }
  }

  static removeCandidate(appid) {
    this.setCandidates(this.getCandidates().filter((c) => String(c.appid) !== String(appid)));
  }

  /** User said "no" to a beaten suggestion — never surface it again. */
  static dismiss(appid) {
    try {
      const dismissed = this.getDismissed();
      dismissed.add(String(appid));
      StorageService.set(DISMISSED_KEY, [...dismissed]);
      this.removeCandidate(appid);
    } catch {
      /* best-effort */
    }
  }

  /** User confirmed a beaten suggestion — write it to the completion history. */
  static confirmBeaten(gameName, achievementName, appid) {
    const current = GameCurationService.getGameCompletion(gameName)?.status || 'not-started';
    if (!this.shouldApply(current, 'beaten')) return false;
    GameCurationService.setGameCompletion(gameName, 'beaten', `Detected via Steam achievement "${achievementName}"`);
    if (appid) this.removeCandidate(appid);
    return true;
  }

  /**
   * Games within sight of 100% — reads the local achievement cache only, so
   * coverage grows as sweeps run. Returns rows sorted closest-first:
   * { name, appid, unlocked, total, pct, remaining }.
   */
  static getFinishLine(library, { minPct = 0.7, limit = 6 } = {}) {
    if (!Array.isArray(library)) return [];
    const steamGames = library
      .map((game) => ({
        name: String(game?.name || game?.title || '').trim(),
        appid: SteamPublicService.appIdOf?.(game) || String(game?.appid || ''),
      }))
      .filter((g) => g.name && g.appid);
    if (steamGames.length === 0) return [];

    let summaries = {};
    try {
      summaries = SteamAchievementsService.getSummaryForGames(steamGames.map((g) => g.appid)) || {};
    } catch {
      return [];
    }

    return steamGames
      .map((g) => {
        const s = summaries[g.appid];
        const total = Number(s?.total) || 0;
        const unlocked = Number(s?.unlocked) || 0;
        if (total <= 0) return null;
        const pct = unlocked / total;
        if (pct < minPct || pct >= 1) return null;
        return { ...g, unlocked, total, pct, remaining: total - unlocked };
      })
      .filter(Boolean)
      .sort((a, b) => b.pct - a.pct || a.remaining - b.remaining)
      .slice(0, limit);
  }

  /**
   * Games marked 'playing', with "time to credits" when an HLTB estimate is
   * already cached or attached to the game entry — zero network. Sorted by
   * closest-to-done first, most-played first when no estimate exists.
   */
  static getPlayingGames(library, { limit = 4, sessions = [], nowMs = Date.now() } = {}) {
    if (!Array.isArray(library)) return [];

    // Last-seen timestamp and total tracked minutes per game, from sessions.
    const lastPlayedByName = new Map();
    const minutesByName = new Map();
    (Array.isArray(sessions) ? sessions : []).forEach((s) => {
      const key = String(s?.gameName || s?.gameId || '').toLowerCase();
      if (!key) return;
      const end = this.sessionWindowMs(s)?.end || 0;
      if (end > (lastPlayedByName.get(key) || 0)) lastPlayedByName.set(key, end);
      const mins = Number(s?.playtimeMinutes ?? s?.playtime ?? s?.duration ?? s?.minutes) || 0;
      if (mins > 0) minutesByName.set(key, (minutesByName.get(key) || 0) + mins);
    });

    const rows = [];
    for (const game of library) {
      const name = String(game?.name || game?.title || '').trim();
      if (!name) continue;
      const status = GameCurationService.getGameCompletion(name)?.status || 'not-started';
      const lastPlayedMs = lastPlayedByName.get(name.toLowerCase()) || 0;
      const implied = status === 'not-started' && lastPlayedMs > 0 && nowMs - lastPlayedMs <= RECENT_SESSION_WINDOW_MS;
      if (status !== 'playing' && !implied) continue;
      const playedMinutes = Math.max(
        Math.round(Number(game?.time_played ?? game?.playtime ?? 0) || 0),
        Math.round(minutesByName.get(name.toLowerCase()) || 0)
      );
      const mainStoryHours =
        Number(game?.hltb?.mainStory ?? game?.hltb?.main_story ?? game?.playtimeEstimate ?? 0) ||
        Number(HowLongToBeatService.getEstimate?.(game)?.mainStory) ||
        0;
      rows.push({
        name,
        playedMinutes,
        mainStoryHours: mainStoryHours || null,
        remainingHours: mainStoryHours > 0 ? Math.max(0, mainStoryHours - playedMinutes / 60) : null,
        implied: status !== 'playing',
        lastPlayedMs: lastPlayedMs || null,
      });
    }
    return rows
      .sort(
        (a, b) => (a.remainingHours ?? Infinity) - (b.remainingHours ?? Infinity) || b.playedMinutes - a.playedMinutes
      )
      .slice(0, limit);
  }

  static getLastScan() {
    try {
      return Number(StorageService.get(LAST_SCAN_KEY, 0)) || 0;
    } catch {
      return 0;
    }
  }

  /** Last sweep's numbers for the status line — null until the first scan. */
  static getScanStats() {
    try {
      const stats = StorageService.get(SCAN_STATS_KEY, null);
      return stats && Number.isFinite(stats.scanned) ? stats : null;
    } catch {
      return null;
    }
  }

  static shouldScanNow() {
    return Date.now() - this.getLastScan() >= SCAN_INTERVAL_MS;
  }

  /**
   * Scan up to `limit` Steam games, oldest-unchecked style (order follows the
   * library). Applies '100%' automatically; returns beaten candidates for
   * review. `onProgress({ done, total, gameName })` fires per game.
   */
  static async scan(library, { limit = MAX_PER_SCAN, onProgress } = {}) {
    const result = { scanned: 0, applied: [], candidates: [], skipped: 0 };
    if (!this.isAvailable() || !Array.isArray(library)) return result;

    const allSteamGames = library
      .map((game) => ({
        name: String(game?.name || game?.title || '').trim(),
        appid: SteamPublicService.appIdOf?.(game) || String(game?.appid || ''),
      }))
      .filter((g) => g.name && g.appid);
    const steamGames = allSteamGames.slice(0, limit);
    result.totalSteamGames = allSteamGames.length;

    if (steamGames.length === 0) return result;
    const dismissed = this.getDismissed();

    for (const [index, game] of steamGames.entries()) {
      onProgress?.({ done: index, total: steamGames.length, gameName: game.name });
      let payload = null;
      try {
        payload = await SteamAchievementsService.getForGame(game.appid);
      } catch {
        payload = null;
      }
      result.scanned += 1;

      // Only pause when we actually hit the relay — cache hits are free.
      if (payload && payload.cached !== true) await sleep(NETWORK_DELAY_MS);

      const verdict = this.evaluate(payload);
      if (!verdict) {
        result.skipped += 1;
        continue;
      }

      const current = GameCurationService.getGameCompletion(game.name)?.status || 'not-started';

      if (verdict.status === '100%') {
        if (this.shouldApply(current, '100%')) {
          GameCurationService.setGameCompletion(
            game.name,
            '100%',
            `Detected via Steam achievements — ${verdict.reason}`
          );
          result.applied.push({ name: game.name, appid: game.appid, ...verdict });
        } else {
          result.skipped += 1;
        }
      } else if (!dismissed.has(game.appid) && this.shouldApply(current, 'beaten')) {
        result.candidates.push({ name: game.name, appid: game.appid, ...verdict });
      } else {
        result.skipped += 1;
      }
    }

    onProgress?.({ done: steamGames.length, total: steamGames.length, gameName: null });

    // Merge new candidates into the stored review list (dedup by appid) so
    // they survive remounts until confirmed or dismissed.
    const stored = this.getCandidates();
    const seen = new Set(stored.map((c) => String(c.appid)));
    this.setCandidates([...stored, ...result.candidates.filter((c) => !seen.has(String(c.appid)))]);

    try {
      StorageService.set(LAST_SCAN_KEY, Date.now());
      StorageService.set(SCAN_STATS_KEY, {
        at: Date.now(),
        scanned: result.scanned,
        totalSteam: allSteamGames.length,
        applied: result.applied.length,
        candidates: this.getCandidates().length,
      });
    } catch {
      /* best-effort */
    }
    return result;
  }
}

export default AchievementCompletionService;
