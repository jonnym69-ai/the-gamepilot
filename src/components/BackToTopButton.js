import React, { useEffect, useState } from 'react';

function BackToTopButton({ threshold = 500 }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > threshold);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  if (!isVisible) {
    return null;
  }

  return (
    <button
      className="back-to-top-button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
    >
      ↑ Top
    </button>
  );
}

export default BackToTopButton;
