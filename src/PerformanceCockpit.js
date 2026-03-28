import React, { useState, useEffect, useCallback } from 'react';
import { Cpu, Gauge, HardDrive, MemoryStick, AlertTriangle, CheckCircle, TrendingUp, Zap, User, Sparkles, Gamepad2 } from 'lucide-react';
import NavBar from './NavBar';
import { HardwareDetector } from './services/HardwareDetector';
import { HardwareScoring } from './services/HardwareScoring';
import { BottleneckAnalyzer } from './services/BottleneckAnalyzer';
import { formatPrice, getCurrentCurrency } from './CurrencyConverter';
import { UserBehaviorProfile } from './services/UserBehaviorProfile';
import { PersonaPerformanceInsights } from './services/PersonaPerformanceInsights';
import { GameRequirements } from './services/GameRequirements';
import './PerformanceCockpit.css';

function PerformanceCockpit({ library = [], theme }) {
  const [systemInfo, setSystemInfo] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [personaProfile, setPersonaProfile] = useState(null);
  const [personaSynergy, setPersonaSynergy] = useState([]);

  const analyzeSystem = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const info = await HardwareDetector.getSystemInfo();
      const scores = HardwareScoring.getOverallScore(info);
      const enrichedInfo = {
        ...info,
        scores: scores
      };
      const normalizedLibrary = Array.isArray(library) ? library.filter(Boolean) : [];

      PersonaPerformanceInsights.setSystemInfo(enrichedInfo);
      setSystemInfo(enrichedInfo);

      const result = BottleneckAnalyzer.analyzeLibrary(normalizedLibrary, enrichedInfo);
      setAnalysis(result);

      const personaSnapshot = UserBehaviorProfile.getPersonaSnapshot();
      setPersonaProfile(personaSnapshot);

      const synergyCandidates = personaSnapshot && normalizedLibrary.length
        ? normalizedLibrary
            .map((game) => {
              if (!game) return null;
              const compatibility = PersonaPerformanceInsights.getCompatibility(game, enrichedInfo);
              if (!compatibility || !compatibility.canRun || compatibility.settingsLevel === 'cannot_run') {
                return null;
              }

              const alignment = UserBehaviorProfile.getPersonaAlignmentScore({
                mood: personaSnapshot.dominantMood,
                genres: PersonaPerformanceInsights.extractGenres(game, personaSnapshot.dominantGenre),
                sessionMinutes: PersonaPerformanceInsights.estimateSessionMinutes(game)
              });

              if (!alignment || alignment <= 0) {
                return null;
              }

              const hardwareMatch = PersonaPerformanceInsights.getHardwareMatchContribution(compatibility) || 0;
              const compositeScore = alignment * 0.6 + hardwareMatch * 0.4;

              return {
                id: game.appid || game.app_id || game.steamAppId || game.name,
                name: game.name || 'Unknown Game',
                alignment,
                hardwareMatch,
                compatibility,
                compositeScore,
                lastPlayed: game.last_played || null
              };
            })
            .filter(Boolean)
            .sort((a, b) => b.compositeScore - a.compositeScore)
            .slice(0, 4)
        : [];

      setPersonaSynergy(synergyCandidates);
      setLoading(false);
    } catch (err) {
      console.error('Error analyzing system:', err);
      setError('Failed to analyze system. Please try again.');
      setLoading(false);
    }
  }, [library]);

  useEffect(() => {
    analyzeSystem();

    const handleStorageChange = (event) => {
      if (!event || !event.key || event.key === 'gameLibrary' || event.key === 'systemInfo') {
        analyzeSystem();
      }
    };

    const handleFocus = () => {
      analyzeSystem();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [analyzeSystem]);

  const getScoreColor = (score) => {
    if (score >= 90) return '#00e676'; // Bright green
    if (score >= 75) return '#4caf50'; // Green
    if (score >= 60) return '#2196f3'; // Blue
    if (score >= 45) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  const getScoreLabel = (score) => {
    if (score >= 95) return '🔥 Beast';
    if (score >= 90) return '💎 Excellent';
    if (score >= 80) return '⚡ Great';
    if (score >= 70) return '🎮 Very Good';
    if (score >= 60) return '👍 Good';
    if (score >= 50) return '🎯 Decent';
    if (score >= 40) return '📊 Budget';
    if (score >= 30) return '🕹️ Retro';
    if (score >= 20) return '🎲 Classic';
    if (score >= 10) return '💪 Brave';
    return '🦖 Vintage';
  };

  const getPriorityColor = (priority) => {
    if (priority === 'high') return '#f44336';
    if (priority === 'medium') return '#ff9800';
    return '#4caf50';
  };

  const convertCostString = (costString) => {
    // Parse cost string like "$250-350" or "$50-150"
    const match = costString.match(/\$(\d+)-(\d+)/);
    if (!match) return costString;
    
    const minCost = parseInt(match[1]);
    const maxCost = parseInt(match[2]);
    const currency = getCurrentCurrency();
    
    const minConverted = formatPrice(minCost, currency);
    const maxConverted = formatPrice(maxCost, currency);
    
    // Extract just the numeric part and currency symbol
    const minNum = minConverted.replace(/[^\d.]/g, '');
    const maxNum = maxConverted.replace(/[^\d.]/g, '');
    
    // Get currency symbol
    const symbols = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CAD': 'C$',
      'AUD': 'A$',
      'CHF': 'CHF',
      'CNY': '¥',
      'INR': '₹',
      'BRL': 'R$',
      'RUB': '₽'
    };
    const symbol = symbols[currency] || '$';
    
    return `${symbol}${minNum}-${maxNum}`;
  };

  const getPerformanceLabel = (level) => {
    return GameRequirements.getSettingsLabel(level).text;
  };

  const getPerformanceColor = (level) => {
    return GameRequirements.getSettingsLabel(level).color;
  };

  const getMatchTypeLabel = (item) => {
    if (item?.isEstimate) return 'Estimated';
    if (item?.matchType === 'name') return 'Name Match';
    return 'Requirements DB';
  };

  const sessionBucketLabels = {
    '0-30': 'Sprint Sessions',
    '30-60': 'Focused Runs',
    '60-120': 'Extended Flights',
    '120+': 'Marathon Missions'
  };

  const formatSessionBucket = (bucket) => {
    if (!bucket) return 'Flexible sessions';
    return sessionBucketLabels[bucket] || bucket;
  };

  const formatMinutes = (minutes) => {
    if (!minutes || Number.isNaN(minutes)) return '—';
    return `${Math.round(minutes)} min`;
  };

  if (loading) {
    return (
      <div className="performance-cockpit">
        <NavBar />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Analyzing your system...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="performance-cockpit">
        <NavBar />
        <div className="error-container">
          <AlertTriangle size={48} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const readinessScore = systemInfo.scores.overall;

  return (
    <div className="performance-cockpit">
      <NavBar />
      
      <div className="cockpit-container">
        <div className="cockpit-header">
          <h1><Gauge size={32} /> Performance Cockpit</h1>
          <p className="subtitle">System analysis and upgrade recommendations</p>
        </div>

        {/* Flight Readiness Score */}
        <div className="readiness-section">
          <div className="readiness-card">
            <h2>Flight Readiness</h2>
            <div className="readiness-gauge">
              <div className="gauge-circle">
                <svg viewBox="0 0 200 200">
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="20"
                  />
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke={readinessScore >= 75 ? '#4caf50' : readinessScore >= 50 ? '#ff9800' : '#f44336'}
                    strokeWidth="20"
                    strokeDasharray={`${readinessScore * 5.03} 503`}
                    strokeLinecap="round"
                    transform="rotate(-90 100 100)"
                  />
                </svg>
                <div className="gauge-value">
                  <span className="score">{readinessScore}</span>
                  <span className="label">Hardware</span>
                </div>
              </div>
            </div>
            <p className="readiness-description">
              <strong>{systemInfo.scores.tier}</strong> Gaming PC
              <br />
              {readinessScore >= 95 && '🚀 Beast mode activated! Your PC laughs at system requirements.'}
              {readinessScore >= 90 && readinessScore < 95 && '💎 Top-tier rig! Handles any game at maximum settings.'}
              {readinessScore >= 80 && readinessScore < 90 && '⚡ Excellent system! Great performance in all modern games.'}
              {readinessScore >= 70 && readinessScore < 80 && '🎮 Strong system! Runs most games on high settings.'}
              {readinessScore >= 60 && readinessScore < 70 && '👍 Solid system! Good performance on medium-high settings.'}
              {readinessScore >= 50 && readinessScore < 60 && '🎯 Capable system! Entry-level gaming performance.'}
              {readinessScore >= 40 && readinessScore < 50 && '📊 Budget warrior! Minecraft and indie games are your friends.'}
              {readinessScore >= 30 && readinessScore < 40 && '🕹️ Retro champion! Perfect for games from 2015 and earlier.'}
              {readinessScore >= 20 && readinessScore < 30 && '🎲 Minesweeper master! Also great for Solitaire and older titles.'}
              {readinessScore < 20 && '💪 Your PC has character! Stick to browser games and 2D classics.'}
            </p>
          </div>

          {/* Library Stats */}
          <div className="library-stats">
            <h3>Library Compatibility</h3>
            <p className="library-stats-summary">
              {analysis.stats.verifiedMatches} verified from known requirements • {analysis.stats.estimatedMatches} estimated from hardware heuristics • Library fit {analysis.overallScore}/100
            </p>
            <div className="stat-grid">
              <div className="stat-item">
                <div className="stat-icon" style={{ background: '#4caf50' }}>
                  <CheckCircle size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{analysis.stats.canRunUltra}</span>
                  <span className="stat-label">Ultra Settings</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon" style={{ background: '#2196f3' }}>
                  <TrendingUp size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{analysis.stats.canRunRecommended}</span>
                  <span className="stat-label">High Settings</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon" style={{ background: '#ff9800' }}>
                  <Zap size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{analysis.stats.canRunMinimum}</span>
                  <span className="stat-label">Low Settings</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon" style={{ background: '#f44336' }}>
                  <AlertTriangle size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{analysis.stats.cannotRun}</span>
                  <span className="stat-label">Ultra Low</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {personaProfile && (
          <div className="persona-section">
            <div className="persona-card">
              <div className="persona-header">
                <h2><User size={22} /> Flight Persona</h2>
                <span className="persona-identity">
                  {personaProfile.personaIdentity?.label || 'Persona Signal'}
                </span>
              </div>
              <p className="persona-description">
                {personaProfile.personaIdentity?.description || 'We analyze your local habits to tailor recommendations that feel native to you.'}
              </p>

              {personaProfile.personaTags?.length > 0 && (
                <div className="persona-tags">
                  {personaProfile.personaTags.map((tag) => (
                    <span key={tag} className="persona-tag">{tag}</span>
                  ))}
                </div>
              )}

              <div className="persona-meta-grid">
                <div className="persona-meta">
                  <span>Dominant Mood</span>
                  <strong>{personaProfile.dominantMood || 'Calibrating'}</strong>
                </div>
                <div className="persona-meta">
                  <span>Preferred Sessions</span>
                  <strong>{formatSessionBucket(personaProfile.preferredSessionBucket)}</strong>
                </div>
                <div className="persona-meta">
                  <span>Avg Session Length</span>
                  <strong>{formatMinutes(personaProfile.avgSessionLength)}</strong>
                </div>
                <div className="persona-meta">
                  <span>Peak Play Window</span>
                  <strong>{personaProfile.peakPlayWindow || 'Anytime'}</strong>
                </div>
              </div>

              <div className="persona-progress">
                <span>Completion Confidence</span>
                <div className="persona-progress-bar">
                  <div
                    className="persona-progress-fill"
                    style={{ width: `${personaProfile.overallCompletionRate || 0}%` }}
                  />
                </div>
                <small>{personaProfile.overallCompletionRate || 0}% of tracked sessions reach completion</small>
              </div>
            </div>

            <div className="persona-synergy-card">
              <div className="persona-header">
                <h2><Sparkles size={22} /> Rig + Persona Sweet Spots</h2>
                <span className="persona-identity subtle">Local only • No cloud learning</span>
              </div>

              {personaSynergy.length === 0 && (
                <p className="persona-description">Start tracking a few moods and we’ll spotlight games that suit your identity and run brilliantly on this PC.</p>
              )}

              {personaSynergy.length > 0 && (
                <ul className="synergy-list">
                  {personaSynergy.map((item) => (
                    <li key={item.id} className="synergy-item">
                      <div className="synergy-header">
                        <div>
                          <h4><Gamepad2 size={18} /> {item.name}</h4>
                          <span className="synergy-subline">
                            Alignment {item.alignment}% • Hardware {item.hardwareMatch}%
                          </span>
                        </div>
                        <span
                          className="performance-badge"
                          style={{ background: getPerformanceColor(item.compatibility.settingsLevel) }}
                        >
                          {getPerformanceLabel(item.compatibility.settingsLevel)}
                        </span>
                      </div>
                      <p className="synergy-reason">
                        {PersonaPerformanceInsights.describeCompatibility(item.compatibility)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* System Overview */}
        <div className="system-overview">
          <h2>System Specifications</h2>
          <div className="spec-grid">
            <div className="spec-card">
              <div className="spec-header">
                <Cpu size={24} />
                <h3>CPU</h3>
              </div>
              <p className="spec-model">{systemInfo.cpu.model}</p>
              <div className="spec-details">
                <span>{systemInfo.cpu.cores} Cores @ {systemInfo.cpu.speed} GHz</span>
              </div>
              <div className="tier-badge" style={{ background: getScoreColor(systemInfo.scores.cpu) }}>
                {getScoreLabel(systemInfo.scores.cpu)}
              </div>
              <div className="spec-score">
                <div className="score-bar">
                  <div 
                    className="score-fill" 
                    style={{ 
                      width: `${systemInfo.scores.cpu}%`,
                      background: getScoreColor(systemInfo.scores.cpu)
                    }}
                  />
                </div>
                <span>{systemInfo.scores.cpu}/100</span>
              </div>
            </div>

            <div className="spec-card">
              <div className="spec-header">
                <Gauge size={24} />
                <h3>GPU</h3>
              </div>
              <p className="spec-model">{systemInfo.gpu.model}</p>
              <div className="spec-details">
                <span>{systemInfo.gpu.vramGB}GB VRAM</span>
              </div>
              <div className="tier-badge" style={{ background: getScoreColor(systemInfo.scores.gpu) }}>
                {getScoreLabel(systemInfo.scores.gpu)}
              </div>
              <div className="spec-score">
                <div className="score-bar">
                  <div 
                    className="score-fill" 
                    style={{ 
                      width: `${systemInfo.scores.gpu}%`,
                      background: getScoreColor(systemInfo.scores.gpu)
                    }}
                  />
                </div>
                <span>{systemInfo.scores.gpu}/100</span>
              </div>
            </div>

            <div className="spec-card">
              <div className="spec-header">
                <MemoryStick size={24} />
                <h3>RAM</h3>
              </div>
              <p className="spec-model">{systemInfo.ram.total}GB {systemInfo.ram.type}</p>
              <div className="spec-details">
                <span>
                  {systemInfo.ram.speed > 0 ? `${systemInfo.ram.speed} MHz • ` : ''}
                  {systemInfo.ram.used}GB Used / {systemInfo.ram.free}GB Free
                </span>
              </div>
              <div className="tier-badge" style={{ background: getScoreColor(systemInfo.scores.ram) }}>
                {getScoreLabel(systemInfo.scores.ram)}
              </div>
              <div className="spec-score">
                <div className="score-bar">
                  <div 
                    className="score-fill" 
                    style={{ 
                      width: `${systemInfo.scores.ram}%`,
                      background: getScoreColor(systemInfo.scores.ram)
                    }}
                  />
                </div>
                <span>{systemInfo.scores.ram}/100</span>
              </div>
            </div>

            {/* Storage - show all drives */}
            {systemInfo.storage && systemInfo.storage.map((drive, index) => (
              <div key={index} className="spec-card">
                <div className="spec-header">
                  <HardDrive size={24} />
                  <h3>Storage {systemInfo.storage.length > 1 ? `#${index + 1}` : ''}</h3>
                </div>
                <p className="spec-model">{drive.name}</p>
                <div className="spec-details">
                  <span>{drive.type} • {drive.size}GB Physical</span>
                  {drive.partitions && drive.partitions.length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '0.9em' }}>
                      {drive.partitions.map((partition, pIndex) => (
                        <div key={pIndex} style={{ marginTop: '4px' }}>
                          <strong>{partition.mount}:</strong> {partition.free}GB free of {partition.size}GB ({partition.usePercent}% used)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="tier-badge" style={{ 
                  background: drive.isNVMe ? '#00e676' : drive.isSSD ? '#4caf50' : '#ff9800' 
                }}>
                  {drive.isNVMe ? 'NVMe' : drive.isSSD ? 'SSD' : 'HDD'}
                </div>
                <div className="spec-score">
                  <div className="score-bar">
                    <div 
                      className="score-fill" 
                      style={{ 
                        width: drive.isNVMe ? '100%' : drive.isSSD ? '90%' : '50%',
                        background: drive.isNVMe ? '#00e676' : drive.isSSD ? '#4caf50' : '#ff9800'
                      }}
                    />
                  </div>
                  <span>{drive.isNVMe ? '100' : drive.isSSD ? '90' : '50'}/100</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upgrade Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="recommendations-section">
            <h2><AlertTriangle size={24} /> Upgrade Recommendations</h2>
            <div className="recommendations-grid">
              {analysis.recommendations.map((rec, index) => (
                <div key={index} className="recommendation-card">
                  <div className="rec-header">
                    <h3>{rec.component}</h3>
                    <span 
                      className="priority-badge" 
                      style={{ background: getPriorityColor(rec.priority) }}
                    >
                      {rec.priority} priority
                    </span>
                  </div>
                  <p className="rec-impact">{rec.impact}</p>
                  <div className="rec-suggestion">
                    <strong>💡 Suggestion:</strong>
                    <p>{rec.suggestion}</p>
                  </div>
                  <div className="rec-footer">
                    <span className="rec-cost">{convertCostString(rec.estimatedCost)}</span>
                    <span className="rec-games">{rec.gamesAffected} games affected</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game Compatibility Matrix */}
        {analysis.compatibilityMatrix.length > 0 && (
          <div className="compatibility-section">
            <h2>Game Compatibility Matrix</h2>
            <div className="compatibility-table">
              <table>
                <thead>
                  <tr>
                    <th>Game</th>
                    <th>Source</th>
                    <th>Can Run</th>
                    <th>Performance</th>
                    <th>FPS</th>
                    <th>Bottleneck</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.compatibilityMatrix.slice(0, 20).map((item, index) => (
                    <tr key={index}>
                      <td className="game-name">{item.gameName}</td>
                      <td className="match-type-cell">
                        <span className={`match-type-badge ${item.isEstimate ? 'estimated' : 'verified'}`}>
                          {getMatchTypeLabel(item)}
                        </span>
                      </td>
                      <td className="can-run">
                        {item.canRun ? (
                          <CheckCircle size={20} color="#4caf50" />
                        ) : (
                          <AlertTriangle size={20} color="#f44336" />
                        )}
                      </td>
                      <td>
                        <span 
                          className="performance-badge"
                          style={{ background: getPerformanceColor(item.performanceLevel) }}
                        >
                          {getPerformanceLabel(item.performanceLevel)}
                        </span>
                      </td>
                      <td className="score">{item.fps}</td>
                      <td className="bottleneck">
                        {item.bottleneck ? (
                          <span className="bottleneck-tag">{item.bottleneck.toUpperCase()}</span>
                        ) : (
                          <span style={{ opacity: 0.5 }}>None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {analysis.compatibilityMatrix.length > 20 && (
              <p className="table-note">Showing 20 of {analysis.compatibilityMatrix.length} games</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PerformanceCockpit;
