import React, { useState } from 'react';
import { Check } from 'lucide-react';

const FALLBACK_PREVIEW = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

export default function ThemePicker({ themes = {}, currentTheme, onSelect }) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const entries = Object.entries(themes).filter(
    ([id, theme]) => !normalizedQuery || (theme.name || id).toLowerCase().includes(normalizedQuery)
  );

  return (
    <div className="theme-picker">
      <input
        type="search"
        className="theme-picker-search"
        placeholder="Search themes…"
        aria-label="Search themes"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="theme-picker-grid">
        {entries.map(([id, theme]) => {
          const active = id === currentTheme;
          return (
            <button
              key={id}
              type="button"
              className={`theme-picker-tile${active ? ' active' : ''}`}
              onClick={() => onSelect(id)}
              aria-pressed={active}
              title={theme.name || id}
            >
              <span
                className="theme-preview theme-picker-preview"
                style={{ background: theme.preview || FALLBACK_PREVIEW }}
                aria-hidden="true"
              >
                {active && (
                  <span className="theme-picker-check">
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className="theme-picker-name">{theme.name || id}</span>
            </button>
          );
        })}
      </div>
      {entries.length === 0 && (
        <p className="setting-description" style={{ marginTop: '8px' }}>
          No themes match &quot;{query}&quot;.
        </p>
      )}
    </div>
  );
}
