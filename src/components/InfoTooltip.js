import React from 'react';
import './InfoTooltip.css';

/**
 * InfoTooltip — a lightweight, keyboard-accessible hover help card.
 * Wraps any element and shows a styled tooltip on hover or keyboard focus.
 *
 * @param {string} title - Bold heading shown in the card
 * @param {string} [description] - Optional supporting copy
 * @param {'top'|'bottom'} [placement] - Preferred side (auto-flips if it won't fit)
 * @param {string} [className] - Extra classes for the wrapper
 */
const InfoTooltip = ({ title, description, placement = 'top', className = '', children }) => (
  <span className={`info-tooltip ${className}`} data-placement={placement}>
    {children}
    <span className="info-tooltip-card" role="tooltip">
      <span className="info-tooltip-title">{title}</span>
      {description ? <span className="info-tooltip-description">{description}</span> : null}
    </span>
  </span>
);

export default InfoTooltip;
