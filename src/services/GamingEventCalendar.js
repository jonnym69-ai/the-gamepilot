// GamingEventCalendar.js - Manages gaming events and calendar functionality
import StorageService from './StorageService';
export class GamingEventCalendar {
  static STORAGE_KEY = 'gamingEvents';

  // Get or initialize gaming events
  static getEvents() {
    try {
      return StorageService.get(this.STORAGE_KEY, {});
    } catch (error) {
      console.error('Error reading gaming events:', error);
      return {};
    }
  }

  // Add a gaming event
  static addEvent(date, eventData) {
    try {
      const dateStr = new Date(date).toDateString();
      const events = this.getEvents();
      
      if (!events[dateStr]) {
        events[dateStr] = [];
      }

      const event = {
        id: Date.now(),
        title: eventData.title,
        game: eventData.game,
        duration: eventData.duration || 60, // minutes
        notes: eventData.notes || '',
        completed: false,
        createdAt: Date.now()
      };

      events[dateStr].push(event);
      StorageService.set(this.STORAGE_KEY, events);
      return event;
    } catch (error) {
      console.error('Error adding gaming event:', error);
      return null;
    }
  }

  // Get events for a specific date
  static getEventsForDate(date) {
    try {
      const dateStr = new Date(date).toDateString();
      const events = this.getEvents();
      return events[dateStr] || [];
    } catch (error) {
      console.error('Error getting events for date:', error);
      return [];
    }
  }

  // Get events for a date range
  static getEventsForRange(startDate, endDate) {
    try {
      const events = this.getEvents();
      const rangeEvents = [];
      
      const current = new Date(startDate);
      while (current <= endDate) {
        const dateStr = current.toDateString();
        if (events[dateStr]) {
          rangeEvents.push(...events[dateStr].map(e => ({ ...e, date: dateStr })));
        }
        current.setDate(current.getDate() + 1);
      }
      
      return rangeEvents;
    } catch (error) {
      console.error('Error getting events for range:', error);
      return [];
    }
  }

  // Update an event
  static updateEvent(date, eventId, updates) {
    try {
      const dateStr = new Date(date).toDateString();
      const events = this.getEvents();
      
      if (events[dateStr]) {
        const eventIndex = events[dateStr].findIndex(e => e.id === eventId);
        if (eventIndex !== -1) {
          events[dateStr][eventIndex] = { ...events[dateStr][eventIndex], ...updates };
          StorageService.set(this.STORAGE_KEY, events);
          return events[dateStr][eventIndex];
        }
      }
      return null;
    } catch (error) {
      console.error('Error updating gaming event:', error);
      return null;
    }
  }

  // Delete an event
  static deleteEvent(date, eventId) {
    try {
      const dateStr = new Date(date).toDateString();
      const events = this.getEvents();
      
      if (events[dateStr]) {
        events[dateStr] = events[dateStr].filter(e => e.id !== eventId);
        if (events[dateStr].length === 0) {
          delete events[dateStr];
        }
        StorageService.set(this.STORAGE_KEY, events);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting gaming event:', error);
      return false;
    }
  }

  // Mark event as completed
  static completeEvent(date, eventId) {
    return this.updateEvent(date, eventId, { completed: true });
  }

  // Get all upcoming events
  static getUpcomingEvents(days = 30) {
    try {
      const today = new Date();
      const endDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
      return this.getEventsForRange(today, endDate);
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      return [];
    }
  }

  // Get event statistics
  static getEventStats() {
    try {
      const events = this.getEvents();
      let totalEvents = 0;
      let completedEvents = 0;
      let totalDuration = 0;

      Object.values(events).forEach(dayEvents => {
        dayEvents.forEach(event => {
          totalEvents++;
          if (event.completed) completedEvents++;
          totalDuration += event.duration || 0;
        });
      });

      return {
        totalEvents,
        completedEvents,
        completionRate: totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0,
        totalDuration,
        totalDurationHours: (totalDuration / 60).toFixed(1)
      };
    } catch (error) {
      console.error('Error getting event stats:', error);
      return {
        totalEvents: 0,
        completedEvents: 0,
        completionRate: 0,
        totalDuration: 0,
        totalDurationHours: 0
      };
    }
  }

  // Clear all events
  static clearAll() {
    try {
      StorageService.remove(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing gaming events:', error);
      return false;
    }
  }
}
