import React, { useEffect, useRef, useState } from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import { Youtube, ExternalLink, Loader2 } from 'lucide-react';
import { getElectronAPI, openExternalUrl } from '../services/ElectronBridge';
import './YouTubeVideosPanel.css';

const CATEGORIES = [
  { id: 'gameplay', label: 'Gameplay', term: 'gameplay' },
  { id: 'reviews', label: 'Reviews', term: 'game review' },
  { id: 'guides', label: 'Guides', term: 'beginner guide' },
];

// YouTube snippet titles arrive HTML-encoded; decode the common entities and
// render as plain text (never dangerouslySetInnerHTML).
const decodeEntities = (text) =>
  String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");

const youtubeSearchUrl = (title, category) => {
  const term = CATEGORIES.find((c) => c.id === category)?.term || 'gameplay';
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${term}`)}`;
};

const errorMessage = (code) => {
  switch (code) {
    case 'missing-key':
      return 'missing-key';
    case 'invalid-key':
      return 'That YouTube API key was rejected — check it in Settings, and make sure YouTube Data API v3 is enabled for the key.';
    case 'access-denied':
      return 'YouTube denied this key. Enable YouTube Data API v3 for it in Google Cloud, then try again.';
    case 'quota-exceeded':
      return 'YouTube’s request limit has been reached. Try again later.';
    case 'desktop-only':
      return 'YouTube search needs the GamePilot desktop app.';
    default:
      return 'YouTube search is unavailable right now. Try again.';
  }
};

/**
 * On-demand "Watch before you play" panel. No search runs until the user
 * picks a category; results open on youtube.com in the browser — no embeds.
 */
export default function YouTubeVideosPanel({ game }) {
  const title = String(game?.name || game?.title || '').trim();
  const inRouter = useInRouterContext();
  const requestSeq = useRef(0);
  const [category, setCategory] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    // New game identity: reset selection and invalidate any late responses.
    requestSeq.current += 1;
    setCategory(null);
    setStatus('idle');
    setVideos([]);
    setError(null);
    return () => {
      requestSeq.current += 1;
    };
  }, [title]);

  const selectCategory = async (next) => {
    const seq = (requestSeq.current += 1);
    setCategory(next);
    setError(null);

    const api = getElectronAPI();
    if (!api || typeof api.youtubeSearch !== 'function') {
      setStatus('error');
      setError('desktop-only');
      return;
    }

    setStatus('loading');
    let result;
    try {
      result = await api.youtubeSearch({ title, category: next });
    } catch {
      result = { ok: false, error: 'unavailable' };
    }
    if (requestSeq.current !== seq) return; // a newer pick or a new game won
    if (result?.ok) {
      setVideos(Array.isArray(result.videos) ? result.videos : []);
      setStatus('ready');
    } else {
      setStatus('error');
      setError(result?.error || 'unavailable');
    }
  };

  return (
    <div className="yt-videos">
      <div className="yt-videos-header">
        <Youtube size={16} aria-hidden="true" />
        <h3>Watch before you play</h3>
        <span className="yt-videos-attribution">YouTube</span>
      </div>
      <p className="yt-videos-sub">Find gameplay, reviews and guides on YouTube. Videos open in your browser.</p>

      <div className="yt-videos-categories" role="group" aria-label="YouTube video categories">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`yt-videos-category${category === c.id ? ' active' : ''}`}
            aria-pressed={category === c.id}
            onClick={() => selectCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {status === 'loading' && (
        <p className="yt-videos-note yt-videos-loading" role="status">
          <Loader2 size={14} className="yt-videos-spin" aria-hidden="true" /> Searching YouTube…
        </p>
      )}

      {status === 'error' && (
        <p className="yt-videos-note yt-videos-error" role="alert">
          {error === 'missing-key' ? (
            <>
              Add your YouTube API key in{' '}
              {inRouter ? <Link to="/settings">Settings → Connections</Link> : 'Settings → Connections'} to load videos.
            </>
          ) : (
            errorMessage(error)
          )}
        </p>
      )}

      {status === 'ready' && videos.length === 0 && <p className="yt-videos-note">No videos found for this search.</p>}

      {status === 'ready' && videos.length > 0 && (
        <>
          <p className="yt-videos-disclaimer">Search results may include other editions or similarly named games.</p>
          <div className="yt-videos-grid">
            {videos.map((video) => (
              <button
                key={video.id}
                type="button"
                className="yt-videos-card"
                onClick={() => openExternalUrl(`https://www.youtube.com/watch?v=${video.id}`)}
                aria-label={`${decodeEntities(video.title)} — ${decodeEntities(video.channelTitle)} (opens on YouTube)`}
              >
                <img src={video.thumbnailUrl} alt="" loading="lazy" className="yt-videos-thumb" />
                <span className="yt-videos-card-title">{decodeEntities(video.title)}</span>
                <span className="yt-videos-card-channel">{decodeEntities(video.channelTitle)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <button
        type="button"
        className="yt-videos-fallback"
        onClick={() => openExternalUrl(youtubeSearchUrl(title, category))}
      >
        <ExternalLink size={13} aria-hidden="true" /> Search on YouTube
      </button>
    </div>
  );
}
