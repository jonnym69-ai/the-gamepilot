import React, { useState, useRef, useEffect } from 'react';
import { X, Download, Share2, DollarSign, PieChart, TrendingUp, Copy, Image as ImageIcon } from 'lucide-react';
import { LibraryValueService } from '../services/LibraryValueService';
import './LibraryValueModal.css';

const LibraryValueModal = ({ library, isOpen, onClose, username = 'Gamer' }) => {
  const [libraryValue, setLibraryValue] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isOpen && library) {
      const value = LibraryValueService.calculateLibraryValue(library);
      setLibraryValue(value);
    }
  }, [isOpen, library]);

  const handleExportCSV = () => {
    if (!libraryValue) return;
    
    const csv = LibraryValueService.generateValueCSV(libraryValue);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gamepilot-library-value-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleShareText = () => {
    if (!libraryValue) return;
    
    const text = LibraryValueService.generateShareText(libraryValue, username);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateShareImage = () => {
    if (!libraryValue || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = 1080;
    const height = 1080;
    
    canvas.width = width;
    canvas.height = height;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1b2838');
    gradient.addColorStop(0.5, '#2a3f5f');
    gradient.addColorStop(1, '#1b2838');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add subtle pattern
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 20; i++) {
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 100 + 50,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${username}'s Game Library`, width / 2, 100);

    // Main value (big number)
    ctx.fillStyle = '#ff6b35';
    ctx.font = 'bold 120px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;
    ctx.fillText(`$${libraryValue.totalValue.toFixed(0)}`, width / 2, 280);
    ctx.shadowColor = 'transparent';

    // Label
    ctx.fillStyle = '#8892b0';
    ctx.font = '32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Total Library Value', width / 2, 330);

    // Stats boxes
    const boxY = 400;
    const boxHeight = 150;
    const boxWidth = 280;
    const gap = 40;
    const startX = (width - (boxWidth * 3 + gap * 2)) / 2;

    const stats = [
      { label: 'Total Games', value: libraryValue.totalGames },
      { label: 'Steam Games', value: libraryValue.steamGames },
      { label: 'Non-Steam', value: libraryValue.nonSteamGames }
    ];

    stats.forEach((stat, i) => {
      const x = startX + i * (boxWidth + gap);
      
      // Box background
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.roundRect(x, boxY, boxWidth, boxHeight, 16);
      ctx.fill();
      
      // Value
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(stat.value.toString(), x + boxWidth / 2, boxY + 70);
      
      // Label
      ctx.fillStyle = '#8892b0';
      ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(stat.label, x + boxWidth / 2, boxY + 110);
    });

    // Platform breakdown
    const platformY = 600;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Platform Breakdown', width / 2, platformY);

    let platformX = 100;
    let platformRow = 0;
    Object.entries(libraryValue.platformBreakdown).forEach(([platform, data], i) => {
      if (i > 0 && i % 3 === 0) {
        platformX = 100;
        platformRow++;
      }
      
      const y = platformY + 60 + platformRow * 100;
      
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.roundRect(platformX, y - 30, 300, 70, 12);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(platform, platformX + 20, y + 5);
      
      ctx.fillStyle = '#ff6b35';
      ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`$${data.value.toFixed(0)}`, platformX + 270, y + 5);
      
      ctx.fillStyle = '#8892b0';
      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`${data.count} games`, platformX + 270, y + 25);
      
      platformX += 340;
    });

    // Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6b35';
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('GamePilot', width / 2, height - 60);
    
    ctx.fillStyle = '#8892b0';
    ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Your Ultimate Game Library', width / 2, height - 30);

    // Export
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gamepilot-library-value-${username}-${new Date().toISOString().split('T')[0]}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  if (!isOpen || !libraryValue) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="library-value-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <DollarSign size={28} />
            Library Value Calculator
          </h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-tabs">
          <button 
            className={activeTab === 'overview' ? 'active' : ''}
            onClick={() => setActiveTab('overview')}
          >
            <TrendingUp size={18} />
            Overview
          </button>
          <button 
            className={activeTab === 'breakdown' ? 'active' : ''}
            onClick={() => setActiveTab('breakdown')}
          >
            <PieChart size={18} />
            Breakdown
          </button>
          <button 
            className={activeTab === 'games' ? 'active' : ''}
            onClick={() => setActiveTab('games')}
          >
            <DollarSign size={18} />
            Games List
          </button>
        </div>

        <div className="modal-content">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="big-value">
                <span className="currency">$</span>
                <span className="amount">{libraryValue.totalValue.toFixed(2)}</span>
              </div>
              <p className="value-label">Total Library Value</p>

              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-value">{libraryValue.totalGames}</span>
                  <span className="stat-label">Total Games</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">${libraryValue.averageValue.toFixed(2)}</span>
                  <span className="stat-label">Average Value</span>
                </div>
                <div className="stat-card steam">
                  <span className="stat-value">{libraryValue.steamGames}</span>
                  <span className="stat-label">Steam Games</span>
                  <span className="stat-sub">${libraryValue.steamValue.toFixed(2)}</span>
                </div>
                <div className="stat-card non-steam">
                  <span className="stat-value">{libraryValue.nonSteamGames}</span>
                  <span className="stat-label">Non-Steam Games</span>
                  <span className="stat-sub">${libraryValue.nonSteamValue.toFixed(2)}</span>
                </div>
              </div>

              <div className="action-buttons">
                <button onClick={handleExportCSV} className="btn-primary">
                  <Download size={18} />
                  Export CSV
                </button>
                <button onClick={handleShareText} className="btn-secondary">
                  <Copy size={18} />
                  {copied ? 'Copied!' : 'Copy Text'}
                </button>
                <button onClick={generateShareImage} className="btn-secondary">
                  <ImageIcon size={18} />
                  Share Image
                </button>
              </div>
            </div>
          )}

          {activeTab === 'breakdown' && (
            <div className="breakdown-tab">
              <h3>Platform Breakdown</h3>
              <div className="breakdown-list">
                {Object.entries(libraryValue.platformBreakdown).map(([platform, data]) => (
                  <div key={platform} className="breakdown-item">
                    <div className="platform-info">
                      <span className="platform-name">{platform}</span>
                      <span className="platform-count">{data.count} games</span>
                    </div>
                    <div className="platform-bar">
                      <div 
                        className="platform-fill"
                        style={{ width: `${(data.value / libraryValue.totalValue) * 100}%` }}
                      />
                    </div>
                    <span className="platform-value">${data.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <h3>Price Tier Breakdown</h3>
              <div className="breakdown-list">
                {Object.entries(libraryValue.tierBreakdown).map(([tier, data]) => (
                  <div key={tier} className="breakdown-item">
                    <div className="platform-info">
                      <span className="platform-name">{data.label}</span>
                      <span className="platform-count">{data.count} games</span>
                    </div>
                    <div className="platform-bar">
                      <div 
                        className="platform-fill tier"
                        style={{ width: `${(data.value / libraryValue.totalValue) * 100}%` }}
                      />
                    </div>
                    <span className="platform-value">${data.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'games' && (
            <div className="games-tab">
              <div className="games-list">
                {libraryValue.games.slice(0, 50).map((game, index) => (
                  <div key={index} className="game-value-item">
                    <span className="game-rank">#{index + 1}</span>
                    {game.iconUrl && (
                      <img src={game.iconUrl} alt={game.name} className="game-icon" />
                    )}
                    <div className="game-info">
                      <span className="game-name">{game.name}</span>
                      <span className="game-platform">{game.platform}</span>
                      {game.hasActualPrice && <span className="price-badge actual">Steam Price</span>}
                    </div>
                    <span className="game-value">${game.estimatedValue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
};

export default LibraryValueModal;
