import React, { useId, useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import catalogue from '../constants/FreeToPlayEssentials.json';
import { getGameArtworkPlaceholder, resolveGameArtwork } from '../services/GameArtworkService';
import { openExternalUrl } from '../services/ElectronBridge';
import LazyImage from './LazyImage';

const platforms = [...new Set(catalogue.map((game) => game.platform))];
const normalized = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();
const installedMatch = (entry, library) =>
  (Array.isArray(library) ? library : []).find((game) => {
    if (!game || game.installed === false || normalized(game.platform) !== normalized(entry.platform)) return false;
    if (!(game.installed === true || game.installDir || game.executablePath)) return false;
    return entry.steamAppId
      ? String(game.appid || game.app_id || game.steamAppId || '') === entry.steamAppId
      : [entry.name, ...(entry.aliases || [])].some((name) => normalized(name) === normalized(game.name));
  });

export default function FreeToPlayEssentials({ library = [], onLaunchGame, activeSessions = {} }) {
  const id = useId();
  const [platform, setPlatform] = useState(platforms[0]);
  const [linkError, setLinkError] = useState('');
  const running = new Set(Object.keys(activeSessions || {}).map(normalized));
  const openPage = async (url) => {
    setLinkError('');
    try {
      await openExternalUrl(url);
    } catch {
      setLinkError('Could not open the official page. Please try again.');
    }
  };

  return (
    <section aria-labelledby={`${id}-heading`} className="discover-essentials">
      <h3 id={`${id}-heading`}>Selected free-to-play games</h3>
      <p className="discover-catalogue-note">
        Three starting points per platform, not a live ranking or an exclusive catalogue. These are free-to-play games,
        not limited-time giveaways. Accounts and internet access are required.
      </p>
      <div className="discover-quick-pick-row" role="group" aria-label="Free-to-play platforms">
        {platforms.map((value) => (
          <button
            key={value}
            type="button"
            className="discover-pick-pill"
            aria-pressed={platform === value}
            onClick={() => {
              setPlatform(value);
              setLinkError('');
            }}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="discover-essential-cards">
        {catalogue
          .filter((entry) => entry.platform === platform)
          .map((entry) => {
            const game = installedMatch(entry, library);
            const isRunning = game && running.has(normalized(game.name));
            const artwork = entry.steamAppId
              ? resolveGameArtwork({ appid: entry.steamAppId }, { surface: 'portrait' })
              : entry.image;
            const placeholder = getGameArtworkPlaceholder({
              game: entry,
              surface: 'portrait',
              icon: entry.name.slice(0, 2).toUpperCase(),
            });
            return (
              <article key={entry.id} className="discover-quick-pick-card">
                <div className="discover-quick-pick-art">
                  <LazyImage
                    src={artwork}
                    alt={`${entry.name} artwork`}
                    placeholder={placeholder}
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="discover-quick-pick-details">
                  <span className="discover-offer-badge">Free-to-play · {entry.platform}</span>
                  <h4>{entry.name}</h4>
                  <p className="discover-essential-moods">{entry.moods.join(' · ')}</p>
                  <p>{entry.description}</p>
                  <p className="discover-catalogue-note">{entry.costNote}</p>
                  <div className="discover-essential-actions">
                    {game && onLaunchGame && (
                      <button
                        type="button"
                        className="discover-quick-pick-play"
                        disabled={!!isRunning}
                        aria-label={isRunning ? `${entry.name} is running` : `Play ${entry.name}`}
                        onClick={() => onLaunchGame(game)}
                      >
                        <Play size={14} aria-hidden="true" /> {isRunning ? 'Running' : 'Play'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="discover-pick-pill"
                      onClick={() => openPage(entry.url)}
                      aria-label={`Official page for ${entry.name}`}
                    >
                      Official page <ExternalLink size={14} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
      </div>
      {linkError && <p role="alert">{linkError}</p>}
      <p className="discover-catalogue-note">
        Curated with GamePilot releases, not checked live. Availability and paid features may change; confirm on the
        official page. Artwork loads from publisher CDNs when shown. Your library and play history are not sent.
      </p>
    </section>
  );
}
