import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import './BackToTop.css';

const SCROLL_THRESHOLD_PX = 600;

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SCROLL_THRESHOLD_PX);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };

  if (!visible) return null;

  return (
    <button type="button" className="back-to-top" onClick={scrollToTop} aria-label="Back to top">
      <ArrowUp size={20} />
    </button>
  );
}
