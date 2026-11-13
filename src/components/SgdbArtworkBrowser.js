import React, { useState } from 'react';
import SteamGridDbService from '../services/SteamGridDbService';
import './SgdbArtworkBrowser.css';

// Browse real SteamGridDB grids inside Edit details. The user's own free
// SGDB key unlocks it once; picks fill the cover-art URL field which saves
// through the existing coverArtOverride path.
export default function SgdbArtworkBrowser({ gameName, onPick }) {
  const [key, setKey] = useState(SteamGridDbService.getApiKey());
  const [keyDraft, setKeyDraft] = useState('');
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState('grids');
  const [games, setGames] = useState(null);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const browse = async (gameId = null, nextKind = kind) => {
    setStatus('loading');
    setError(null);
    try {
      let id = gameId;
      if (!id) {
        const found = await SteamGridDbService.searchGames(gameName);
        setGames(found);
        id = found[0]?.id;
        if (!id) {
          setItems([]);
          setStatus('done');
          return;
        }
      }
      const art = await SteamGridDbService.getArt(id, nextKind);
      setItems(art);
      setStatus('done');
    } catch (e) {
      setError(e?.message === 'invalid-key' ? 'invalid-key' : 'unavailable');
      setStatus('done');
    }
  };

  const saveKey = () => {
    const value = keyDraft.trim();
    if (!value) return;
    SteamGridDbService.setApiKey(value);
    setKey(value);
  };

  if (!key) {
    return (
      <div className="sgdb-browser">
        <span className="egm-hint">
          Paste a free <strong>SteamGridDB API key</strong> (steamgriddb.com → profile → API) to browse real covers,
          heroes and logos here. Stored locally, sent only to SteamGridDB.
        </span>
        <div className="sgdb-key-row">
          <input
            type="password"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            placeholder="SGDB API key"
            aria-label="SteamGridDB API key"
          />
          <button type="button" className="egm-btn egm-btn-secondary" onClick={saveKey}>
            Store key
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sgdb-browser">
      <button
        type="button"
        className="egm-btn egm-btn-secondary"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && games === null) browse();
        }}
        aria-expanded={open}
      >
        Browse SteamGridDB artwork
      </button>
      {open && (
        <div className="sgdb-panel">
          {error === 'invalid-key' && (
            <div className="sgdb-key-row">
              <input
                type="password"
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                placeholder="New SGDB API key"
                aria-label="New SteamGridDB API key"
              />
              <button
                type="button"
                className="egm-btn egm-btn-secondary"
                onClick={() => {
                  saveKey();
                  setError(null);
                }}
              >
                Replace key
              </button>
            </div>
          )}
          <div className="sgdb-tabs" role="tablist" aria-label="Artwork type">
            {['grids', 'heroes', 'logos'].map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={kind === k}
                className={`sgdb-tab${kind === k ? ' active' : ''}`}
                onClick={() => {
                  setKind(k);
                  if (games?.[0]?.id) browse(games[0].id, k);
                }}
              >
                {k}
              </button>
            ))}
          </div>
          {Array.isArray(games) && games.length > 1 && (
            <div className="sgdb-games">
              {games.slice(0, 4).map((g) => (
                <button key={g.id} type="button" className="sgdb-game-chip" onClick={() => browse(g.id)}>
                  {g.name}
                </button>
              ))}
            </div>
          )}
          {status === 'loading' && <p className="sgdb-note">Searching SteamGridDB…</p>}
          {error === 'invalid-key' && <p className="sgdb-note">That key was rejected — check it in Settings.</p>}
          {error === 'unavailable' && <p className="sgdb-note">SteamGridDB isn’t reachable right now.</p>}
          {status === 'done' && !error && items.length === 0 && (
            <p className="sgdb-note">
              No {kind} found for “{gameName}”.
            </p>
          )}
          {items.length > 0 && (
            <div className={`sgdb-grid sgdb-grid-${kind}`}>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="sgdb-item"
                  onClick={() => onPick?.(item.url)}
                  title={item.author ? `by ${item.author}` : 'Use this artwork'}
                >
                  <img src={item.thumb || item.url} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
