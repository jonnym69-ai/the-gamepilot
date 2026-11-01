import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, X, ExternalLink } from 'lucide-react';
import { getElectronAPI, openExternalUrl } from '../services/ElectronBridge';
import { getSteamStoreDetails } from '../services/SteamStoreService';
import { formatPlaytime } from '../utils/formatPlaytime';
import stripHtml from '../utils/stripHtml';
import YouTubeVideosPanel from './YouTubeVideosPanel';
import RecommendationPreferenceControl from './RecommendationPreferenceControl';
import './OwnedGameModal.css';

const INSTALL_LABELS = {
  steam: 'Install via Steam',
  epic: 'Install via Epic',
  gog: 'Install via Galaxy',
  itch: 'Open on itch.io',
};

const INSTALLING_LABELS = {
  steam: 'Opening Steam…',
  epic: 'Opening Epic…',
  gog: 'Opening Galaxy…',
  itch: 'Opening itch.io…',
};

const STORE_URLS = {
  steam: (game) => (game.appid ? `https://store.steampowered.com/app/${game.appid}` : null),
  itch: (game) => game.url || null,
};

/**
 * Detail modal for an owned-but-not-installed game — same shape as the
 * installed-game modal, with an Install action instead of Launch. Steam rows
 * get full store details (public appdetails, keyed by appid); GOG rows get
 * the public products catalog; Epic rows use catalog data already fetched
 * with the owned list.
 */
export default function OwnedGameModal({ game, onClose, onInstall, installing = false }) {
  const [details, setDetails] = useState(null);
  const [detailsError, setDetailsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeShot, setActiveShot] = useState(0);
  const closeRef = useRef(null);

  useEffect(() => {
    if (game) closeRef.current?.focus();
  }, [game]);

  const isSteam = game?.source === 'steam' && Boolean(game?.appid);
  const isGog = game?.source === 'gog' && Boolean(game?.gogProductId);

  useEffect(() => {
    if (!game) return undefined;
    let cancelled = false;
    setDetails(null);
    setDetailsError(false);
    setActiveShot(0);

    if (isSteam) {
      setLoading(true);
      getSteamStoreDetails(String(game.appid))
        .then((data) => {
          if (!cancelled) setDetails({ kind: 'steam', data });
        })
        .catch(() => {
          if (!cancelled) setDetailsError(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else if (isGog) {
      const api = getElectronAPI();
      if (api && typeof api.gogStoreDetails === 'function') {
        setLoading(true);
        api
          .gogStoreDetails(String(game.gogProductId))
          .then((result) => {
            if (cancelled) return;
            if (result?.ok && result.data) setDetails({ kind: 'gog', data: result.data });
            else setDetailsError(true);
          })
          .catch(() => {
            if (!cancelled) setDetailsError(true);
          })
          .finally(() => {
            if (!cancelled) setLoading(false);
          });
      }
    }
    return () => {
      cancelled = true;
    };
  }, [game, isSteam, isGog]);

  useEffect(() => {
    if (!game) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [game, onClose]);

  const view = useMemo(() => {
    if (!game) return null;
    const steam = details?.kind === 'steam' ? details.data : null;
    const gog = details?.kind === 'gog' ? details.data : null;
    return {
      title: steam?.name || gog?.name || game.name,
      hero: steam?.header_image || gog?.hero || game.icon || null,
      screenshots:
        (steam?.screenshots || [])
          .map((shot) => shot?.path_full || shot?.path_thumbnail)
          .filter(Boolean)
          .slice(0, 6) ||
        gog?.screenshots ||
        [],
      description: stripHtml(steam?.short_description || gog?.description || game.description || ''),
      lead: gog?.lead ? stripHtml(gog.lead) : '',
      genres: Array.isArray(steam?.genres) ? steam.genres.map((genre) => genre?.description).filter(Boolean) : [],
      developers: Array.isArray(steam?.developers) ? steam.developers.filter(Boolean) : [],
      releaseDate: steam?.release_date?.date || gog?.releaseDate || null,
      metacritic: steam?.metacritic?.score || null,
      storeUrl: STORE_URLS[game.source]?.(game) || gog?.storeUrl || null,
    };
  }, [game, details]);

  if (!game || !view) return null;

  // Portal to document.body — Library's animated ancestors (transform on
  // fade-in containers) would otherwise trap position:fixed inside the page
  // flow and bury the modal off-screen.

  const lastPlayed = (() => {
    if (!game.lastPlayed) return null;
    const date = new Date(Number(game.lastPlayed));
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
  })();

  return createPortal(
    <div className="owned-modal-overlay" data-testid="owned-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="owned-modal-container"
        role="dialog"
        aria-modal="true"
        aria-label={`${view.title} — owned, not installed`}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" ref={closeRef} className="owned-modal-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <div className="owned-modal-hero">
          {view.hero ? (
            <img src={view.hero} alt="" className="owned-modal-hero-img" />
          ) : (
            <div className="owned-modal-hero-fallback" aria-hidden="true">
              {String(view.title || '?')
                .slice(0, 1)
                .toUpperCase()}
            </div>
          )}
          <div className="owned-modal-hero-fade" />
          <div className="owned-modal-hero-title">
            <span className={`owned-modal-source owned-modal-source-${game.source}`}>{game.platform}</span>
            <h2>{view.title}</h2>
            <p className="owned-modal-meta">
              Owned on {game.platform}
              {game.playtimeForever > 0 ? ` · ${formatPlaytime(game.playtimeForever)} played` : ''}
              {lastPlayed ? ` · last played ${lastPlayed}` : ''}
              {game.freebie ? ` · Previously offered free on ${game.freebie.platform}` : ''}
              {game.alsoOwnedOn?.length ? ` · Same title on ${game.alsoOwnedOn.join(' + ')}` : ''}
              {game.relatedOwnedOn?.length ? ` · Possible other edition on ${game.relatedOwnedOn.join(' + ')}` : ''}
            </p>
          </div>
        </div>

        <div className="owned-modal-body">
          {loading && <p className="owned-modal-loading">Loading details…</p>}
          {!loading && detailsError && <p className="owned-modal-note">Store details unavailable — basics only.</p>}
          {view.lead && <p className="owned-modal-lead">{view.lead}</p>}
          {view.description && <p className="owned-modal-desc">{view.description}</p>}

          {(view.genres.length > 0 || view.developers.length > 0 || view.releaseDate || view.metacritic) && (
            <div className="owned-modal-facts">
              {view.genres.length > 0 && (
                <span className="owned-modal-fact">
                  <strong>Genres</strong> {view.genres.slice(0, 4).join(' · ')}
                </span>
              )}
              {view.developers.length > 0 && (
                <span className="owned-modal-fact">
                  <strong>Developer</strong> {view.developers.slice(0, 2).join(', ')}
                </span>
              )}
              {view.releaseDate && (
                <span className="owned-modal-fact">
                  <strong>Released</strong> {view.releaseDate}
                </span>
              )}
              {view.metacritic && (
                <span className="owned-modal-fact">
                  <strong>Metacritic</strong> {view.metacritic}
                </span>
              )}
            </div>
          )}

          {view.screenshots.length > 0 && (
            <div className="owned-modal-shots">
              <img src={view.screenshots[activeShot] || view.screenshots[0]} alt="" className="owned-modal-shot-main" />
              {view.screenshots.length > 1 && (
                <div className="owned-modal-shot-thumbs">
                  {view.screenshots.map((shot, index) => (
                    <button
                      key={shot}
                      type="button"
                      className={`owned-modal-shot-thumb${index === activeShot ? ' active' : ''}`}
                      onClick={() => setActiveShot(index)}
                      aria-label={`Screenshot ${index + 1}`}
                    >
                      <img src={shot} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <YouTubeVideosPanel key={game.name || game.title} game={game} />
          <RecommendationPreferenceControl game={game} />
        </div>

        <div className="owned-modal-footer">
          <button type="button" className="owned-modal-install" onClick={() => onInstall?.(game)} disabled={installing}>
            <Download size={16} aria-hidden="true" />
            {installing ? INSTALLING_LABELS[game.source] : INSTALL_LABELS[game.source]}
          </button>
          {view.storeUrl && (
            <button type="button" className="owned-modal-store" onClick={() => openExternalUrl(view.storeUrl)}>
              <ExternalLink size={14} aria-hidden="true" />
              View store page
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
