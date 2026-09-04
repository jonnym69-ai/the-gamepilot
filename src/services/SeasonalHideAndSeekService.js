import StorageService from './StorageService';
import { isEasterActive } from './SeasonalRewardService';

const HIDE_SEEK_KEY = 'seasonalHideAndSeek';

const HIDE_SEEK_EVENTS = {
  easter: {
    id: 'easter',
    name: 'Easter Egg Hunt',
    icon: '🥚',
    itemEmoji: '🥚',
    itemName: 'Egg',
    months: [2, 3], // March–April (dynamic via isEasterActive)
    totalItems: 5,
    xpReward: 500,
    rewardName: 'Egg Hunter Master'
  },
  halloween: {
    id: 'halloween',
    name: 'Pumpkin Hunt',
    icon: '🎃',
    itemEmoji: '🎃',
    itemName: 'Pumpkin',
    months: [9], // October
    totalItems: 5,
    xpReward: 500,
    rewardName: 'Pumpkin King'
  },
  winter_holiday: {
    id: 'winter_holiday',
    name: 'Holiday Tree Hunt',
    icon: '🎄',
    itemEmoji: '🎄',
    itemName: 'Tree',
    months: [11], // December
    totalItems: 5,
    xpReward: 500,
    rewardName: 'Holiday Guardian'
  }
};

const getStored = () => {
  try {
    return StorageService.get(HIDE_SEEK_KEY, {});
  } catch {
    return {};
  }
};

const saveStored = (data) => {
  StorageService.set(HIDE_SEEK_KEY, data);
};

export const SeasonalHideAndSeekService = {
  getActiveEvent: () => {
    const month = new Date().getMonth();
    return Object.values(HIDE_SEEK_EVENTS).find(e =>
      e.id === 'easter' ? isEasterActive() : e.months.includes(month)
    ) || null;
  },

  getProgress: (eventId) => {
    const data = getStored();
    const event = HIDE_SEEK_EVENTS[eventId];
    if (!event) return null;

    const record = data[eventId] || { found: [], completed: false, year: null };
    const currentYear = new Date().getFullYear();

    if (record.year !== currentYear) {
      return {
        ...event,
        found: [],
        completed: false,
        progressPercent: 0
      };
    }

    return {
      ...event,
      found: record.found || [],
      completed: record.completed || false,
      progressPercent: Math.min(100, Math.round(((record.found || []).length / event.totalItems) * 100))
    };
  },

  getActiveProgress: () => {
    const event = SeasonalHideAndSeekService.getActiveEvent();
    if (!event) return null;
    return SeasonalHideAndSeekService.getProgress(event.id);
  },

  findItem: (eventId, itemId) => {
    const data = getStored();
    const event = HIDE_SEEK_EVENTS[eventId];
    if (!event) return null;

    const currentYear = new Date().getFullYear();
    if (!data[eventId] || data[eventId].year !== currentYear) {
      data[eventId] = { found: [], completed: false, year: currentYear };
    }

    if (data[eventId].found.includes(itemId)) {
      return { alreadyFound: true, ...SeasonalHideAndSeekService.getProgress(eventId) };
    }

    data[eventId].found.push(itemId);

    if (data[eventId].found.length >= event.totalItems) {
      data[eventId].completed = true;
    }

    saveStored(data);

    const progress = SeasonalHideAndSeekService.getProgress(eventId);
    return { alreadyFound: false, justCompleted: data[eventId].completed, ...progress };
  },

  resetEvent: (eventId) => {
    const data = getStored();
    if (data[eventId]) {
      data[eventId] = { found: [], completed: false, year: new Date().getFullYear() };
      saveStored(data);
    }
  },

  getAllEvents: () => Object.values(HIDE_SEEK_EVENTS)
};

export default SeasonalHideAndSeekService;
