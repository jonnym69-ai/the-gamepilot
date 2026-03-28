import React, { createContext, useContext, useState, useEffect } from 'react';

const CacheContext = createContext();

export const useCache = () => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
};

export const CacheProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheEnabled, setCacheEnabled] = useState(localStorage.getItem('cacheEnabled') !== 'false');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const cacheData = (key, data) => {
    if (!cacheEnabled) return;
    
    const cacheEntry = {
      data,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    };
    
    localStorage.setItem(`cache_${key}`, JSON.stringify(cacheEntry));
  };

  const getCachedData = (key) => {
    if (!cacheEnabled) return null;
    
    try {
      const cached = localStorage.getItem(`cache_${key}`);
      if (!cached) return null;
      
      const cacheEntry = JSON.parse(cached);
      const now = new Date();
      const expiresAt = new Date(cacheEntry.expiresAt);
      
      if (now > expiresAt) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }
      
      return cacheEntry.data;
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  };

  const clearCache = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    });
  };

  const getCacheSize = () => {
    let size = 0;
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('cache_')) {
        size += localStorage.getItem(key).length;
      }
    });
    return (size / 1024).toFixed(2) + ' KB';
  };

  const value = {
    isOnline,
    cacheEnabled,
    setCacheEnabled,
    cacheData,
    getCachedData,
    clearCache,
    getCacheSize
  };

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  );
};

export default CacheProvider;
