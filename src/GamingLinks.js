import React, { useState, useEffect, useMemo } from 'react';
import NavBar from './NavBar';
import { ExternalLink, Plus, Trash2, RotateCcw } from 'lucide-react';
import StorageService from './services/StorageService';
import { ProgressionUnlockService } from './services/ProgressionUnlockService';
import './GamingLinks.css';

const FAVICON_BASE = 'https://www.google.com/s2/favicons?domain=';

const getFaviconUrl = (url) => {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    return `${FAVICON_BASE}${domain}&sz=64`;
  } catch {
    return null;
  }
};

const CATEGORY_COLORS = {
  Store: '#1b2838',
  Community: '#5865F2',
  Streaming: '#9146FF',
  News: '#ff4500',
  Tools: '#4ade80',
  Other: '#6b7280'
};

const getEquippedLayout = () => {
  try {
    const customization = ProgressionUnlockService.getRewardPresentationCustomization();
    const selectedId = customization?.selectedGamingLinksLayout || 'classic_grid';
    const layout = ProgressionUnlockService.getGamingLinksLayouts().find((l) => l.id === selectedId && l.unlocked);
    return layout || ProgressionUnlockService.getGamingLinksLayouts().find((l) => l.unlocked) || null;
  } catch {
    return null;
  }
};

const getEquippedFeature = () => {
  try {
    const customization = ProgressionUnlockService.getRewardPresentationCustomization();
    const selectedId = customization?.selectedGamingLinksFeatures || 'basic_hover';
    const feature = ProgressionUnlockService.getGamingLinksFeatures().find((item) => item.id === selectedId && item.unlocked);
    return feature || ProgressionUnlockService.getGamingLinksFeatures().find((item) => item.unlocked) || null;
  } catch {
    return null;
  }
};

function GamingLinks({ theme = 'dark' }) {
  const [equippedLayout, setEquippedLayout] = useState(() => getEquippedLayout());
  const [equippedFeature, setEquippedFeature] = useState(() => getEquippedFeature());

  useEffect(() => {
    const handler = () => {
      setEquippedLayout(getEquippedLayout());
      setEquippedFeature(getEquippedFeature());
    };
    window.addEventListener('gamepilot:reward-presentation-updated', handler);
    return () => window.removeEventListener('gamepilot:reward-presentation-updated', handler);
  }, []);

  const layoutId = equippedLayout?.layout || 'grid';
  const boxId = equippedLayout?.box || 'rounded';
  const featureId = equippedFeature?.id || 'basic_hover';
  const pageClassName = `gaming-links-page gl-layout-${layoutId} gl-box-${boxId} gl-feature-${featureId}`;
  const defaultLinks = useMemo(() => [
    { id: 1, name: 'Steam', url: 'https://store.steampowered.com', category: 'Store' },
    { id: 2, name: 'Epic Games', url: 'https://store.epicgames.com', category: 'Store' },
    { id: 3, name: 'GOG', url: 'https://www.gog.com', category: 'Store' },
    { id: 4, name: 'itch.io', url: 'https://itch.io', category: 'Store' },
    { id: 5, name: 'SteamDB', url: 'https://steamdb.info', category: 'Tools' },
    { id: 6, name: 'IsThereAnyDeal', url: 'https://isthereanydeal.com', category: 'Store' },
    { id: 7, name: 'HowLongToBeat', url: 'https://howlongtobeat.com', category: 'Tools' },
    { id: 8, name: 'PCGamingWiki', url: 'https://www.pcgamingwiki.com', category: 'Tools' },
    { id: 9, name: 'ProtonDB', url: 'https://www.protondb.com', category: 'Tools' },
    { id: 10, name: 'Discord', url: 'https://discord.com', category: 'Community' },
    { id: 11, name: 'Reddit', url: 'https://www.reddit.com/r/gaming', category: 'Community' },
    { id: 12, name: 'Twitch', url: 'https://www.twitch.tv', category: 'Streaming' },
    { id: 13, name: 'YouTube', url: 'https://www.youtube.com', category: 'Streaming' }
  ], []);

  const [links, setLinks] = useState([]);
  const [newLink, setNewLink] = useState({ name: '', url: '', category: 'Store' });

  // Load links from localStorage on component mount
  useEffect(() => {
    try {
      const savedLinks = StorageService.get('gamingLinks', []);
      if (savedLinks && Array.isArray(savedLinks)) {
        setLinks(savedLinks);
      } else {
        // If no saved links, use defaults
        setLinks(defaultLinks);
      }
    } catch (error) {
      console.error('Error loading gaming links:', error);
      setLinks(defaultLinks);
    }
  }, [defaultLinks]);

  // Save links to localStorage whenever links change
  useEffect(() => {
    if (links.length > 0) {
      try {
        StorageService.set('gamingLinks', links);
      } catch (error) {
        console.error('Error saving gaming links:', error);
      }
    }
  }, [links]);

  const addLink = () => {
    if (newLink.name && newLink.url) {
      try {
        const safeName = String(newLink.name).trim();
        const safeUrl = String(newLink.url).trim();
        const safeCategory = String(newLink.category || 'Store').trim();
        
        if (safeName && safeUrl) {
          setLinks([...links, { name: safeName, url: safeUrl, category: safeCategory, id: Date.now() }]);
          setNewLink({ name: '', url: '', category: 'Store' });
        }
      } catch (error) {
        console.error('Error adding link:', error);
      }
    }
  };

  const removeLink = (id) => {
    if (id != null && Number.isFinite(id)) {
      setLinks(links.filter(link => link && link.id !== id));
    }
  };

  const restoreDefaults = () => {
    setLinks(defaultLinks);
  };

  const groupedLinks = useMemo(() => {
    const groups = {};
    links.forEach(link => {
      if (!groups[link.category]) groups[link.category] = [];
      groups[link.category].push(link);
    });
    return groups;
  }, [links]);

  return (
    <div className={`${pageClassName} gl-page`}>
      <NavBar />
      <div className="gl-container">
        <div className="gl-page-header">
          <h1>Gaming Links</h1>
          <p>Your personal collection of gaming sites and resources</p>
        </div>

        {/* Add new link form */}
        <div className="gl-form-card">
          <h3>Add New Link</h3>
          <div className="gl-form-row">
            <input
              type="text"
              placeholder="Link name"
              value={newLink.name}
              onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
              className="gl-form-input name"
            />
            <input
              type="url"
              placeholder="https://example.com"
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
              className="gl-form-input url"
            />
            <select
              value={newLink.category}
              onChange={(e) => setNewLink({ ...newLink, category: e.target.value })}
              className="gl-form-select"
            >
              <option value="Store">Store</option>
              <option value="Community">Community</option>
              <option value="Streaming">Streaming</option>
              <option value="News">News</option>
              <option value="Tools">Tools</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <button
            onClick={addLink}
            disabled={!newLink.name || !newLink.url}
            className="gl-form-btn"
          >
            <Plus size={18} /> Add Link
          </button>
        </div>

        {/* Links by category */}
        {Object.entries(groupedLinks).map(([category, categoryLinks]) => (
          <div key={category} className="gl-category">
            <div className="gl-category-header">
              <span
                className="gl-category-badge"
                style={{ backgroundColor: CATEGORY_COLORS[category] || CATEGORY_COLORS.Other }}
              >
                {category}
              </span>
              <span className="gl-category-count">
                {categoryLinks.length} link{categoryLinks.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="gl-link-grid">
              {categoryLinks.map((link, linkIdx) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`gl-link-card${layoutId === 'hero' && linkIdx === 0 ? ' gl-hero' : ''}`}
                >
                  <img
                    src={getFaviconUrl(link.url)}
                    alt=""
                    onError={(e) => { e.target.style.display = 'none'; }}
                    className="gl-link-favicon"
                  />
                  <div className="gl-link-body">
                    <div className="gl-link-name">{link.name}</div>
                    <div className="gl-link-domain">
                      {link.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeLink(link.id);
                    }}
                    className="gl-link-delete"
                  >
                    <Trash2 size={16} />
                  </button>
                  <ExternalLink size={14} className="gl-link-external-icon" />
                </a>
              ))}
            </div>
          </div>
        ))}

        {/* Control buttons */}
        <div className="gl-controls">
          <button onClick={restoreDefaults} className="gl-btn-secondary">
            <RotateCcw size={16} /> Restore Defaults
          </button>

          {links.length > 0 && (
            <button onClick={() => setLinks([])} className="gl-btn-danger">
              Clear All Links
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GamingLinks;
