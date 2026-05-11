import React, { createContext, useContext, useState, useEffect } from 'react';
import StorageService from '../services/StorageService';

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
  const [cacheEnabled, setCacheEnabled] = useState(StorageService.getString('cacheEnabled', 'true') !== 'false');

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
    
    StorageService.set(`cache_${key}`, cacheEntry);
  };

  const getCachedData = (key) => {
    if (!cacheEnabled) return null;
    
    try {
      const cached = StorageService.getString(`cache_${key}`);
      if (!cached) return null;
      
      const cacheEntry = JSON.parse(cached);
      const now = new Date();
      const expiresAt = new Date(cacheEntry.expiresAt);
      
      if (now > expiresAt) {
        StorageService.remove(`cache_${key}`);
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
        StorageService.remove(key);
      }
    });
  };

  const getCacheSize = () => {
    let size = 0;
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('cache_')) {
        size += StorageService.getString(key)?.length || 0;
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
