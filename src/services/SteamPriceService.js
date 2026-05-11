// SteamPriceService.js - Fetches accurate game prices from Steam API
import { formatPrice, getCurrentCurrency } from '../CurrencyConverter';
import StorageService from './StorageService';

export class SteamPriceService {
  static STEAM_API_URL = 'https://steamcommunity.com/api/ISteamApps/GetAppDetails/v1';
  static CACHE_KEY = 'steamPriceCache';
  static CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  // Get cached prices
  static getCache() {
    try {
      const cached = StorageService.getString(this.CACHE_KEY);
      if (!cached) return {};
      
      const data = JSON.parse(cached);
      const now = Date.now();
      
      // Clean expired entries
      Object.keys(data).forEach(appId => {
        if (now - data[appId].timestamp > this.CACHE_DURATION) {
          delete data[appId];
        }
      });
      
      StorageService.set(this.CACHE_KEY, data);
      return data;
    } catch (error) {
      console.error('Error reading price cache:', error);
      return {};
    }
  }

  // Save price to cache
  static saveToCache(appId, priceData) {
    try {
      const cache = this.getCache();
      cache[appId] = {
        ...priceData,
        timestamp: Date.now()
      };
      StorageService.set(this.CACHE_KEY, cache);
    } catch (error) {
      console.error('Error saving to price cache:', error);
    }
  }

  // Fetch price from Steam API
  static async fetchPrice(appId) {
    if (!appId) return null;

    // Check cache first
    const cache = this.getCache();
    if (cache[appId]) {
      return cache[appId];
    }

    try {
      const response = await fetch(
        `${this.STEAM_API_URL}?appids=${appId}&cc=US&filters=price_overview`,
        { method: 'GET' }
      );

      if (!response.ok) {
        console.warn(`Failed to fetch price for app ${appId}`);
        return null;
      }

      const data = await response.json();
      
      if (!data[appId] || !data[appId].success) {
        console.warn(`No price data for app ${appId}`);
        return null;
      }

      const appData = data[appId].data;
      
      if (!appData.price_overview) {
        // Game is free
        return {
          price: 'Free',
          priceNumeric: 0,
          currency: 'USD',
          discount: 0,
          originalPrice: 0
        };
      }

      const priceOverview = appData.price_overview;
      const priceData = {
        price: this.formatPrice(priceOverview.final / 100),
        priceNumeric: priceOverview.final / 100,
        currency: priceOverview.currency || 'USD',
        discount: priceOverview.discount_percent || 0,
        originalPrice: priceOverview.initial / 100,
        name: appData.name
      };

      // Cache the result
      this.saveToCache(appId, priceData);
      return priceData;
    } catch (error) {
      console.error(`Error fetching price for app ${appId}:`, error);
      return null;
    }
  }

  // Fetch prices for multiple games
  static async fetchPrices(appIds) {
    const prices = {};
    
    for (const appId of appIds) {
      const price = await this.fetchPrice(appId);
      if (price) {
        prices[appId] = price;
      }
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return prices;
  }

  // Format price for display in selected currency
  static formatPriceInCurrency(priceInUSD, currency = null) {
    const selectedCurrency = currency || getCurrentCurrency();
    return formatPrice(priceInUSD, selectedCurrency);
  }

  // Get price for a game with currency conversion
  static getPrice(game, currency = null) {
    if (!game) return null;
    
    const selectedCurrency = currency || getCurrentCurrency();
    
    // Check if game has cached price
    const cache = this.getCache();
    if (game.appid && cache[game.appid]) {
      const cachedPrice = cache[game.appid];
      return {
        ...cachedPrice,
        price: this.formatPriceInCurrency(cachedPrice.priceNumeric, selectedCurrency),
        currency: selectedCurrency
      };
    }
    
    // Return stored price if available
    if (game.price) {
      return {
        price: this.formatPriceInCurrency(game.priceNumeric || 0, selectedCurrency),
        priceNumeric: game.priceNumeric || 0,
        currency: selectedCurrency
      };
    }
    
    return null;
  }

  // Get price display string for a game
  static getPriceDisplay(game, currency = null) {
    const priceData = this.getPrice(game, currency);
    return priceData ? priceData.price : null;
  }

  // Get numeric price in USD (for calculations)
  static getPriceNumeric(game) {
    if (!game) return 0;
    
    const cache = this.getCache();
    if (game.appid && cache[game.appid]) {
      return cache[game.appid].priceNumeric || 0;
    }
    
    return game.priceNumeric || 0;
  }

  // Clear cache
  static clearCache() {
    try {
      StorageService.remove(this.CACHE_KEY);
    } catch (error) {
      console.error('Error clearing price cache:', error);
    }
  }
}
