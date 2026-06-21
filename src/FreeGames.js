import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, RefreshCw, ExternalLink, Gift, Cloud, Gamepad2 } from 'lucide-react';
import NavBar from './NavBar';
import { FreeGameRadar } from './services/FreeGameRadar';
import LazyImage from './components/LazyImage';
import './FreeGames.css';

function formatCountdown(endDate) {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = Date.now();
  const diff = end.getTime() - now;
  if (diff <= 0) return 'Ending now';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

function getSourceColor(source) {
  switch (source) {
    case 'Epic': return '#0078f2';
    case 'Steam': return '#1b2838';
    case 'GOG': return '#86328a';
    default: return '#6366f1';
  }
}

function getSourceIcon(source) {
  switch (source) {
    case 'Epic': return <Gamepad2 size={14} />;
    case 'Steam': return <Cloud size={14} />;
    case 'GOG': return <Gift size={14} />;
    default: return <Gift size={14} />;
  }
}

export default function FreeGames() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  const loadGames = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const data = await FreeGameRadar.getFreeGames({ forceRefresh: force });
      setGames(data);
    } catch {
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const sources = useMemo(() => {
    const set = new Set(games.map((g) => g.source));
    return ['All', ...Array.from(set).sort()];
  }, [games]);

  const filteredGames = useMemo(() => {
    if (filter === 'All') return games;
    return games.filter((g) => g.source === filter);
  }, [games, filter]);

  return (
    <div className="freegames-page">
      <NavBar />
      <div className="fg-top-nav">
        <div className="fg-top-nav-left">
          <button className="fg-nav-home-btn" onClick={() => navigate('/')} title="Home">
            <Home size={18} />
          </button>
          <button className="fg-nav-back-btn" onClick={() => navigate(-1)} title="Back">
            <ArrowLeft size={18} />
          </button>
        </div>
        <div className="fg-top-nav-title">Free Games</div>
        <div className="fg-top-nav-right">
          <button className="fg-nav-refresh-btn" disabled={loading} onClick={() => loadGames(true)} title="Refresh">
            <RefreshCw size={16} className={loading ? 'fg-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="fg-content">
        <div className="fg-header">
          <h1>Free Games</h1>
          <p>Claim free-to-keep games before they expire</p>
        </div>

        {sources.length > 1 && (
          <div className="fg-filter-bar">
            {sources.map((src) => (
              <button
                key={src}
                className={`fg-filter-btn ${filter === src ? 'active' : ''}`}
                onClick={() => setFilter(src)}
              >
                {src === 'All' ? 'All Sources' : src}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="fg-empty">
            <RefreshCw size={40} className="fg-spin" />
            <p>Scanning for free games...</p>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="fg-empty">
            <Gift size={48} />
            <p>No free games found right now.</p>
            <p className="fg-empty-hint">Check back later or refresh to scan again.</p>
          </div>
        ) : (
          <div className="fg-grid">
            {filteredGames.map((game) => {
              const countdown = formatCountdown(game.endDate);
              return (
                <a
                  key={game.id}
                  href={game.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fg-card"
                >
                  <div className="fg-card-image">
                    {game.image ? (
                      <LazyImage src={game.image} alt={game.title} />
                    ) : (
                      <div className="fg-card-placeholder">
                        <Gift size={32} />
                      </div>
                    )}
                    <span
                      className="fg-card-badge"
                      style={{ background: getSourceColor(game.source) }}
                    >
                      {getSourceIcon(game.source)} {game.source}
                    </span>
                    {game.type && (
                      <span className="fg-card-type">{game.type.replace(/-/g, ' ')}</span>
                    )}
                    {countdown && (
                      <span className="fg-card-countdown">{countdown}</span>
                    )}
                  </div>
                  <div className="fg-card-body">
                    <h3 className="fg-card-title">{game.title}</h3>
                    <p className="fg-card-desc">{game.description}</p>
                    <div className="fg-card-footer">
                      <span className="fg-card-claim">
                        <ExternalLink size={14} /> Claim
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
