import React, { useState, useEffect, useMemo } from 'react';
import NavBar from './NavBar';
import { ExternalLink, Plus, Trash2, RotateCcw } from 'lucide-react';

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

function GamingLinks({ theme = 'dark' }) {
  const defaultLinks = useMemo(() => [
    { id: 1, name: 'Steam', url: 'https://store.steampowered.com', category: 'Store' },
    { id: 2, name: 'Epic Games', url: 'https://store.epicgames.com', category: 'Store' },
    { id: 3, name: 'GOG', url: 'https://www.gog.com', category: 'Store' },
    { id: 4, name: 'itch.io', url: 'https://itch.io', category: 'Indie' },
    { id: 5, name: 'Discord', url: 'https://discord.com', category: 'Community' },
    { id: 6, name: 'Reddit', url: 'https://www.reddit.com/r/gaming', category: 'Community' },
    { id: 7, name: 'Twitch', url: 'https://www.twitch.tv', category: 'Streaming' },
    { id: 8, name: 'YouTube', url: 'https://www.youtube.com', category: 'Streaming' }
  ], []);

  const [links, setLinks] = useState([]);
  const [newLink, setNewLink] = useState({ name: '', url: '', category: 'Store' });

  // Load links from localStorage on component mount
  useEffect(() => {
    try {
      const savedLinks = localStorage.getItem('gamingLinks');
      if (savedLinks) {
        const parsed = JSON.parse(savedLinks);
        if (Array.isArray(parsed)) {
          setLinks(parsed);
        } else {
          setLinks(defaultLinks);
        }
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
        localStorage.setItem('gamingLinks', JSON.stringify(links));
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
      setLinks(links.filter(link => link && link.id === id));
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
    <div style={{ backgroundColor: 'var(--primary)', color: 'var(--text)', minHeight: '100vh' }}>
      <NavBar />
      <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700' }}>Gaming Links</h1>
          <p style={{ margin: 0, color: 'var(--text)', opacity: 0.7, fontSize: '15px' }}>
            Your personal collection of gaming sites and resources
          </p>
        </div>

        {/* Add new link form */}
        <div style={{ 
          backgroundColor: 'var(--card)', 
          padding: '24px', 
          borderRadius: '12px', 
          marginBottom: '32px',
          border: '1px solid var(--border)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Add New Link</h3>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Link name"
              value={newLink.name}
              onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
              style={{ 
                flex: '1 1 180px',
                padding: '12px 16px', 
                borderRadius: '8px', 
                border: '1px solid var(--border)',
                backgroundColor: 'var(--input)',
                color: 'var(--text)',
                fontSize: '14px'
              }}
            />
            <input
              type="url"
              placeholder="https://example.com"
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
              style={{ 
                flex: '2 1 280px',
                padding: '12px 16px', 
                borderRadius: '8px', 
                border: '1px solid var(--border)',
                backgroundColor: 'var(--input)',
                color: 'var(--text)',
                fontSize: '14px'
              }}
            />
            <select
              value={newLink.category}
              onChange={(e) => setNewLink({ ...newLink, category: e.target.value })}
              style={{ 
                padding: '12px 16px', 
                borderRadius: '8px', 
                border: '1px solid var(--border)',
                backgroundColor: 'var(--input)',
                color: 'var(--text)',
                fontSize: '14px',
                minWidth: '140px'
              }}
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
            style={{
              backgroundColor: newLink.name && newLink.url ? 'var(--button-primary-bg)' : 'var(--border)',
              color: '#ffffff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: newLink.name && newLink.url ? 'pointer' : 'not-allowed',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Plus size={18} /> Add Link
          </button>
        </div>

        {/* Links by category */}
        {Object.entries(groupedLinks).map(([category, categoryLinks]) => (
          <div key={category} style={{ marginBottom: '32px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--border)'
            }}>
              <span style={{ 
                backgroundColor: CATEGORY_COLORS[category] || CATEGORY_COLORS.Other,
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#fff'
              }}>
                {category}
              </span>
              <span style={{ color: 'var(--text)', opacity: 0.5, fontSize: '13px' }}>
                {categoryLinks.length} link{categoryLinks.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: '16px' 
            }}>
              {categoryLinks.map(link => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = 'var(--button-primary-bg)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <img 
                    src={getFaviconUrl(link.url)} 
                    alt=""
                    onError={(e) => { e.target.style.display = 'none'; }}
                    style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '8px',
                      objectFit: 'cover',
                      backgroundColor: '#fff'
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      color: 'var(--text)', 
                      fontWeight: '600', 
                      fontSize: '15px',
                      marginBottom: '4px'
                    }}>
                      {link.name}
                    </div>
                    <div style={{ 
                      color: 'var(--text)', 
                      opacity: 0.5, 
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {link.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeLink(link.id);
                    }}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--text)',
                      opacity: 0.3,
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.color = '#dc3545';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.opacity = '0.3';
                      e.currentTarget.style.color = 'var(--text)';
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                  <ExternalLink size={14} style={{ color: 'var(--text)', opacity: 0.3 }} />
                </a>
              ))}
            </div>
          </div>
        ))}

        {/* Control buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '32px', flexWrap: 'wrap' }}>
          <button
            onClick={restoreDefaults}
            style={{
              backgroundColor: 'var(--card)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              padding: '12px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <RotateCcw size={16} /> Restore Defaults
          </button>

          {links.length > 0 && (
            <button
              onClick={() => setLinks([])}
              style={{
                backgroundColor: 'transparent',
                color: '#dc3545',
                border: '1px solid #dc3545',
                padding: '12px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Clear All Links
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GamingLinks;
