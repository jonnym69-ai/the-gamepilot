import React, { useState, useRef, useEffect, useMemo } from 'react';
import StorageService from '../services/StorageService';
import './LazyImage.css';

// Persistent cache for failed image URLs using localStorage
const FAILED_IMAGES_KEY = 'gamepilot_failed_images';
const FAILED_IMAGES_TTL_MS = 12 * 60 * 60 * 1000;

const writeFailedImageCache = (cache) => {
  try {
    StorageService.set(FAILED_IMAGES_KEY, cache);
  } catch (e) {
    console.error('Failed to persist failed image cache:', e);
  }
};

const getFailedImageCache = () => {
  try {
    const cached = StorageService.get(FAILED_IMAGES_KEY, {});
    if (Array.isArray(cached)) {
      // Legacy format (string array). Do not keep permanent failures.
      return {};
    }
    if (cached && typeof cached === 'object') {
      return cached;
    }
    return {};
  } catch (e) {
    return {};
  }
};

const addToFailedCache = (url) => {
  try {
    const cache = getFailedImageCache();
    cache[url] = Date.now();
    writeFailedImageCache(cache);
  } catch (e) {
    console.error('Failed to cache failed image:', e);
  }
};

const isImageFailed = (url) => {
  try {
    const cache = getFailedImageCache();
    const failedAt = Number(cache?.[url] || 0);

    if (!failedAt) {
      return false;
    }

    const isStale = (Date.now() - failedAt) > FAILED_IMAGES_TTL_MS;
    if (isStale) {
      delete cache[url];
      writeFailedImageCache(cache);
      return false;
    }

    return true;
  } catch (e) {
    return false;
  }
};

const optimizeImageSrc = (url) => {
  if (!url || url.startsWith('data:') || url.includes('placehold.co')) return url;
  if (url.includes('steamstatic.com')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}quality=80&format=webp`;
  }
  return url;
};

const LazyImage = ({ src, alt, className, placeholder, fallbackSrc, gameName, platform, genre, mood, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [activeSrc, setActiveSrc] = useState(src);
  const imgRef = useRef(null);

  useEffect(() => {
    setActiveSrc(src);
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

  const isKnownFailure = useMemo(() => {
    return activeSrc && isImageFailed(activeSrc);
  }, [activeSrc]);

  useEffect(() => {
    if (!isKnownFailure) return;
    if (fallbackSrc && fallbackSrc !== activeSrc && !isImageFailed(fallbackSrc)) {
      setActiveSrc(fallbackSrc);
      setHasError(false);
      setIsLoaded(false);
      return;
    }
    setHasError(true);
    setIsLoaded(true);
  }, [isKnownFailure, fallbackSrc, activeSrc]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    const imgElement = imgRef.current;
    if (imgElement) {
      observer.observe(imgElement);
    }

    return () => {
      if (imgElement) {
        observer.unobserve(imgElement);
      }
    };
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    if (activeSrc) {
      addToFailedCache(activeSrc);
    }

    if (fallbackSrc && fallbackSrc !== activeSrc && !isImageFailed(fallbackSrc)) {
      setActiveSrc(fallbackSrc);
      setHasError(false);
      setIsLoaded(false);
      return;
    }

    setHasError(true);
    setIsLoaded(true);
  };

  const imageSrc = useMemo(() => {
    if (isKnownFailure || hasError) {
      return null;
    }
    return optimizeImageSrc(activeSrc);
  }, [activeSrc, hasError, isKnownFailure]);

  const showPlaceholderOnly = isKnownFailure || hasError || !activeSrc;

  if (showPlaceholderOnly && !isInView && !activeSrc) {
    // keep structure consistent below
  }

  return (
    <div
      ref={imgRef}
      className={`lazy-image-container ${className || ''}`}
      data-error={hasError || isKnownFailure ? 'true' : 'false'}
    >
      {!activeSrc && (gameName || platform || genre || mood) && (
        <div className="lazy-image-fallback">
          <div className="lazy-image-fallback-content">
            {gameName && <div className="fallback-game-name">{gameName}</div>}
            <div className="fallback-details">
              {platform && <span className="fallback-platform">{platform}</span>}
              {genre && <span className="fallback-genre">{genre}</span>}
              {mood && <span className="fallback-mood">{mood}</span>}
            </div>
          </div>
        </div>
      )}

      {!isLoaded && activeSrc && !hasError && !isKnownFailure && (
        <div className="lazy-image-placeholder">
          <div className="lazy-image-spinner"></div>
          {placeholder && (
            <img
              src={placeholder}
              alt={alt}
              className="lazy-image-placeholder-img"
              style={{ filter: 'blur(10px)' }}
            />
          )}
        </div>
      )}

      {(hasError || isKnownFailure) && placeholder && (
        <img
          src={placeholder}
          alt={alt}
          className="lazy-image lazy-image-loaded"
          {...props}
        />
      )}

      {(hasError || isKnownFailure) && !placeholder && (gameName || platform || genre || mood) && (
        <div className="lazy-image-fallback">
          <div className="lazy-image-fallback-content">
            {gameName && <div className="fallback-game-name">{gameName}</div>}
            <div className="fallback-details">
              {platform && <span className="fallback-platform">{platform}</span>}
              {genre && <span className="fallback-genre">{genre}</span>}
              {mood && <span className="fallback-mood">{mood}</span>}
            </div>
          </div>
        </div>
      )}

      {isInView && activeSrc && !hasError && !isKnownFailure && imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`lazy-image ${isLoaded ? 'lazy-image-loaded' : ''}`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
};

export default LazyImage;
