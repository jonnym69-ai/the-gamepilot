import React, { useEffect, useRef } from 'react';
import './CollapsibleSection.css';

function CollapsibleSection({
  title,
  subtitle,
  badge,
  icon,
  defaultOpen = false,
  className = '',
  summaryClassName = '',
  contentClassName = '',
  children
}) {
  const detailsRef = useRef(null);
  const detailsClassName = ['collapsible-folder', className].filter(Boolean).join(' ');
  const summaryClasses = ['collapsible-folder-summary', summaryClassName].filter(Boolean).join(' ');
  const contentClasses = ['collapsible-folder-content', contentClassName].filter(Boolean).join(' ');

  useEffect(() => {
    if (defaultOpen && detailsRef.current) {
      detailsRef.current.open = true;
    }
  }, [defaultOpen]);

  return (
    <details ref={detailsRef} className={detailsClassName}>
      <summary className={summaryClasses}>
        <span className="collapsible-folder-main">
          {icon ? <span className="collapsible-folder-icon">{icon}</span> : null}
          <span className="collapsible-folder-copy">
            <span className="collapsible-folder-title">{title}</span>
            {subtitle ? <span className="collapsible-folder-subtitle">{subtitle}</span> : null}
          </span>
        </span>
        <span className="collapsible-folder-side">
          {badge ? <span className="collapsible-folder-badge">{badge}</span> : null}
          <span className="collapsible-folder-state" aria-hidden="true"></span>
        </span>
      </summary>
      <div className={contentClasses}>{children}</div>
    </details>
  );
}

export default CollapsibleSection;
