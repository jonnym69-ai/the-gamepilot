import React, { useState, useRef } from 'react';
import { Crown, Download, X, Image, Palette } from 'lucide-react';
import { AchievementTracker } from '../AchievementSystem';
import StorageService from '../services/StorageService';
import './cinematicExport.css';

const SUPPORT_TIER_WEIGHT = {
  Bronze: 1,
  Silver: 2,
  Gold: 3,
  Platinum: 4
};

const resolveHighestSupportTier = (tiers = []) => {
  return tiers
    .filter((tier) => typeof tier === 'string')
    .sort((left, right) => (SUPPORT_TIER_WEIGHT[right] || 0) - (SUPPORT_TIER_WEIGHT[left] || 0))[0] || null;
};

const CinematicExport = ({ library, theme, isOpen, onClose }) => {
  const canvasRef = useRef(null);
  const [cardFormat, setCardFormat] = useState('vertical');
  const [isGenerating, setIsGenerating] = useState(false);
  const [backgroundStyle, setBackgroundStyle] = useState('blurred');
  const founderProfile = (() => {
    const savedUsername = StorageService.getString('profileUsername', '');
    const userFounders = StorageService.get('userFounders', []);

    const localFounder = userFounders.find((founder) => founder.name?.toLowerCase() === savedUsername.trim().toLowerCase()) || null;
    const boostTier = AchievementTracker.getPatreonBoostProfile().tier || null;
    const tier = resolveHighestSupportTier([localFounder?.tier, boostTier]);

    return {
      name: savedUsername || 'Pilot',
      tier,
      isFounder: Boolean(tier)
    };
  })();

  // Get theme colors
  const getThemeColors = () => {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    
    return {
      primary: style.getPropertyValue('--accent-color')?.trim() || '#ff6b35',
      secondary: style.getPropertyValue('--button-secondary')?.trim() || '#2a3f5f',
      background: style.getPropertyValue('--card')?.trim() || '#1b2838',
      text: style.getPropertyValue('--text')?.trim() || '#ffffff',
      textMuted: style.getPropertyValue('--text-muted')?.trim() || '#8892b0',
      border: style.getPropertyValue('--border-color')?.trim() || '#2a3f5f',
      founderAccent: founderProfile.tier === 'Platinum'
        ? '#e5e7eb'
        : founderProfile.tier === 'Gold'
          ? '#facc15'
          : founderProfile.tier === 'Silver'
            ? '#cbd5e1'
            : '#fb923c'
    };
  };

  // Generate blurred background from game covers
  const generateBlurredBackground = (ctx, width, height, colors) => {
    // Sample game covers for background
    const sampleGames = library.slice(0, Math.min(8, library.length));
    
    if (sampleGames.length === 0) {
      // Fallback to gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, colors.background);
      gradient.addColorStop(1, colors.secondary);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      return;
    }

    // Create mosaic of game covers
    const tileSize = Math.max(width, height) / 4;
    let x = 0, y = 0;

    sampleGames.forEach((game, index) => {
      if (game && game.iconUrl) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.globalAlpha = 0.3;
          ctx.drawImage(img, x, y, tileSize, tileSize);
          
          // Add vignette overlay
          const vignette = ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, Math.max(width, height) / 2
          );
          vignette.addColorStop(0, 'rgba(0,0,0,0)');
          vignette.addColorStop(1, 'rgba(0,0,0,0.7)');
          ctx.globalAlpha = 1;
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, width, height);
        };
        img.src = game.iconUrl;
      }

      x += tileSize;
      if (x >= width) {
        x = 0;
        y += tileSize;
      }
    });
  };

  // Generate gradient background
  const generateGradientBackground = (ctx, width, height, colors) => {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, colors.background);
    gradient.addColorStop(0.5, colors.secondary);
    gradient.addColorStop(1, colors.background);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add subtle pattern
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < 20; i++) {
      ctx.strokeStyle = colors.primary;
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
  };

  // Draw cinematic card
  const drawCinematicCard = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const colors = getThemeColors();

    // Set canvas size based on format
    let width, height;
    switch (cardFormat) {
      case 'square':
        width = height = 1080;
        break;
      case 'wide':
        width = 1920;
        height = 1080;
        break;
      default: // vertical
        width = 1080;
        height = 1920;
        break;
    }

    canvas.width = width;
    canvas.height = height;

    // Generate background
    if (backgroundStyle === 'blurred') {
      generateBlurredBackground(ctx, width, height, colors);
    } else {
      generateGradientBackground(ctx, width, height, colors);
    }

    // Add vignette
    const vignette = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 2
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.7, 'rgba(0,0,0,0.3)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    // Draw content
    const centerX = width / 2;
    const centerY = height / 2;

    // Game count (hero element)
    ctx.fillStyle = colors.primary;
    ctx.font = 'bold 120px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;
    ctx.fillText(library.length.toString(), centerX, centerY - 100);

    // Label
    ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = colors.text;
    ctx.fillText('GAMES', centerX, centerY - 20);

    // Stats
    ctx.font = '32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = colors.textMuted;
    
    const totalMinutes = library.reduce((sum, game) => sum + (game.time_played || 0), 0);
    const totalHours = Math.round(totalMinutes / 60);
    const gamesPlayed = library.filter(g => g.time_played > 0).length;

    ctx.fillText(`${gamesPlayed} Played`, centerX, centerY + 60);
    ctx.fillText(`${totalHours} Hours`, centerX, centerY + 110);

    // GamePilot branding
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = colors.primary;
    ctx.fillText('GamePilot', centerX, height - 80);

    ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = colors.textMuted;
    ctx.fillText('Your Ultimate Game Library', centerX, height - 40);

    if (founderProfile.isFounder) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = colors.founderAccent;
      ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`${founderProfile.tier} Founder Edition`, centerX, height - 132);
      ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = colors.text;
      ctx.fillText(`${founderProfile.name} • Founding Supporter`, centerX, height - 102);

      ctx.strokeStyle = colors.founderAccent;
      ctx.lineWidth = 3;
      ctx.strokeRect(40, 40, width - 80, height - 80);
    }
  };

  // Export as image
  const exportAsImage = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      drawCinematicCard();
      
      const canvas = canvasRef.current;
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `gamepilot-cinematic-${cardFormat}-${new Date().toISOString().split('T')[0]}.png`;
        link.click();
        URL.revokeObjectURL(url);
        setIsGenerating(false);
      }, 'image/png');
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="cinematic-export-overlay">
      <div className={`cinematic-export-modal ${founderProfile.isFounder ? `cinematic-export-modal-founder cinematic-export-modal-founder-${founderProfile.tier.toLowerCase()}` : ''}`}>
        <div className="cinematic-export-header">
          <h2>
            <Image size={24} />
            Cinematic Export
          </h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="cinematic-export-content">
          {founderProfile.isFounder && (
            <div className={`cinematic-founder-banner cinematic-founder-banner-${founderProfile.tier.toLowerCase()}`}>
              <Crown size={18} />
              <span>{founderProfile.tier} Founder Edition enabled for {founderProfile.name}</span>
            </div>
          )}
          {/* Format Selection */}
          <div className="export-section">
            <h3>
              <Palette size={18} />
              Card Format
            </h3>
            <div className="format-options">
              <button 
                className={`format-option ${cardFormat === 'vertical' ? 'active' : ''}`}
                onClick={() => setCardFormat('vertical')}
              >
                <div className="format-preview vertical-preview"></div>
                Vertical Poster
                <span className="format-dimensions">1080×1920</span>
              </button>
              <button 
                className={`format-option ${cardFormat === 'square' ? 'active' : ''}`}
                onClick={() => setCardFormat('square')}
              >
                <div className="format-preview square-preview"></div>
                Square Card
                <span className="format-dimensions">1080×1080</span>
              </button>
              <button 
                className={`format-option ${cardFormat === 'wide' ? 'active' : ''}`}
                onClick={() => setCardFormat('wide')}
              >
                <div className="format-preview wide-preview"></div>
                Wide Banner
                <span className="format-dimensions">1920×1080</span>
              </button>
            </div>
          </div>

          {/* Background Style */}
          <div className="export-section">
            <h3>
              <Palette size={18} />
              Background Style
            </h3>
            <div className="background-options">
              <button 
                className={`background-option ${backgroundStyle === 'blurred' ? 'active' : ''}`}
                onClick={() => setBackgroundStyle('blurred')}
              >
                <div className="background-preview blurred-preview"></div>
                Blurred Game Covers
              </button>
              <button 
                className={`background-option ${backgroundStyle === 'gradient' ? 'active' : ''}`}
                onClick={() => setBackgroundStyle('gradient')}
              >
                <div className="background-preview gradient-preview"></div>
                Theme Gradient
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="export-section">
            <h3>Preview</h3>
            <div className="canvas-container">
              <canvas 
                ref={canvasRef}
                className={`cinematic-canvas ${cardFormat}`}
              />
            </div>
          </div>
        </div>

        <div className="cinematic-export-footer">
          <button 
            className="export-button primary"
            onClick={exportAsImage}
            disabled={isGenerating}
          >
            <Download size={18} />
            {isGenerating ? 'Generating...' : 'Export Cinematic Card'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CinematicExport;
