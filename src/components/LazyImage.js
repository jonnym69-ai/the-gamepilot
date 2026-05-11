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

const LazyImage = ({ src, alt, className, placeholder, gameName, platform, genre, mood, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);
  
  // Check if this image has already failed before
  const isKnownFailure = useMemo(() => {
    return src && isImageFailed(src);
  }, [src]);
  
  // Set error state immediately if this is a known failure
  useEffect(() => {
    if (isKnownFailure) {
      setHasError(true);
      setIsLoaded(true);
    }
  }, [isKnownFailure]);

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
    setHasError(true);
    setIsLoaded(true);
    // Cache this failed URL to prevent future requests
    if (src) {
      addToFailedCache(src);
    }
  };

  const imageSrc = useMemo(() => {
    // If this image is known to fail, don't try to load it
    if (isKnownFailure) {
      return null;
    }
    
    // If we already have an error, use placeholder immediately
    if (hasError) {
      return placeholder || 'https://placehold.co/184x69.jpg?text=No+Image';
    }

    // Optimize URL only if no error yet
    if (!src || src.includes('placehold.co')) return src;
    
    // Add optimization parameters for Steam images
    if (src.includes('steamstatic.com')) {
      const separator = src.includes('?') ? '&' : '?';
      return `${src}${separator}quality=80&format=webp`;
    }
    
    return src;
  }, [src, hasError, placeholder, isKnownFailure]);

  // If this is a known failure, show placeholder immediately without any loading states
  if (isKnownFailure) {
    return (
      <div 
        ref={imgRef} 
        className={`lazy-image-container ${className || ''}`}
        data-error="true"
      >
        {placeholder ? (
          <img 
            src={placeholder} 
            alt={alt} 
            className="lazy-image lazy-image-loaded"
            {...props}
          />
        ) : (
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
      </div>
    );
  }

  return (
    <div 
      ref={imgRef} 
      className={`lazy-image-container ${className || ''}`}
      data-error={hasError ? 'true' : 'false'}
    >
      {!src && (gameName || platform || genre || mood) && (
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
      
      {!isLoaded && src && !hasError && (
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
      
      {hasError && placeholder && (
        <img 
          src={placeholder} 
          alt={alt} 
          className="lazy-image lazy-image-loaded"
          {...props}
        />
      )}
      
      {isInView && src && !hasError && (
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
