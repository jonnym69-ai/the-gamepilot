import React from 'react';
import './Spinner.css';

function Spinner({ size = 'medium', color = 'var(--text)' }) {
  return (
    <div className={`spinner spinner-${size}`} style={{ borderTopColor: color }}></div>
  );
}

function SkeletonLoader({ type = 'card', count = 1 }) {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className="skeleton-card">
            <div className="skeleton-image"></div>
            <div className="skeleton-content">
              <div className="skeleton-title"></div>
              <div className="skeleton-text"></div>
              <div className="skeleton-text short"></div>
            </div>
          </div>
        );
      case 'text':
        return (
          <div className="skeleton-text-block">
            <div className="skeleton-text"></div>
            <div className="skeleton-text short"></div>
          </div>
        );
      case 'button':
        return <div className="skeleton-button"></div>;
      default:
        return <div className="skeleton-box"></div>;
    }
  };

  return (
    <div className="skeleton-container">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </div>
  );
}

export { Spinner, SkeletonLoader };
