import StorageService from './services/StorageService';

// Currency conversion rates (approximate, for display purposes)
const EXCHANGE_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.50,
  CAD: 1.36,
  AUD: 1.52,
  CHF: 0.91,
  CNY: 7.24,
  INR: 83.12,
  BRL: 5.08,
  RUB: 90.15
};

// Currency symbols
const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  CNY: '¥',
  INR: '₹',
  BRL: 'R$',
  RUB: '₽'
};

// Format price in selected currency
export const formatPrice = (priceInUSD, currency = 'USD') => {
  if (!priceInUSD) return 'Free';
  
  const rate = EXCHANGE_RATES[currency] || 1;
  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  const convertedPrice = priceInUSD * rate;
  
  // Handle different formatting for different currencies
  if (currency === 'JPY') {
    return `${symbol}${Math.round(convertedPrice).toLocaleString()}`;
  } else if (currency === 'KRW' || currency === 'JPY') {
    return `${symbol}${Math.round(convertedPrice).toLocaleString()}`;
  } else {
    return `${symbol}${convertedPrice.toFixed(2)}`;
  }
};

// Convert Steam price string to USD amount
export const parseSteamPrice = (priceString) => {
  if (!priceString) return null;
  
  // Remove currency symbols and convert to number
  const cleanPrice = priceString.replace(/[^0-9.,]/g, '');
  const price = parseFloat(cleanPrice);
  
  return isNaN(price) ? null : price;
};

// Get current currency from localStorage
export const getCurrentCurrency = () => {
  return StorageService.getString('selectedCurrency', 'USD');
};

// Store purchase price for tracking
export const storePurchasePrice = (appid, priceInUSD, currency) => {
  const prices = StorageService.get('gamePrices', {});
  prices[appid] = {
    price: priceInUSD,
    currency: currency,
    timestamp: Date.now(),
    originalCurrency: currency
  };
  StorageService.set('gamePrices', prices);
};

// Get stored purchase price
export const getStoredPrice = (appid) => {
  const prices = StorageService.get('gamePrices', {});
  return prices[appid] || null;
};

// Calculate library value
export const calculateLibraryValue = (games, currency = 'USD') => {
  let totalValue = 0;
  let pricedGames = 0;
  
  games.forEach(game => {
    const storedPrice = getStoredPrice(game.appid);
    if (storedPrice && storedPrice.price) {
      totalValue += storedPrice.price;
      pricedGames++;
    }
  });
  
  return {
    totalValue,
    pricedGames,
    formattedValue: formatPrice(totalValue, currency)
  };
};
