// QuestRerollService.js - manages quest reroll tokens (local-first)
// Stores a simple integer counter in StorageService under the key 'questRerollTokens'.
// Provides helpers to add, spend and query tokens so other services (DailyEngagementService, UI) stay decoupled.

import StorageService from './StorageService';

const TOKEN_KEY = 'questRerollTokens';

const readTokens = () => {
  const value = Number(StorageService.get(TOKEN_KEY, 0));
  return Number.isFinite(value) && value >= 0 ? value : 0;
};

const writeTokens = (value) => {
  StorageService.set(TOKEN_KEY, Math.max(0, Math.round(value)));
};

export const QuestRerollService = {
  getTokenCount() {
    return readTokens();
  },

  addTokens(amount = 1, source = 'reward') {
    const n = Math.max(0, Math.round(Number(amount) || 0));
    if (!n) return { added: 0, total: readTokens() };
    const total = readTokens() + n;
    writeTokens(total);
    return { added: n, total, source };
  },

  spendToken(amount = 1) {
    const n = Math.max(1, Math.round(Number(amount) || 0));
    const current = readTokens();
    if (current < n) {
      return { success: false, message: 'Not enough reroll tokens', remaining: current };
    }
    writeTokens(current - n);
    return { success: true, spent: n, remaining: current - n };
  }
};
