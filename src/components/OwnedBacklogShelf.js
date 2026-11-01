import React, { useEffect, useState } from 'react';
import { Archive, Download, X } from 'lucide-react';
import OwnedBacklogService from '../services/OwnedBacklogService';
import PendingInstallService from '../services/PendingInstallService';
import { openExternalUrl } from '../services/ElectronBridge';
import { formatPlaytime } from '../utils/formatPlaytime';
import OwnedGameModal from './OwnedGameModal';
import './OwnedBacklogShelf.css';

const INSTALL_LABELS = { steam: 'Install', epic: 'Install', gog: 'Install', itch: 'itch.io' };

/**
 * "From your uninstalled backlog" — a daily rotation of owned-but-not-
 * installed picks on the Recs page. Steam games with real playtime rank
 * first ("reinstall" candidates), then claimed Epic/GOG games. Clicking a
 * card opens the owned-game detail modal; the Install button deep-links the
 * launcher and registers the game with the install watcher.
 */
export default function OwnedBacklogShelf({ library = [] }) {
  const [picks, setPicks] = useState([]);
  const [modalGame, setModalGame] = useState(null);
  const [installing, setInstalling] = useState(null);

  useEffect(() => {
    let cancelled = false;
    OwnedBacklogService.getPool(library)
      .then((pool) => {
        if (!cancelled) setPicks(OwnedBacklogService.picksForDay(pool));
      })
      .catch(() => {
        if (!cancelled) setPicks([]);
      });
    return () => {
      cancelled = true;
    };
  }, [library]);

  if (picks.length === 0) return null;

  const handleInstall = (game) => {
    const key = OwnedBacklogService.keyFor(game);
    setInstalling(key);
    const action =
      game.source === 'itch'
        ? openExternalUrl(game.url || 'https://itch.io/my-purchases')
        : PendingInstallService.installOwnedGame(game);
    Promise.resolve(action).finally(() => setInstalling(null));
  };

  const handleDismiss = (game) => {
    OwnedBacklogService.dismiss(game);
    setPicks((current) =>
      current.filter((pick) => OwnedBacklogService.keyFor(pick) !== OwnedBacklogService.keyFor(game))
    );
  };

  return (
    <section className="owned-backlog" aria-label="Owned games not installed, worth a look">
      <div className="owned-backlog-header">
        <div className="owned-backlog-heading">
          <Archive size={16} aria-hidden="true" />
          <h2>From your uninstalled backlog</h2>
        </div>
        <p className="owned-backlog-sub">Games you own but haven&apos;t installed — today&apos;s picks.</p>
      </div>
      <div className="owned-backlog-grid">
        {picks.map((game) => {
          const key = OwnedBacklogService.keyFor(game);
          return (
            <div key={key} className="owned-backlog-card">
              <button
                type="button"
                className="owned-backlog-card-body"
                onClick={() => setModalGame(game)}
                aria-label={`${game.name} — details`}
              >
                <span className="owned-backlog-art">
                  {game.icon ? (
                    <img src={game.icon} alt="" loading="lazy" />
                  ) : (
                    <span className="owned-backlog-art-fallback" aria-hidden="true">
                      {String(game.name || '?')
                        .slice(0, 1)
                        .toUpperCase()}
                    </span>
                  )}
                  <span className={`owned-backlog-source owned-backlog-source-${game.source}`}>{game.platform}</span>
                </span>
                <span className="owned-backlog-name">{game.name}</span>
                <span className="owned-backlog-meta">
                  {game.playtimeForever > 0 ? `${formatPlaytime(game.playtimeForever)} played` : 'No recorded playtime'}
                  {game.freebie ? ` · Previously offered free on ${game.freebie.platform}` : ''}
                  {game.alsoOwnedOn?.length ? ` · Same title on ${game.alsoOwnedOn.join(' + ')}` : ''}
                  {game.relatedOwnedOn?.length ? ` · Possible other edition on ${game.relatedOwnedOn.join(' + ')}` : ''}
                </span>
              </button>
              <div className="owned-backlog-actions">
                <button
                  type="button"
                  className="owned-backlog-install"
                  onClick={() => handleInstall(game)}
                  disabled={installing === key}
                >
                  <Download size={13} aria-hidden="true" />
                  {installing === key ? 'Opening…' : INSTALL_LABELS[game.source] || 'Install'}
                </button>
                <button
                  type="button"
                  className="owned-backlog-dismiss"
                  onClick={() => handleDismiss(game)}
                  aria-label={`Don't show ${game.name} in backlog picks`}
                  title="Not interested"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {modalGame && (
        <OwnedGameModal
          game={modalGame}
          onClose={() => setModalGame(null)}
          onInstall={(game) => {
            setModalGame(null);
            handleInstall(game);
          }}
          installing={installing === OwnedBacklogService.keyFor(modalGame)}
        />
      )}
    </section>
  );
}
