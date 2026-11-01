import { getDateKey } from './DateKeyService';

const THEMES = {
  10: {
    id: 'halloween',
    label: 'Halloween',
    description: 'Horror and survival games from your library.',
    terms: ['horror', 'survival', 'survival horror', 'psychological horror', 'zombies', 'supernatural'],
  },
  12: {
    id: 'christmas',
    label: 'Christmas',
    description: 'Cozy and party games from your library.',
    terms: ['cozy', 'cosy', 'party', 'party game', 'relaxing', 'family friendly'],
  },
};

export const getSeasonalTheme = (date = new Date()) => THEMES[getDateKey(date).slice(5, 7)] || null;

export const matchesSeasonalTheme = (game, theme) => {
  if (!theme) return false;
  const values = [game?.genres, game?.tags].flatMap((field) => (Array.isArray(field) ? field : []));
  return values.some((value) => {
    const text = typeof value === 'string' ? value : value?.name;
    return typeof text === 'string' && theme.terms.includes(text.trim().toLowerCase().replace(/[-_]/g, ' '));
  });
};
