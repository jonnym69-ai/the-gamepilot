// StoryArchiveService.js
// Local-first archive of dated weekly gaming-story chapters, plus book views
// (52 weekly / 12 monthly / 4 seasonal) and a 3-year rolling retention policy.
// All data stays in localStorage. Pruning is never silent — the caller is told
// when the archive is about to exceed the retention window so the user can
// export, keep, or let the oldest year roll off.

import StorageService from './StorageService';
import { GamingPersonaService, DEFAULT_VOICE } from './GamingPersonaService';

const ARCHIVE_KEY = 'gamingStoryArchiveV1';
const RETENTION_YEARS = 3;
const MONTH_LABELS = Object.freeze(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);

const SEASONS = Object.freeze([
  { key: 'Winter', label: 'Winter', months: [11, 0, 1] },
  { key: 'Spring', label: 'Spring', months: [2, 3, 4] },
  { key: 'Summer', label: 'Summer', months: [5, 6, 7] },
  { key: 'Autumn', label: 'Autumn', months: [8, 9, 10] }
]);

/**
 * ISO-ish week key: YYYY-Www based on the chapter's generation date. We use a
 * simple year + week-of-year scheme keyed off the first day of the week so a
 * given calendar week maps to one deterministic key.
 */
const getWeekKey = (date) => {
  const d = new Date(date);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((d - startOfYear) / (24 * 60 * 60 * 1000));
  const week = Math.floor(dayOfYear / 7) + 1;
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

const readArchive = () => {
  const stored = StorageService.get(ARCHIVE_KEY, {});
  return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
};

const writeArchive = (archive) => {
  StorageService.set(ARCHIVE_KEY, archive && typeof archive === 'object' ? archive : {});
};

const getVoiceForDigest = (persona) => {
  if (persona?.voice) return persona.voice;
  try {
    return GamingPersonaService.getPrimaryPersona()?.voice || DEFAULT_VOICE;
  } catch {
    return DEFAULT_VOICE;
  }
};

const fillVoiceTemplate = (template, vars) => {
  if (!template) return '';
  return Object.entries(vars).reduce((str, [key, value]) => {
    const safe = value === undefined || value === null ? '' : String(value);
    return str.replace(new RegExp(`\\{${key}\\}`, 'g'), safe);
  }, template);
};

export class StoryArchiveService {
  static RETENTION_YEARS = RETENTION_YEARS;

  /**
   * Record a weekly chapter into the archive, keyed by its week. Idempotent per
   * week — re-recording the same week overwrites that week's entry.
   */
  static recordWeeklyChapter(chapter) {
    if (!chapter) return null;
    const generatedAt = chapter.generatedAt || new Date().toISOString();
    const weekKey = getWeekKey(generatedAt);

    const archive = readArchive();
    archive[weekKey] = {
      ...chapter,
      weekKey,
      generatedAt,
      year: new Date(generatedAt).getFullYear(),
      month: new Date(generatedAt).getMonth()
    };
    writeArchive(archive);
    return archive[weekKey];
  }

  static getArchive() {
    return readArchive();
  }

  /**
   * All chapters as a flat array, sorted oldest → newest.
   */
  static getAllChapters() {
    return Object.values(readArchive())
      .filter(Boolean)
      .sort((a, b) => new Date(a.generatedAt) - new Date(b.generatedAt));
  }

  static getYears() {
    return Array.from(new Set(this.getAllChapters().map((c) => c.year)))
      .filter((year) => Number.isFinite(year))
      .sort((a, b) => b - a);
  }

  static getChaptersForYear(year) {
    const safeYear = Number(year);
    return this.getAllChapters().filter((c) => c.year === safeYear);
  }

  /**
   * Aggregate a set of weekly chapters into a single digest chapter (used for
   * monthly and seasonal book layouts).
   */
  static aggregateChapters(chapters, { title, subtitle, period, persona = null }) {
    const safeChapters = Array.isArray(chapters) ? chapters.filter(Boolean) : [];
    const totalHours = safeChapters.reduce((sum, c) => sum + Number(c.totalHours || 0), 0);
    const voice = getVoiceForDigest(persona);

    // Merge top games by hours across the window.
    const gameMap = new Map();
    safeChapters.forEach((c) => {
      (Array.isArray(c.topGames) ? c.topGames : []).forEach((game) => {
        const key = String(game?.name || '').toLowerCase();
        if (!key) return;
        const existing = gameMap.get(key) || { ...game, hours: 0 };
        existing.hours = Number(existing.hours || 0) + Number(game.hours || 0);
        gameMap.set(key, existing);
      });
    });
    const topGames = Array.from(gameMap.values())
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 3);

    // Merge genre fingerprint.
    const genreMap = new Map();
    safeChapters.forEach((c) => {
      (Array.isArray(c.genreFingerprint) ? c.genreFingerprint : []).forEach((entry) => {
        const genre = entry?.genre || 'Unknown';
        if (genre === 'Unknown') return;
        const existing = genreMap.get(genre) || { genre, hours: 0, count: 0 };
        existing.hours += Number(entry.hours || 0);
        existing.count += Number(entry.count || 1);
        genreMap.set(genre, existing);
      });
    });
    const genreFingerprint = Array.from(genreMap.values()).sort((a, b) => b.hours - a.hours);

    const activeChapters = safeChapters.filter((c) => !c.isQuiet && Number(c.totalHours || 0) > 0);

    // Arc highlights: MVP game, dominant genre, busiest week, and the longest
    // run any single game held the top spot across the window.
    const mvp = topGames[0] || null;
    const topGenre = genreFingerprint[0] || null;
    const peak = activeChapters.reduce(
      (best, c) => (Number(c.totalHours || 0) > Number(best?.totalHours || 0) ? c : best),
      null
    );
    const maxStreak = safeChapters.reduce(
      (max, c) => Math.max(max, Number(c?.continuity?.topGameStreak) || 0),
      0
    );

    let narrative;
    if (activeChapters.length === 0) {
      narrative = fillVoiceTemplate(voice.quiet || DEFAULT_VOICE.quiet, { PERIOD: period });
      narrative += ' Not much play tracked in this window.';
    } else {
      const weekWord = activeChapters.length === 1 ? 'active week' : 'active weeks';
      const digestTemplate = period === 'year'
        ? (voice.digestYear || voice.digest || DEFAULT_VOICE.digestYear)
        : (voice.digest || DEFAULT_VOICE.digest);
      narrative = fillVoiceTemplate(digestTemplate, {
        WEEKS: activeChapters.length,
        WEEKWORD: weekWord,
        HOURS: Math.round(totalHours)
      });
      if (mvp) {
        narrative += fillVoiceTemplate(voice.digestMVP || DEFAULT_VOICE.digestMVP, {
          MVP: mvp.name,
          MVPHOURS: Math.round(mvp.hours || 0)
        });
      }
      if (topGenre && topGenre.genre) {
        narrative += fillVoiceTemplate(voice.digestGenre || DEFAULT_VOICE.digestGenre, {
          GENRE: topGenre.genre
        });
      }
      if (peak && Number(peak.totalHours || 0) > 0) {
        narrative += fillVoiceTemplate(voice.digestPeak || DEFAULT_VOICE.digestPeak, {
          PEAK: Math.round(peak.totalHours || 0)
        });
      }
      if (maxStreak >= 3) {
        narrative += fillVoiceTemplate(voice.digestStreak || DEFAULT_VOICE.digestStreak, {
          STREAK: maxStreak
        });
      }
    }

    return {
      chapter: 'digest',
      period,
      isQuiet: activeChapters.length === 0,
      title,
      subtitle,
      totalHours,
      gameCount: topGames.length,
      topGames,
      genreFingerprint,
      moodFingerprint: [],
      narrative,
      identityLabel: persona?.label || null,
      tasteClusters: [],
      sourceWeekCount: safeChapters.length,
      activeWeekCount: activeChapters.length,
      mvpGame: mvp ? { name: mvp.name, hours: Math.round(mvp.hours || 0) } : null,
      dominantGenre: topGenre?.genre || null,
      peakWeekHours: peak ? Math.round(peak.totalHours || 0) : 0,
      maxTopGameStreak: maxStreak
    };
  }

  static getPersonaForBook() {
    try {
      return GamingPersonaService.getPrimaryPersona();
    } catch {
      return null;
    }
  }

  /**
   * Build a "book" for a given year in one of four layouts:
   *   - 'weekly'   → up to 52 weekly chapters
   *   - 'monthly'  → 12 monthly digests
   *   - 'seasonal' → 4 seasonal digests
   *   - 'yearly'   → 1 year-in-review digest
   *
   * Pass a persona to flavour the digest narratives; otherwise the current
   * primary persona is used so the book reads like the rest of the story.
   */
  static getBook(year = new Date().getFullYear(), layout = 'weekly', persona = null) {
    const safeYear = Number(year) || new Date().getFullYear();
    const chapters = this.getChaptersForYear(safeYear);
    const bookPersona = persona || this.getPersonaForBook();

    if (layout === 'yearly') {
      return {
        year: safeYear,
        layout: 'yearly',
        chapters: [
          this.aggregateChapters(chapters, {
            title: `${safeYear} in Review`,
            subtitle: `${chapters.length} week${chapters.length === 1 ? '' : 's'} logged`,
            period: 'year',
            persona: bookPersona
          })
        ]
      };
    }

    if (layout === 'monthly') {
      return {
        year: safeYear,
        layout,
        chapters: MONTH_LABELS.map((label, monthIndex) => {
          const monthChapters = chapters.filter((c) => c.month === monthIndex);
          return this.aggregateChapters(monthChapters, {
            title: `${label} ${safeYear}`,
            subtitle: `${monthChapters.length} week${monthChapters.length === 1 ? '' : 's'} logged`,
            period: 'month',
            persona: bookPersona
          });
        })
      };
    }

    if (layout === 'seasonal') {
      return {
        year: safeYear,
        layout,
        chapters: SEASONS.map((season) => {
          const seasonChapters = chapters.filter((c) => season.months.includes(c.month));
          return this.aggregateChapters(seasonChapters, {
            title: `${season.label} ${safeYear}`,
            subtitle: `${seasonChapters.length} week${seasonChapters.length === 1 ? '' : 's'} logged`,
            period: 'season',
            persona: bookPersona
          });
        })
      };
    }

    // Default: weekly layout, newest first.
    return {
      year: safeYear,
      layout: 'weekly',
      chapters: [...chapters].reverse()
    };
  }

  /**
   * Rough storage footprint (bytes) of the archive, for informed retention
   * decisions in the UI.
   */
  static getEstimatedFootprintBytes() {
    try {
      return new Blob([JSON.stringify(readArchive())]).size;
    } catch {
      return 0;
    }
  }

  /**
   * Retention status against the 3-year rolling window. Never prunes — only
   * reports whether pruning is due and which year is the oldest.
   */
  static getRetentionStatus() {
    const years = this.getYears();
    const currentYear = new Date().getFullYear();
    const oldestYear = years.length > 0 ? Math.min(...years) : null;
    const yearSpan = oldestYear !== null ? (currentYear - oldestYear + 1) : 0;

    return {
      years,
      oldestYear,
      currentYear,
      yearSpan,
      retentionYears: RETENTION_YEARS,
      pruningDue: yearSpan > RETENTION_YEARS,
      estimatedBytes: this.getEstimatedFootprintBytes()
    };
  }

  /**
   * Build an export payload for a single year's chapters (image/PDF/text/JSON
   * can be derived from this by the caller).
   */
  static exportYear(year) {
    const safeYear = Number(year);
    return {
      type: 'gamepilot-story-archive-year',
      exportedAt: new Date().toISOString(),
      year: safeYear,
      chapters: this.getChaptersForYear(safeYear)
    };
  }

  /**
   * Explicitly prune all chapters for a given year. Only called after the user
   * has chosen to let a year roll off (optionally after exporting it).
   */
  static pruneYear(year) {
    const safeYear = Number(year);
    const archive = readArchive();
    let removed = 0;
    Object.keys(archive).forEach((weekKey) => {
      if (archive[weekKey]?.year === safeYear) {
        delete archive[weekKey];
        removed += 1;
      }
    });
    writeArchive(archive);
    return removed;
  }
}

export default StoryArchiveService;
