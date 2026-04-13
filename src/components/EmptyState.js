import React from 'react';

function EmptyState({
  icon = '✨',
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
  style = {}
}) {
  return (
    <div
      className={`shared-empty-state${compact ? ' compact' : ''}`}
      style={{
        padding: compact ? '24px 20px' : '36px 28px',
        borderRadius: '16px',
        border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
        textAlign: 'center',
        color: 'var(--text)',
        ...style
      }}
    >
      <div
        style={{
          fontSize: compact ? '2rem' : '2.5rem',
          marginBottom: compact ? '10px' : '14px',
          lineHeight: 1
        }}
      >
        {icon}
      </div>
      <h3 style={{ margin: '0 0 10px', fontSize: compact ? '1.05rem' : '1.25rem' }}>
        {title}
      </h3>
      {description && (
        <p
          style={{
            margin: 0,
            opacity: 0.78,
            lineHeight: 1.6,
            maxWidth: '640px',
            marginInline: 'auto'
          }}
        >
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            marginTop: '16px',
            padding: '10px 18px',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'var(--button-primary-bg, #ff6b35)',
            color: 'var(--button-primary-text, #fff)',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
