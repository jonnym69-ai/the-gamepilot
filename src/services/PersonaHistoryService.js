// PersonaHistoryService — a small flip-history of the player's primary persona.
// The identity card calls record() whenever the persona is computed; entries
// only write when the label actually changes, so renders stay idempotent.
// Powers the "Past lives" shelf.
import StorageService from './StorageService';

const KEY = 'personaHistoryV1';
const YEARBOOK_KEY = 'personaYearbookV1';
const MAX_ENTRIES = 12;

const read = () => {
  const list = StorageService.get(KEY, []);
  return Array.isArray(list) ? list : [];
};

const readYearbook = () => {
  const book = StorageService.get(YEARBOOK_KEY, {});
  return book && typeof book === 'object' && !Array.isArray(book) ? book : {};
};

export class PersonaHistoryService {
  /**
   * Record the current primary persona. Stores { id, label, themeId,
   * archetypeId, since } and only appends when the id changes — repeated
   * calls with the same persona just refresh 'since' nothing.
   */
  static record(primary) {
    if (!primary?.id) return;
    try {
      const list = read();
      const last = list[list.length - 1];
      if (last?.id === primary.id) return;
      list.push({
        id: primary.id,
        label: primary.label || primary.archetypeLabel || primary.id,
        themeId: primary.theme?.id || null,
        since: Date.now(),
      });
      while (list.length > MAX_ENTRIES) list.shift();
      StorageService.set(KEY, list);
    } catch {
      // history is best-effort — never break the card over it
    }
  }

  /** All recorded personas, oldest → newest. */
  static getHistory() {
    try {
      return read();
    } catch {
      return [];
    }
  }

  /** Previous personas without the current one, newest first. */
  static getPastLives(currentId) {
    return this.getHistory()
      .filter((entry) => entry.id !== currentId)
      .reverse();
  }

  /**
   * Stamp a finished year's primary persona into the yearbook. Idempotent —
   * a year is only ever archived once, so the first settled snapshot wins.
   */
  static archiveYear(year, primary) {
    const safeYear = Number(year);
    if (!Number.isInteger(safeYear) || !primary?.id) return;
    try {
      const book = readYearbook();
      if (book[safeYear]) return;
      book[safeYear] = {
        id: primary.id,
        label: primary.label || primary.id,
        themeId: primary.themeId || primary.theme?.id || null,
        archivedAt: Date.now(),
      };
      StorageService.set(YEARBOOK_KEY, book);
    } catch {
      // best-effort — the card must never break over a yearbook write
    }
  }

  /** Archived year personas, newest year first: [{ year, id, label, themeId }]. */
  static getYearbook() {
    try {
      return Object.entries(readYearbook())
        .map(([year, entry]) => ({
          year: Number(year),
          id: entry?.id,
          label: entry?.label,
          themeId: entry?.themeId || null,
        }))
        .filter((entry) => entry.id)
        .sort((left, right) => right.year - left.year);
    } catch {
      return [];
    }
  }
}

export default PersonaHistoryService;
