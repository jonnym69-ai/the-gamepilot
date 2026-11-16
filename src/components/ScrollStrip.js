import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './ScrollStrip.css';

// Horizontal strip with edge arrows — the thin native scrollbar is hidden;
// arrows appear only while there is content to scroll to on that side.
export default function ScrollStrip({ className = '', children, ...rest }) {
  const ref = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return undefined;
    el.addEventListener('scroll', update, { passive: true });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, [update, children]);

  const scrollBy = (direction) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.75, behavior: 'smooth' });
  };

  return (
    <div className="scroll-strip">
      <div ref={ref} className={`scroll-strip-body ${className}`} {...rest}>
        {children}
      </div>
      {canLeft && (
        <button
          type="button"
          className="scroll-strip-arrow scroll-strip-arrow-left"
          onClick={() => scrollBy(-1)}
          aria-label="Scroll left"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
      )}
      {canRight && (
        <button
          type="button"
          className="scroll-strip-arrow scroll-strip-arrow-right"
          onClick={() => scrollBy(1)}
          aria-label="Scroll right"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
