import React from 'react';

function SpecCard({
  icon: Icon,
  title,
  model,
  details,
  badgeText,
  badgeColor,
  score,
  scoreColor,
  children,
}) {
  return (
    <div className="spec-card">
      <div className="spec-header">
        {Icon && <Icon size={24} />}
        <h3>{title}</h3>
      </div>
      <p className="spec-model">{model}</p>
      {details && (
        <div className="spec-details">
          <span>{details}</span>
        </div>
      )}
      {children}
      {badgeText && (
        <div
          className="tier-badge"
          style={{ background: badgeColor }}
        >
          {badgeText}
        </div>
      )}
      {typeof score === 'number' && (
        <div className="spec-score">
          <div className="score-bar">
            <div
              className="score-fill"
              style={{
                width: `${score}%`,
                background: scoreColor,
              }}
            />
          </div>
          <span>{score}/100</span>
        </div>
      )}
    </div>
  );
}

export default SpecCard;
