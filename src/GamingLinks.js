import React, { useState, useEffect, useMemo } from 'react';
import NavBar from './NavBar';

function GamingLinks({ theme = 'dark' }) {
  // Original default links
  const defaultLinks = useMemo(() => [
    { id: 1, name: 'Steam', url: 'https://store.steampowered.com', category: 'Store' },
    { id: 2, name: 'Epic Games', url: 'https://store.epicgames.com', category: 'Store' },
    { id: 3, name: 'GOG', url: 'https://www.gog.com', category: 'Store' },
    { id: 4, name: 'itch.io', url: 'https://itch.io', category: 'Indie' },
    { id: 5, name: 'Discord', url: 'https://discord.com', category: 'Community' },
    { id: 6, name: 'Reddit', url: 'https://www.reddit.com/r/gaming', category: 'Community' },
    { id: 7, name: 'Twitch', url: 'https://www.twitch.tv', category: 'Streaming' },
    { id: 8, name: 'YouTube Gaming', url: 'https://www.youtube.com/gaming', category: 'Streaming' }
  ], []);

  const [links, setLinks] = useState([]);
  const [newLink, setNewLink] = useState({ name: '', url: '', category: 'Store' });

  // Load links from localStorage on component mount
  useEffect(() => {
    const savedLinks = localStorage.getItem('gamingLinks');
    if (savedLinks) {
      setLinks(JSON.parse(savedLinks));
    } else {
      // If no saved links, use defaults
      setLinks(defaultLinks);
    }
  }, [defaultLinks]);

  // Save links to localStorage whenever links change
  useEffect(() => {
    if (links.length > 0) {
      localStorage.setItem('gamingLinks', JSON.stringify(links));
    }
  }, [links]);

  const addLink = () => {
    if (newLink.name && newLink.url) {
      setLinks([...links, { ...newLink, id: Date.now() }]);
      setNewLink({ name: '', url: '', category: 'Store' });
    }
  };

  const removeLink = (id) => {
    setLinks(links.filter(link => link.id !== id));
  };

  const restoreDefaults = () => {
    setLinks(defaultLinks);
  };

  return (
    <div style={{ backgroundColor: 'var(--primary)', color: 'var(--text)', minHeight: '100vh' }}>
      <NavBar />
      <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Gaming Links</h1>
        <p style={{ marginBottom: '30px', color: 'var(--text)', opacity: 0.8 }}>
          Your personal collection of gaming links and resources. Add your favorite sites!
        </p>

        {/* Add new link form */}
        <div style={{ 
          backgroundColor: 'var(--card)', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '30px',
          border: '1px solid var(--border)'
        }}>
          <h3>Add New Link</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Link name"
              value={newLink.name}
              onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
              style={{ 
                flex: 1, 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid var(--border)',
                backgroundColor: 'var(--input)',
                color: 'var(--text)',
                minWidth: '200px'
              }}
            />
            <input
              type="url"
              placeholder="https://example.com"
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
              style={{ 
                flex: 2, 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid var(--border)',
                backgroundColor: 'var(--input)',
                color: 'var(--text)',
                minWidth: '300px'
              }}
            />
            <select
              value={newLink.category}
              onChange={(e) => setNewLink({ ...newLink, category: e.target.value })}
              style={{ 
                padding: '8px', 
                borderRadius: '4px', 
                border: '1px solid var(--border)',
                backgroundColor: 'var(--input)',
                color: 'var(--text)'
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
            style={{
              backgroundColor: 'var(--button-primary-bg)',
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Add Link
          </button>
        </div>

        {/* Links grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '20px' 
        }}>
          {links.map(link => (
            <div key={link.id} style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h3 style={{ margin: 0, color: 'var(--text)' }}>{link.name}</h3>
                <button
                  onClick={() => removeLink(link.id)}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Delete
                </button>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <span style={{ 
                  backgroundColor: 'var(--button-accent-bg)', 
                  color: 'var(--button-accent-text)', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  fontSize: '12px' 
                }}>
                  {link.category}
                </span>
              </div>
              <a 
                href={link.url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  color: 'var(--button-primary-bg)',
                  textDecoration: 'none',
                  wordBreak: 'break-all'
                }}
              >
                {link.url}
              </a>
            </div>
          ))}
        </div>

        {/* Control buttons */}
        <div style={{ display: 'flex', gap: '15px', marginTop: '30px', flexWrap: 'wrap' }}>
          <button
            onClick={restoreDefaults}
            style={{
              backgroundColor: 'var(--button-secondary-bg)',
              color: 'var(--button-secondary-text)',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Restore Defaults
          </button>

          {links.length > 0 && (
            <button
              onClick={() => setLinks([])}
              style={{
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
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
