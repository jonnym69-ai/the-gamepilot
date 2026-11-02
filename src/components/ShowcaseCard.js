import React, { useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Pencil, RotateCcw, X, Check, Search } from 'lucide-react';
import ShowcaseService, { SHOWCASE_LIMIT } from '../services/ShowcaseService';
import { resolveGameArtworkBundle } from '../services/GameArtworkService';
import { getBlendedPlaytimeMinutes, isNonGameTitle } from '../services/gameClassification';
import { formatPlaytime } from '../utils/formatPlaytime';
import './ShowcaseCard.css';

const sortedLibraryGames = (library) =>
  (Array.isArray(library) ? library : [])
    .filter((game) => game && game.name && !isNonGameTitle(game))
    .map((game) => ({ game, minutes: getBlendedPlaytimeMinutes(game) }))
    .sort((a, b) => b.minutes - a.minutes || String(a.game.name).localeCompare(String(b.game.name)));

const ShowcasePicker = ({ library, initialNames, onSave, onClose }) => {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(() => initialNames.slice(0, SHOWCASE_LIMIT));

  const entries = useMemo(() => {
    const all = sortedLibraryGames(library);
    const term = query.trim().toLowerCase();
    if (!term) return all;
    return all.filter(({ game }) => String(game.name).toLowerCase().includes(term));
  }, [library, query]);

  const pickedSet = useMemo(() => new Set(picked), [picked]);

  const toggle = useCallback((name) => {
    setPicked((prev) => {
      if (prev.includes(name)) return prev.filter((n) => n !== name);
      if (prev.length >= SHOWCASE_LIMIT) return prev;
      return [...prev, name];
    });
  }, []);

  const handleSave = useCallback(() => {
    ShowcaseService.setShowcaseNames(picked);
    onSave?.();
    onClose();
  }, [picked, onSave, onClose]);

  const handleAuto = useCallback(() => {
    ShowcaseService.resetShowcase();
    onSave?.();
    onClose();
  }, [onSave, onClose]);

  return createPortal(
    <div className="scpm-overlay" onClick={onClose}>
      <div
        className="scpm-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Pick showcase games"
      >
        <div className="scpm-header">
          <div className="scpm-title">
            <Trophy size={18} />
            <h3>Showcase picks</h3>
          </div>
          <button type="button" className="scpm-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="scpm-search">
          <Search size={15} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your library…"
            autoFocus
          />
          <span className="scpm-count">
            {picked.length}/{SHOWCASE_LIMIT} picked
          </span>
        </div>

        {picked.length > 0 && (
          <div className="scpm-picks">
            {picked.map((name, index) => (
              <button
                key={name}
                type="button"
                className="scpm-pick"
                onClick={() => toggle(name)}
                title="Remove from showcase"
              >
                <span className="scpm-pick-num">{index + 1}</span>
                {name}
                <X size={12} />
              </button>
            ))}
          </div>
        )}

        <div className="scpm-list">
          {entries.length === 0 && <div className="scpm-empty">No games match that search.</div>}
          {entries.map(({ game, minutes }) => {
            const index = picked.indexOf(game.name);
            const selected = pickedSet.has(game.name);
            const { artwork, placeholder } = resolveGameArtworkBundle(game, { surface: 'profile_icon' });
            return (
              <button
                key={game.name}
                type="button"
                className={`scpm-row${selected ? ' selected' : ''}`}
                onClick={() => toggle(game.name)}
                disabled={!selected && picked.length >= SHOWCASE_LIMIT}
              >
                <span className="scpm-row-check">
                  {selected ? <Check size={13} /> : null}
                  {selected && <span className="scpm-row-order">{index + 1}</span>}
                </span>
                <img
                  src={artwork || placeholder}
                  alt=""
                  className="scpm-row-art"
                  loading="lazy"
                  onError={(e) => {
                    if (e.currentTarget.src !== placeholder) e.currentTarget.src = placeholder;
                  }}
                />
                <span className="scpm-row-name">{game.name}</span>
                <span className="scpm-row-hours">{minutes > 0 ? formatPlaytime(minutes) : 'unplayed'}</span>
              </button>
            );
          })}
        </div>

        <div className="scpm-footer">
          <button type="button" className="scpm-btn scpm-btn-secondary" onClick={handleAuto}>
            <RotateCcw size={14} />
            Use most played
          </button>
          <button type="button" className="scpm-btn scpm-btn-primary" onClick={handleSave}>
            <Check size={14} />
            Save picks
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const ShowcaseTile = ({ game }) => {
  const { artwork, fallbackSrc, placeholder } = resolveGameArtworkBundle(game, {
    surface: 'portrait',
    fallbackSurface: 'hero',
  });
  const minutes = getBlendedPlaytimeMinutes(game);

  return (
    <div className="showcase-tile" title={game.name}>
      <img
        src={artwork || placeholder}
        alt={game.name}
        loading="lazy"
        onError={(e) => {
          const target = e.currentTarget;
          if (fallbackSrc && target.src !== fallbackSrc) {
            target.src = fallbackSrc;
          } else if (target.src !== placeholder) {
            target.src = placeholder;
          }
        }}
      />
      <div className="showcase-tile-caption">
        <span className="showcase-tile-name">{game.name}</span>
        {minutes > 0 && <span className="showcase-tile-hours">{formatPlaytime(minutes)}</span>}
      </div>
    </div>
  );
};

const ShowcaseCard = ({ library = [] }) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [version, setVersion] = useState(0);

  const { games, mode } = useMemo(
    () => ShowcaseService.getShowcaseGames(library),
    // `version` re-resolves after picker saves; library changes re-resolve anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [library, version]
  );

  if (games.length === 0) return null;

  return (
    <div className="showcase-card">
      <div className="gaming-persona-card-header showcase-card-header">
        <Trophy size={16} />
        <span>Showcase</span>
        <span className="showcase-mode">{mode === 'custom' ? 'Your picks' : 'Most played'}</span>
        <button
          type="button"
          className="showcase-edit-btn"
          onClick={() => setPickerOpen(true)}
          title="Pick your showcase games"
        >
          <Pencil size={13} />
          Edit
        </button>
      </div>

      <div className="showcase-grid">
        {games.map((game) => (
          <ShowcaseTile key={game.name} game={game} />
        ))}
      </div>

      {mode === 'auto' && (
        <button type="button" className="showcase-auto-hint" onClick={() => setPickerOpen(true)}>
          Pick your own top {SHOWCASE_LIMIT} →
        </button>
      )}

      {pickerOpen && (
        <ShowcasePicker
          library={library}
          initialNames={ShowcaseService.getShowcaseNames() || games.map((g) => g.name)}
          onSave={() => setVersion((v) => v + 1)}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
};

export default ShowcaseCard;
