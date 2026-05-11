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
        padding: compact ? '28px 24px' : '40px 32px',
        borderRadius: '20px',
        border: '1px solid var(--border-color, rgba(255,255,255,0.14))',
        background: 'linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 50%, rgba(255,255,255,0.01) 100%)',
        textAlign: 'center',
        color: 'var(--text)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
    >
      {/* Subtle gradient overlay for depth */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '50%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          fontSize: compact ? '2.2rem' : '2.75rem',
          marginBottom: compact ? '12px' : '16px',
          lineHeight: 1,
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
          position: 'relative',
          zIndex: 1
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          margin: '0 0 12px',
          fontSize: compact ? '1.1rem' : '1.35rem',
          fontWeight: 700,
          position: 'relative',
          zIndex: 1
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            margin: 0,
            opacity: 0.75,
            lineHeight: 1.65,
            maxWidth: '560px',
            marginInline: 'auto',
            fontSize: compact ? '0.92rem' : '0.98rem',
            position: 'relative',
            zIndex: 1
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
            marginTop: '20px',
            padding: '12px 24px',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'linear-gradient(135deg, var(--button-primary-bg, #ff6b35) 0%, var(--accent-secondary, #ff8c42) 100%)',
            color: 'var(--button-primary-text, #fff)',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(255, 107, 53, 0.32), 0 2px 4px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
            position: 'relative',
            zIndex: 1,
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 10px 24px rgba(255, 107, 53, 0.42), 0 4px 8px rgba(0, 0, 0, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(255, 107, 53, 0.32), 0 2px 4px rgba(0, 0, 0, 0.2)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(0.98)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
