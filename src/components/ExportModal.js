import React, { useState } from 'react';
import { Download, FileText, X, Grid, List, Image, Trophy, User, Home } from 'lucide-react';
import html2canvas from 'html2canvas';
import './ExportModal.css';

const ExportModal = ({ library, theme, isOpen, onClose }) => {
  const [exportFormat, setExportFormat] = useState('html');
  const [layout, setLayout] = useState('grid-vertical');
  const [includeImages, setIncludeImages] = useState(true);
  const [includeTime, setIncludeTime] = useState(true);
  const [selectedPage, setSelectedPage] = useState('library');

  const formatTime = (minutes) => {
    if (!minutes || minutes === 0) return 'Never played';
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (days > 0) return `${days}d ${remainingHours}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const generateLibraryHTML = () => {
    const [viewType, orientation] = layout.split('-');
    const isGrid = viewType === 'grid';
    const isVertical = orientation === 'vertical';
    
    let layoutClass = '';
    if (isGrid && isVertical) layoutClass = 'grid-vertical';
    else if (isGrid && !isVertical) layoutClass = 'grid-horizontal';
    else if (!isGrid && isVertical) layoutClass = 'list-vertical';
    else layoutClass = 'list-horizontal';
    
    return `
      <div class="game-export ${layoutClass}">
        <div class="export-header">
          <h1>🎮 GamePilot Library</h1>
          <div class="export-stats">
            <div class="stat">
              <span class="stat-number">${library.length}</span>
              <span class="stat-label">Total Games</span>
            </div>
            <div class="stat">
              <span class="stat-number">${library.reduce((sum, game) => sum + (game.time_played || 0), 0)}</span>
              <span class="stat-label">Total Minutes</span>
            </div>
            <div class="stat">
              <span class="stat-number">${library.filter(g => g.time_played > 0).length}</span>
              <span class="stat-label">Games Played</span>
            </div>
          </div>
        </div>
        <div class="games-container ${layoutClass}-layout">
          ${library.map((game, index) => `
            <div class="export-game-card ${isGrid ? 'grid-card' : 'list-card'}">
              ${includeImages && game.iconUrl ? `
                <div class="game-image">
                  <img src="${game.iconUrl}" alt="${game.name}" />
                </div>
              ` : ''}
              <div class="game-details">
                <h3>${game.name}</h3>
                <div class="game-meta">
                  <span class="platform-tag">${game.platform || 'Unknown'}</span>
                  ${game.mood ? `<span class="mood-tag">${game.mood}</span>` : ''}
                  ${game.genres && game.genres.length > 0 ? `
                    <span class="genre-tag">${game.genres[0]}</span>
                  ` : ''}
                </div>
                ${includeTime ? `
                  <div class="game-time">
                    🕐
                    <span>${formatTime(game.time_played)}</span>
                  </div>
                ` : ''}
                ${game.launch_count ? `
                  <div class="game-launches">
                    <span>Launched ${game.launch_count} times</span>
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  const exportToHTML = () => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>GamePilot ${selectedPage.charAt(0).toUpperCase() + selectedPage.slice(1)} Export</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              background: var(--bg-primary);
              color: var(--text);
              padding: 20px;
              line-height: 1.6;
            }
            .export-header { text-align: center; margin-bottom: 30px; }
            .export-header h1 { font-size: 2.5em; margin-bottom: 20px; }
            .export-stats { 
              display: flex; 
              justify-content: center; 
              gap: 30px; 
              margin-bottom: 30px; 
              flex-wrap: wrap;
            }
            .stat { 
              text-align: center; 
              padding: 15px; 
              background: var(--card);
              border-radius: 10px;
              min-width: 120px;
            }
            .stat-number { display: block; font-size: 2em; font-weight: bold; }
            .stat-label { display: block; opacity: 0.7; margin-top: 5px; }
            .vertical-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
            .horizontal-layout { display: flex; flex-direction: column; gap: 15px; }
            .export-game-card { 
              background: var(--card);
              border: 1px solid var(--border-color);
              border-radius: 12px; 
              padding: 15px; 
              display: flex; 
              gap: 15px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .game-image { 
              width: 80px; 
              height: 80px; 
              border-radius: 8px; 
              overflow: hidden; 
              flex-shrink: 0;
            }
            .game-image img { width: 100%; height: 100%; object-fit: cover; }
            .game-details { flex: 1; }
            .game-details h3 { margin: 0 0 10px 0; font-size: 1.2em; }
            .game-meta { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
            .platform-tag, .mood-tag, .genre-tag { 
              padding: 4px 8px; 
              border-radius: 12px; 
              font-size: 0.8em;
              background: var(--bg-secondary);
            }
            .game-time, .game-launches { 
              display: flex; 
              align-items: center; 
              gap: 5px; 
              font-size: 0.9em;
              opacity: 0.8;
            }
            @media print { body { padding: 10px; } }
          </style>
        </head>
        <body>
          ${generateLibraryHTML(layout === 'vertical')}
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gamepilot-${selectedPage}-${layout}-${new Date().toISOString().split('T')[0]}.html`;
    link.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Platform', 'Time Played (minutes)', 'Launch Count', 'Genres', 'Mood', 'Last Played'];
    const csvContent = [
      headers.join(','),
      ...library.map(game => [
        `"${game.name.replace(/"/g, '""')}"`,
        game.platform || 'Unknown',
        game.time_played || 0,
        game.launch_count || 0,
        `"${game.genres?.join('; ') || ''}"`,
        game.mood || '',
        game.last_played ? new Date(game.last_played).toLocaleDateString() : 'Never'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gamepilot-${selectedPage}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const exportToJSON = () => {
    try {
      console.log('Exporting library with', library.length, 'games');
      
      if (!library || library.length === 0) {
        console.warn('No games to export');
        alert('No games in library to export');
        return;
      }

      const exportData = library.map(game => ({
        name: game.name,
        platform: game.platform,
        time_played_minutes: game.time_played || 0,
        launch_count: game.launch_count || 0,
        genres: game.genres || [],
        mood: game.mood,
        last_played: game.last_played || null,
        icon_url: includeImages ? game.iconUrl : undefined
      }));

      console.log('Export data prepared:', exportData.length, 'items');

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gamepilot-${selectedPage}-${new Date().toISOString().split('T')[0]}.json`;
      
      console.log('Triggering download:', link.download);
      
      // Try multiple methods to trigger the download
      document.body.appendChild(link);
      link.click();
      
      // Fallback method
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      console.log('Export completed successfully');
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error.message}`);
    }
  };

  const exportToImage = async (format) => {
    // Create a temporary div to render the HTML content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = generateLibraryHTML();
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '1200px';
    document.body.appendChild(tempDiv);

    try {
      // Use html2canvas to capture the content as an image
      const canvas = await html2canvas(tempDiv, {
        width: 1200,
        height: Math.max(800, library.length * 100 + 200), // Dynamic height based on content
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true
      });

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `gamepilot-${selectedPage}-${layout}-${new Date().toISOString().split('T')[0]}.${format.toLowerCase()}`;
        link.click();
        URL.revokeObjectURL(url);
        onClose();
      }, `image/${format.toLowerCase()}`, 0.95);
    } catch (error) {
      console.error('Image export failed:', error);
      alert('Failed to export image. Please try again.');
    } finally {
      // Clean up temporary element
      document.body.removeChild(tempDiv);
    }
  };

  const exportToPNG = () => exportToImage('PNG');
  const exportToJPEG = () => exportToImage('JPEG');

  const handleExport = () => {
    console.log('Export button clicked, format:', exportFormat, 'page:', selectedPage);
    
    switch (exportFormat) {
      case 'html':
        console.log('Exporting as HTML');
        exportToHTML();
        break;
      case 'csv':
        console.log('Exporting as CSV');
        exportToCSV();
        break;
      case 'json':
        console.log('Exporting as JSON');
        exportToJSON();
        break;
      case 'png':
        console.log('Exporting as PNG');
        exportToPNG();
        break;
      case 'jpeg':
        console.log('Exporting as JPEG');
        exportToJPEG();
        break;
      default:
        console.log('Defaulting to HTML export');
        exportToHTML();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="export-modal-overlay">
      <div className="export-modal">
        <div className="export-modal-header">
          <h2>Export GamePilot Data</h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="export-modal-content">
          {/* Page Selection */}
          <div className="export-section">
            <h3>
              <FileText size={18} />
              Select Page to Export
            </h3>
            <div className="page-options">
              <button 
                className={`page-option ${selectedPage === 'library' ? 'active' : ''}`}
                onClick={() => setSelectedPage('library')}
              >
                <Grid size={16} />
                Library
              </button>
              <button 
                className={`page-option ${selectedPage === 'stats' ? 'active' : ''}`}
                onClick={() => setSelectedPage('stats')}
              >
                <Trophy size={16} />
                Stats
              </button>
              <button 
                className={`page-option ${selectedPage === 'achievements' ? 'active' : ''}`}
                onClick={() => setSelectedPage('achievements')}
              >
                <Trophy size={16} />
                Achievements
              </button>
              <button 
                className={`page-option ${selectedPage === 'profile' ? 'active' : ''}`}
                onClick={() => setSelectedPage('profile')}
              >
                <User size={16} />
                Profile
              </button>
              <button 
                className={`page-option ${selectedPage === 'home' ? 'active' : ''}`}
                onClick={() => setSelectedPage('home')}
              >
                <Home size={16} />
                Home
              </button>
            </div>
          </div>

          {/* Layout Options */}
          <div className="export-section">
            <h3>
              <Grid size={18} />
              Layout Options
            </h3>
            <div className="layout-options">
              <button 
                className={`layout-option ${layout === 'grid-vertical' ? 'active' : ''}`}
                onClick={() => setLayout('grid-vertical')}
              >
                <Grid size={16} />
                Grid Vertical
              </button>
              <button 
                className={`layout-option ${layout === 'grid-horizontal' ? 'active' : ''}`}
                onClick={() => setLayout('grid-horizontal')}
              >
                <Grid size={16} />
                Grid Horizontal
              </button>
              <button 
                className={`layout-option ${layout === 'list-vertical' ? 'active' : ''}`}
                onClick={() => setLayout('list-vertical')}
              >
                <List size={16} />
                List Vertical
              </button>
              <button 
                className={`layout-option ${layout === 'list-horizontal' ? 'active' : ''}`}
                onClick={() => setLayout('list-horizontal')}
              >
                <List size={16} />
                List Horizontal
              </button>
            </div>
          </div>

          {/* Export Options */}
          <div className="export-section">
            <h3>
              <Image size={18} />
              Export Options
            </h3>
            <div className="export-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={includeImages}
                  onChange={(e) => setIncludeImages(e.target.checked)}
                />
                <span>Include Game Images</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={includeTime}
                  onChange={(e) => setIncludeTime(e.target.checked)}
                />
                <span>Include Time Played</span>
              </label>
            </div>
          </div>

          {/* Format Selection */}
          <div className="export-section">
            <h3>
              <Download size={18} />
              Export Format
            </h3>
            <div className="format-options">
              <button 
                className={`format-option ${exportFormat === 'html' ? 'active' : ''}`}
                onClick={() => setExportFormat('html')}
              >
                <FileText size={16} />
                HTML
              </button>
              <button 
                className={`format-option ${exportFormat === 'png' ? 'active' : ''}`}
                onClick={() => setExportFormat('png')}
              >
                <Image size={16} />
                PNG
              </button>
              <button 
                className={`format-option ${exportFormat === 'jpeg' ? 'active' : ''}`}
                onClick={() => setExportFormat('jpeg')}
              >
                <Image size={16} />
                JPEG
              </button>
              <button 
                className={`format-option ${exportFormat === 'csv' ? 'active' : ''}`}
                onClick={() => setExportFormat('csv')}
              >
                <FileText size={16} />
                CSV
              </button>
              <button 
                className={`format-option ${exportFormat === 'json' ? 'active' : ''}`}
                onClick={() => setExportFormat('json')}
              >
                <FileText size={16} />
                JSON
              </button>
            </div>
          </div>
        </div>

        <div className="export-modal-footer">
          <button className="export-button primary" onClick={handleExport}>
            <Download size={18} />
            Export {selectedPage.charAt(0).toUpperCase() + selectedPage.slice(1)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
