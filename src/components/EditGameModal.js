import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, RotateCcw, Save, X } from 'lucide-react';
import { GameCurationService } from '../services/GameCurationService';
import { getAllGenres } from '../constants/GenresMoods';
import SgdbArtworkBrowser from './SgdbArtworkBrowser';
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
  const [launchArgs, setLaunchArgs] = useState('');
  const [altExes, setAltExes] = useState([]);
  const [attachments, setAttachments] = useState([]);

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
    setLaunchArgs(game.launchArgs || '');
    setAltExes(Array.isArray(game.altExecutables) ? game.altExecutables : []);
    setAttachments(Array.isArray(game.attachments) ? game.attachments : []);
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

    const nextArgs = launchArgs.trim();
    if (nextArgs !== (game.launchArgs || '')) patch.launchArgs = nextArgs;

    const cleanAlts = altExes.filter((e) => e.label?.trim() && e.path?.trim());
    if (JSON.stringify(cleanAlts) !== JSON.stringify(game.altExecutables || [])) {
      patch.altExecutables = cleanAlts;
    }

    const cleanAttachments = attachments.filter((e) => e.label?.trim() && e.url?.trim());
    if (JSON.stringify(cleanAttachments) !== JSON.stringify(game.attachments || [])) {
      patch.attachments = cleanAttachments;
    }

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
            <SgdbArtworkBrowser gameName={game.name} onPick={(url) => setCoverUrl(url)} />
          </div>

          <div className="egm-section">
            <label>Launch options</label>
            <input
              type="text"
              value={launchArgs}
              onChange={(e) => setLaunchArgs(e.target.value)}
              placeholder="Arguments, e.g. -windowed -novid"
            />
            <span className="egm-hint">Passed to the game's executable for manually-added games.</span>
            <EntryListEditor
              entries={altExes}
              setEntries={setAltExes}
              pathKey="path"
              pathPlaceholder="C:\…\other.exe"
              entryLabel="action"
              withArgs
            />
            <span className="egm-hint">
              Alternative actions — e.g. a level editor or dedicated server — shown as extra launch buttons.
            </span>
          </div>

          <div className="egm-section">
            <label>Attachments</label>
            <EntryListEditor
              entries={attachments}
              setEntries={setAttachments}
              pathKey="url"
              pathPlaceholder="https://… or file:///…"
              entryLabel="link"
            />
            <span className="egm-hint">
              Manuals, guides and links — https:// and file:/// targets open from the game.
            </span>
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

const EntryListEditor = ({ entries, setEntries, pathKey, pathPlaceholder, entryLabel, withArgs }) => {
  const [draftLabel, setDraftLabel] = useState('');
  const [draftPath, setDraftPath] = useState('');
  const [draftArgs, setDraftArgs] = useState('');

  const add = () => {
    const label = draftLabel.trim();
    const path = draftPath.trim();
    if (!label || !path) return;
    setEntries([...entries, { label, [pathKey]: path, ...(withArgs ? { args: draftArgs.trim() } : {}) }]);
    setDraftLabel('');
    setDraftPath('');
    setDraftArgs('');
  };

  return (
    <div className="egm-entry-list">
      {entries.map((entry, i) => (
        <div key={`${entry.label}-${i}`} className="egm-entry-row">
          <span className="egm-entry-text">
            {entry.label} — <code>{entry[pathKey]}</code>
            {entry.args ? ` ${entry.args}` : ''}
          </span>
          <button
            type="button"
            className="egm-entry-remove"
            aria-label={`Remove ${entry.label}`}
            onClick={() => setEntries(entries.filter((_, j) => j !== i))}
          >
            <X size={13} />
          </button>
        </div>
      ))}
      <div className="egm-entry-add">
        <input
          type="text"
          value={draftLabel}
          onChange={(e) => setDraftLabel(e.target.value)}
          placeholder={`${entryLabel} name`}
          aria-label={`New ${entryLabel} name`}
        />
        <input
          type="text"
          value={draftPath}
          onChange={(e) => setDraftPath(e.target.value)}
          placeholder={pathPlaceholder}
          aria-label={`New ${entryLabel} target`}
        />
        {withArgs && (
          <input
            type="text"
            value={draftArgs}
            onChange={(e) => setDraftArgs(e.target.value)}
            placeholder="args (optional)"
            aria-label={`New ${entryLabel} arguments`}
          />
        )}
        <button type="button" className="egm-btn egm-btn-secondary" onClick={add}>
          Add
        </button>
      </div>
    </div>
  );
};

const scannedGenresPlaceholder = (genres) =>
  Array.isArray(genres) && genres.length > 0 ? `Scanned: ${genres.join(', ')}` : '';
