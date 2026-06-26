import React, { useRef, useState, useCallback } from 'react';
import { Zap, Brain, Target, TrendingUp, Clock } from 'lucide-react';
import { ShareMenu } from './ShareMenu';
import { useToast } from './Toast';
import { LocalShareService } from '../services/LocalShareService';
import ProfileService from '../services/ProfileService';
import { PowerStatsShareCard } from './PowerStatsShareCard';
import './PowerStatsDeepDive.css';

function MiniBar({ value, max = 100, color = 'var(--accent-color, #ff6b35)' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="psd-mini-bar-track">
      <div className="psd-mini-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export default function PowerStatsDeepDive({ analytics, username = 'Gamer' }) {
  const { success } = useToast();
  const shareCardRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const buildShareText = useCallback(() => {
    if (!analytics) return '';
    const { diversity, playPatterns, backlog, insights, genreMatrix } = analytics;
    const lines = [];
    lines.push(`⚡ Power Stats — ${username}`);
    if (diversity) {
      lines.push(`Library Diversity Score: ${diversity.score}/100`);
    }
    if (playPatterns) {
      lines.push(`Avg session: ${playPatterns.avgSessionLength} min · Peak: ${playPatterns.peakDay} @ ${playPatterns.peakHour}:00 · Current streak: ${playPatterns.currentStreak} days`);
    }
    if (insights?.length > 0) {
      lines.push(`Insights: ${insights.slice(0, 3).map((i) => i.text).join(' · ')}`);
    }
    if (backlog?.quickWins?.length > 0) {
      lines.push(`Quick wins: ${backlog.quickWins.slice(0, 3).map((b) => `${b.game?.name || 'Unknown'} (${Math.round(b.completionPct)}%)`).join(', ')}`);
    }
    if (genreMatrix?.topGenres?.length > 0) {
      lines.push(`Top genres: ${genreMatrix.topGenres.slice(0, 3).map((g) => `${g.genre} ${Math.round(g.avgCompletion)}%`).join(', ')}`);
    }
    lines.push('Powered by GamePilot');
    return ProfileService.appendSocialLinksToShareText(lines.join('\n'));
  }, [analytics, username]);

  const handleCopyText = useCallback(async (text = null) => {
    const copied = await LocalShareService.copyTextToClipboard(text || buildShareText());
    success(copied ? 'Power stats copied to clipboard.' : 'Could not copy power stats.');
    return copied;
  }, [buildShareText, success]);

  const handleDownloadText = useCallback((text = null) => {
    LocalShareService.downloadShareText(text || buildShareText(), 'power-stats.txt');
  }, [buildShareText]);

  const generateShareCardBlob = useCallback(async () => {
    if (!shareCardRef.current) return null;
    setIsCapturing(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        logging: false
      });
      return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    } catch (err) {
      console.error('Failed to generate power stats share card:', err);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const handleCopyImage = useCallback(async () => {
    const blob = await generateShareCardBlob();
    if (!blob) {
      success('Could not generate power stats card.');
      return false;
    }
    const copied = await LocalShareService.copyImageToClipboard(blob);
    success(copied ? 'Power stats card copied to clipboard.' : 'Could not copy power stats card.');
    return copied;
  }, [generateShareCardBlob, success]);

  const handleSaveImage = useCallback(async () => {
    const blob = await generateShareCardBlob();
    if (!blob) {
      success('Could not generate power stats card.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gamepilot-power-stats-${new Date().toISOString().split('T')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    success('Power stats card saved.');
  }, [generateShareCardBlob, success]);

  const handleNativeShare = useCallback(async (text = null) => {
    const blob = await generateShareCardBlob();
    if (!blob) {
      success('Could not generate power stats card.');
      return;
    }
    const file = new File([blob], `gamepilot-power-stats-${new Date().toISOString().split('T')[0]}.png`, { type: 'image/png' });
    const result = await LocalShareService.shareWithNativeShare({
      title: 'My GamePilot Power Stats',
      text: text || buildShareText(),
      files: [file]
    });
    success(result.success ? 'Native share opened.' : result.message || 'Could not share.');
  }, [generateShareCardBlob, buildShareText, success]);

  if (!analytics) return null;
  const { diversity, playPatterns, backlog, insights, genreMatrix } = analytics;

  return (
    <div className="power-stats-deep-dive">
      <div className="psd-share-bar">
        <ShareMenu
          imageAvailable
          disabled={isCapturing}
          onCopyText={handleCopyText}
          onCopyImage={handleCopyImage}
          onSaveImage={handleSaveImage}
          onDownloadText={handleDownloadText}
          onShareText={async (channel, text = null) => {
            const result = await LocalShareService.openShareIntent(channel, text || buildShareText());
            success(result.success ? `Opened ${result.label}.` : result.message || 'Could not share power stats.');
          }}
          buildCaption={buildShareText}
          onNativeShare={handleNativeShare}
          triggerLabel="Share power stats"
        />
      </div>

      {/* Power Insights */}
      {insights?.length > 0 && (
        <div className="psd-section">
          <h4 className="psd-section-title"><Zap size={16} /> Power Insights</h4>
          <div className="psd-insights">
            {insights.slice(0, 3).map((insight, i) => (
              <div key={i} className={`psd-insight-card ${insight.type}`}>
                <span className="psd-insight-text">{insight.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Library Diversity */}
      {diversity && (
        <div className="psd-section">
          <div className="psd-hero-score">
            <div className="psd-score-ring" style={{ '--score': diversity.score }}>
              <strong>{diversity.score}</strong>
            </div>
            <div className="psd-score-info">
              <h4>Library Diversity Score</h4>
              <p>
                {diversity.score >= 80
                  ? 'Incredible variety across genres, platforms, moods, and ratings.'
                  : diversity.score >= 60
                    ? 'A well-rounded library with room to explore a few more corners.'
                    : 'Your library is concentrated. Try branching out to new genres or moods.'}
              </p>
            </div>
          </div>
          <h4 className="psd-section-title"><Brain size={16} /> Diversity Breakdown</h4>
          <div className="psd-diversity-grid">
            <div className="psd-diversity-metric">
              <span>Genre</span>
              <strong>{diversity.genreDiversity}</strong>
              <MiniBar value={diversity.genreDiversity} />
            </div>
            <div className="psd-diversity-metric">
              <span>Platform</span>
              <strong>{diversity.platformDiversity}</strong>
              <MiniBar value={diversity.platformDiversity} />
            </div>
            <div className="psd-diversity-metric">
              <span>Mood</span>
              <strong>{diversity.moodDiversity}</strong>
              <MiniBar value={diversity.moodDiversity} />
            </div>
            <div className="psd-diversity-metric">
              <span>Rating</span>
              <strong>{Math.round((diversity.avgRating || 0) * 10)}</strong>
              <MiniBar value={Math.round((diversity.avgRating || 0) * 10)} max={100} />
            </div>
          </div>
        </div>
      )}

      {/* Play Patterns */}
      {playPatterns && (
        <div className="psd-section">
          <h4 className="psd-section-title"><Clock size={16} /> Play Patterns</h4>
          <div className="psd-pattern-grid">
            <div className="psd-pattern-stat">
              <span>Avg Session</span>
              <strong>{playPatterns.avgSessionLength} min</strong>
            </div>
            <div className="psd-pattern-stat">
              <span>Peak Hour</span>
              <strong>{playPatterns.peakHour}:00</strong>
            </div>
            <div className="psd-pattern-stat">
              <span>Peak Day</span>
              <strong>{playPatterns.peakDay}</strong>
            </div>
            <div className="psd-pattern-stat">
              <span>Current Streak</span>
              <strong>{playPatterns.currentStreak} days</strong>
            </div>
            <div className="psd-pattern-stat">
              <span>Best Streak</span>
              <strong>{playPatterns.bestStreak} days</strong>
            </div>
            <div className="psd-pattern-stat">
              <span>Total Sessions</span>
              <strong>{playPatterns.totalSessions}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Backlog Quick Picks */}
      {backlog?.quickWins?.length > 0 && (
        <div className="psd-section">
          <h4 className="psd-section-title"><Target size={16} /> Backlog Quick Wins</h4>
          <div className="psd-backlog-list">
            {backlog.quickWins.slice(0, 3).map((item, i) => (
              <div key={i} className="psd-backlog-item">
                <span className="psd-backlog-name">{item.game?.name || 'Unknown Game'}</span>
                <span className="psd-backlog-pct">{Math.round(item.completionPct)}% done</span>
                <span className="psd-backlog-remaining">~{Math.round(item.remainingHours || 0)}h left</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Genre Performance */}
      {genreMatrix?.topGenres?.length > 0 && (
        <div className="psd-section">
          <h4 className="psd-section-title"><TrendingUp size={16} /> Genre Performance</h4>
          <div className="psd-genre-grid">
            {genreMatrix.topGenres.slice(0, 4).map((g, i) => (
              <div key={i} className="psd-genre-card">
                <strong>{g.genre}</strong>
                <span>{Math.round(g.avgCompletion)}% avg completion</span>
                <span>{Math.round(g.totalHours)}h played</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ position: 'fixed', left: 0, top: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
        <div ref={shareCardRef}>
          <PowerStatsShareCard analytics={analytics} username={username} />
        </div>
      </div>
    </div>
  );
}
