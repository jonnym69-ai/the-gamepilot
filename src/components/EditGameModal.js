import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, RotateCcw, Save, X } from 'lucide-react';
import { GameCurationService } from '../services/GameCurationService';
import { getAllGenres } from '../constants/GenresMoods';
import './EditGameModal.css';

const GENRE_SUGGESTIONS = getAllGenres();
const MIN_YEAR = 1970;
const MAX_YEAR = new Date().getFullYear() + 2;

const sameStringSet = (a = [], b = []) => a.length === b.length && a.every((item) => b.includes(item));

const ChipInput = ({ label, chips, setChips, inputValue, setInputValue, placeholder, listId, suggestions }) => {
  const addChip = () => {
    const value = inputValue.trim();
    if (!value) return;
    setChips((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setInputValue('');
  };
  return (
    <div className="egm-section">
      <label>{label}</label>
      <div className="egm-chip-box">
        {chips.map((chip) => (
          <span key={chip} className="egm-chip">
            {chip}
            <button
              type="button"
              className="egm-chip-remove"
              aria-label={`Remove ${chip}`}
              onClick={() => setChips((prev) => prev.filter((item) => item !== chip))}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          aria-label={label}
          value={inputValue}
          list={listId}
          placeholder={chips.length === 0 ? placeholder : ''}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addChip();
            }
            if (e.key === 'Backspace' && !inputValue && chips.length > 0) {
              setChips((prev) => prev.slice(0, -1));
            }
          }}
        />
        {suggestions && (
          <datalist id={listId}>
            {suggestions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        )}
      </div>
    </div>
  );
};

/**
 * "Edit details" dialog — user metadata overrides stored in
 * GameCurationService.metadataOverridesV1 (keyed by game.name, which never
 * changes). Cover art + hidden reuse their own existing stores/callbacks.
 */
export default function EditGameModal({ game, isOpen, onClose, onSave, onUpdateCoverArt, onToggleHidden }) {
  const scanned = useMemo(
    () =>
      game?.scanned || {
        genres: game?.genres,
        releaseYear: game?.releaseYear,
        developer: game?.developer,
        publisher: game?.publisher,
      },
    [game]
  );

  const [sortName, setSortName] = useState('');
  const [genres, setGenres] = useState([]);
  const [tags, setTags] = useState([]);
  const [releaseYear, setReleaseYear] = useState('');
  const [developer, setDeveloper] = useState('');
  const [publisher, setPublisher] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [hidden, setHidden] = useState(false);
  const [genreInput, setGenreInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (!isOpen || !game) return undefined;
    setSortName(game.sortName || '');
    setGenres(Array.isArray(game.genres) ? game.genres : []);
    setTags(Array.isArray(game.userTags) ? game.userTags : []);
    setReleaseYear(game.releaseYear != null ? String(game.releaseYear) : '');
    setDeveloper(game.developer || '');
    setPublisher(game.publisher || '');
    setCoverUrl(game.coverArtOverride || '');
    setHidden(Boolean(game.isHidden));
    setGenreInput('');
    setTagInput('');
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, game, onClose]);

  const buildPatch = () => {
    const prev = GameCurationService.getMetadataOverride(game.name) || {};
    const patch = {};
    const scannedGenres = Array.isArray(scanned.genres) ? scanned.genres : [];

    const nextSortName = sortName.trim();
    if (nextSortName && nextSortName !== game.name) patch.sortName = nextSortName;
    else if (prev.sortName) patch.sortName = '';

    if (!sameStringSet(genres, scannedGenres)) patch.genres = genres;
    else if (prev.genres) patch.genres = [];

    if (tags.length > 0) patch.tags = tags;
    else if (prev.tags) patch.tags = [];

    const year = releaseYear === '' ? null : Math.round(Number(releaseYear));
    const validYear = year != null && Number.isFinite(year) && year >= MIN_YEAR && year <= MAX_YEAR ? year : null;
    if (validYear != null && validYear !== scanned.releaseYear) patch.releaseYear = validYear;
    else if (prev.releaseYear != null) patch.releaseYear = '';

    const nextDeveloper = developer.trim();
    if (nextDeveloper && nextDeveloper !== (scanned.developer || '')) patch.developer = nextDeveloper;
    else if (prev.developer) patch.developer = '';

    const nextPublisher = publisher.trim();
    if (nextPublisher && nextPublisher !== (scanned.publisher || '')) patch.publisher = nextPublisher;
    else if (prev.publisher) patch.publisher = '';

    const hasContent = Object.values(patch).some(
      (value) => !(value == null || value === '' || (Array.isArray(value) && value.length === 0))
    );
    return hasContent ? patch : null;
  };

  const handleSave = () => {
    if (!game) return;
    onSave?.(game.name, buildPatch());
    if (coverUrl.trim() !== (game.coverArtOverride || '')) {
      onUpdateCoverArt?.(game.name, coverUrl.trim());
    }
    if (hidden !== Boolean(game.isHidden)) {
      onToggleHidden?.(game.name);
    }
    onClose?.();
  };

  const handleReset = () => {
    if (!game) return;
    onSave?.(game.name, null);
    if (game.coverArtOverride) onUpdateCoverArt?.(game.name, '');
    onClose?.();
  };

  if (!isOpen || !game) return null;

  return createPortal(
    <div className="egm-overlay" data-testid="egm-overlay" onClick={onClose}>
      <div
        className="egm-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Edit details for ${game.name}`}
      >
        <div className="egm-header">
          <div className="egm-title">
            <Pencil size={20} />
            <h3>Edit details — {game.name}</h3>
          </div>
          <button type="button" className="egm-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="egm-body">
          <div className="egm-section">
            <label>Sort name</label>
            <input type="text" value={sortName} onChange={(e) => setSortName(e.target.value)} placeholder={game.name} />
            <span className="egm-hint">Used for A–Z ordering only — the game's real name never changes.</span>
          </div>

          <ChipInput
            label="Genres"
            chips={genres}
            setChips={setGenres}
            inputValue={genreInput}
            setInputValue={setGenreInput}
            placeholder={scannedGenresPlaceholder(scanned.genres) || 'Type a genre and press Enter'}
            listId="egm-genre-suggestions"
            suggestions={GENRE_SUGGESTIONS}
          />

          <ChipInput
            label="Tags"
            chips={tags}
            setChips={setTags}
            inputValue={tagInput}
            setInputValue={setTagInput}
            placeholder="Type a tag and press Enter"
          />

          <div className="egm-section egm-range-row">
            <div>
              <label>Release year</label>
              <input
                type="number"
                min={MIN_YEAR}
                max={MAX_YEAR}
                value={releaseYear}
                onChange={(e) => setReleaseYear(e.target.value)}
                placeholder={scanned.releaseYear != null ? String(scanned.releaseYear) : 'YYYY'}
              />
            </div>
            <div>
              <label>Developer</label>
              <input
                type="text"
                value={developer}
                onChange={(e) => setDeveloper(e.target.value)}
                placeholder={scanned.developer || 'Developer'}
              />
            </div>
            <div>
              <label>Publisher</label>
              <input
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder={scanned.publisher || 'Publisher'}
              />
            </div>
          </div>

          <div className="egm-section">
            <label>Cover art URL</label>
            <input
              type="text"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="Paste image URL…"
            />
          </div>

          <div className="egm-section egm-toggle">
            <label>
              <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
              Hidden from library
            </label>
          </div>
        </div>

        <div className="egm-footer">
          <button type="button" className="egm-btn egm-btn-secondary" onClick={handleReset}>
            <RotateCcw size={14} />
            Reset to scanned
          </button>
          <button type="button" className="egm-btn egm-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="egm-btn egm-btn-primary" onClick={handleSave}>
            <Save size={14} />
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const scannedGenresPlaceholder = (genres) =>
  Array.isArray(genres) && genres.length > 0 ? `Scanned: ${genres.join(', ')}` : '';
