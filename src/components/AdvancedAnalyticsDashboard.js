import React, { useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import {
  Activity,
  Brain,
  Building2,
  Clock,
  Crown,
  Dice5,
  DollarSign,
  Gamepad2,
  Layers,
  PieChart as PieChartIcon,
  Target,
  TrendingUp,
  Zap
} from 'lucide-react';
import { AdvancedAnalyticsService } from '../services/AdvancedAnalyticsService';
import { LocalShareService } from '../services/LocalShareService';
import ProfileService from '../services/ProfileService';
import { formatPlaytime } from '../utils/formatPlaytime';
import { BarChart, PieChart } from './StatsCharts';
import ShareMenu from './ShareMenu';
import './AdvancedAnalyticsDashboard.css';

const formatCurrency = (value) => {
  const num = Number(value) || 0;
  return `$${num.toFixed(2)}`;
};

const MiniBar = ({ value, max = 100, color = 'var(--accent-color, #ff6b35)' }) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="aad-mini-bar-track">
      <div className="aad-mini-bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
};

const SectionCard = ({ title, icon, children, action }) => (
  <div className="aad-section-card">
    <div className="aad-section-header">
      <div className="aad-section-title">
        {icon}
        <h3>{title}</h3>
      </div>
      {action && <div className="aad-section-action">{action}</div>}
    </div>
    <div className="aad-section-body">{children}</div>
  </div>
);

const InsightCard = ({ insight }) => (
  <div className={`aad-insight-card ${insight.type}`}>
    <span className="aad-insight-icon">{insight.icon}</span>
    <div className="aad-insight-content">
      <strong>{insight.title}</strong>
      <span>{insight.text}</span>
    </div>
  </div>
);

export function AdvancedAnalyticsDashboard({ library, username = 'Gamer' }) {
  const analytics = useMemo(() => AdvancedAnalyticsService.getFullAdvancedAnalytics(library), [library]);
  const cardRef = useRef(null);

  const hasData = library?.length > 0;
  if (!hasData) {
    return (
      <div className="aad-empty">
        <Brain size={32} />
        <p>Add games to your library to unlock advanced analytics.</p>
      </div>
    );
  }

  const {
    devPub,
    priceTiers,
    valuePerHour,
    completion,
    genreEvolution,
    platformBreakdown,
    backlogInvestments,
    backlogPriority,
    nextUp,
    sessionQuality,
    insights
  } = analytics;

  const topInsight = insights?.[0];
  const shareText = ProfileService.appendSocialLinksToShareText(
    topInsight
      ? `🎮 ${username}'s Advanced GamePilot Stats\n\n${topInsight.icon} ${topInsight.title}: ${topInsight.text}\n\nDive deeper with GamePilot Pro.`
      : `🎮 ${username}'s Advanced GamePilot Stats\n\nDeep library analytics powered by GamePilot Pro.`
  );

  const generateShareImage = async () => {
    if (!cardRef.current) return false;
    try {
      const canvas = await html2canvas(cardRef.current, {
        width: 1080,
        height: 1080,
        windowWidth: 1080,
        windowHeight: 1080,
        scale: 1,
        backgroundColor: '#0d1224',
        logging: false
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return false;
      const result = await LocalShareService.copyImageToClipboard(blob, 'gamepilot-advanced-analytics.png');
      return result.success;
    } catch (error) {
      console.error('Failed to generate advanced analytics share image:', error);
      return false;
    }
  };

  const saveShareImage = async () => {
    if (!cardRef.current) return;
    const canvas = await html2canvas(cardRef.current, {
      width: 1080,
      height: 1080,
      windowWidth: 1080,
      windowHeight: 1080,
      scale: 1,
      backgroundColor: '#0d1224',
      logging: false
    });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gamepilot-advanced-analytics-${new Date().toISOString().split('T')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyText = async (text = null) => {
    const success = await LocalShareService.copyTextToClipboard(text || shareText);
    return success;
  };

  const handleShareChannel = async (channel, text = null) => {
    await LocalShareService.openShareIntent(channel, text || shareText);
  };

  const handleDownloadText = (text = null) => {
    LocalShareService.downloadShareText(text || shareText, 'gamepilot-advanced-analytics.txt');
  };

  const handleNativeShare = async (text = null) => {
    const blob = await (async () => {
      if (!cardRef.current) return null;
      const canvas = await html2canvas(cardRef.current, {
        width: 1080,
        height: 1080,
        windowWidth: 1080,
        windowHeight: 1080,
        scale: 1,
        backgroundColor: '#0d1224',
        logging: false
      });
      return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    })();
    const files = blob ? [new File([blob], 'gamepilot-advanced-analytics.png', { type: 'image/png' })] : [];
    await LocalShareService.shareWithNativeShare({ title: "My Advanced GamePilot Stats", text: text || shareText, files });
  };

  return (
    <div className="advanced-analytics-dashboard">
      <div className="aad-toolbar">
        <div className="aad-toolbar-title">
          <Crown size={20} />
          <h2>Advanced Analytics</h2>
        </div>
        <ShareMenu
          onCopyText={handleCopyText}
          onCopyImage={generateShareImage}
          onSaveImage={saveShareImage}
          onShareText={handleShareChannel}
          buildCaption={() => shareText}
          onDownloadText={handleDownloadText}
          onNativeShare={handleNativeShare}
          imageAvailable
        />
      </div>

      <div ref={cardRef} className="aad-share-surface">
        {insights?.length > 0 && (
          <SectionCard title="Power Insights" icon={<Zap size={18} />}
            action={insights.length > 2 && (
              <span className="aad-badge">{insights.length} insights</span>
            )}
          >
            <div className="aad-insights-grid">
              {insights.map((insight, index) => (
                <InsightCard key={index} insight={insight} />
              ))}
            </div>
          </SectionCard>
        )}

        <div className="aad-grid">
          <SectionCard title="Library Completion" icon={<Target size={18} />}>
            {completion?.overall && (
              <div className="aad-completion-hero">
                <div className="aad-completion-ring">
                  <strong>{completion.overall.completionRate}%</strong>
                  <span>Completed</span>
                </div>
                <div className="aad-completion-stats">
                  <div>
                    <strong>{completion.overall.total}</strong>
                    <span>Total</span>
                  </div>
                  <div>
                    <strong>{completion.overall.completed}</strong>
                    <span>Done</span>
                  </div>
                  <div>
                    <strong>{completion.overall.dropped}</strong>
                    <span>Dropped</span>
                  </div>
                  <div>
                    <strong>{completion.overall.unfinished}</strong>
                    <span>Backlog</span>
                  </div>
                </div>
              </div>
            )}
            {completion?.byGenre?.length > 0 && (
              <div className="aad-ranked-list">
                <h4>By Genre</h4>
                {completion.byGenre.slice(0, 5).map((g) => (
                  <div key={g.name} className="aad-ranked-row">
                    <span>{g.name}</span>
                    <MiniBar value={g.completionRate} max={100} />
                    <strong>{g.completionRate}%</strong>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Value by Price Tier" icon={<DollarSign size={18} />}>
            {priceTiers?.breakdown?.length > 0 && (
              <>
                <div className="aad-big-stat">
                  <strong>{formatCurrency(priceTiers.totalValue)}</strong>
                  <span>Total library value</span>
                </div>
                <div className="aad-chart-tall">
                  <PieChart data={Object.fromEntries(priceTiers.breakdown.map((t) => [t.tier, t.value]))} title="Value distribution" />
                </div>
              </>
            )}
          </SectionCard>

          <SectionCard title="Best Value per Hour" icon={<TrendingUp size={18} />}>
            {valuePerHour?.bestValue?.length > 0 && (
              <div className="aad-ranked-list">
                {valuePerHour.bestValue.slice(0, 5).map((g) => (
                  <div key={g.name} className="aad-ranked-row">
                    <div className="aad-ranked-info">
                      <strong>{g.name}</strong>
                      <span>{g.hours}h · {formatCurrency(g.value)}</span>
                    </div>
                    <span className="aad-highlight">{formatCurrency(g.valuePerHour)}/h</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Most Played Investments" icon={<Clock size={18} />}>
            {valuePerHour?.mostPlayed?.length > 0 && (
              <div className="aad-ranked-list">
                {valuePerHour.mostPlayed.slice(0, 5).map((g) => (
                  <div key={g.name} className="aad-ranked-row">
                    <div className="aad-ranked-info">
                      <strong>{g.name}</strong>
                      <span>{formatCurrency(g.value)} · {g.platform}</span>
                    </div>
                    <span className="aad-highlight">{g.hours}h</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Top Developers" icon={<Layers size={18} />}>
            {devPub?.developers?.length > 0 && (
              <div className="aad-ranked-list">
                {devPub.developers.slice(0, 5).map((d) => (
                  <div key={d.name} className="aad-ranked-row">
                    <div className="aad-ranked-info">
                      <strong>{d.name}</strong>
                      <span>{d.games} games</span>
                    </div>
                    <span className="aad-highlight">{formatPlaytime(d.minutes)}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Top Publishers" icon={<Building2 size={18} />}>
            {devPub?.publishers?.length > 0 && (
              <div className="aad-ranked-list">
                {devPub.publishers.slice(0, 5).map((p) => (
                  <div key={p.name} className="aad-ranked-row">
                    <div className="aad-ranked-info">
                      <strong>{p.name}</strong>
                      <span>{p.games} games</span>
                    </div>
                    <span className="aad-highlight">{formatPlaytime(p.minutes)}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {nextUp?.length > 0 && (
          <SectionCard title="Next Up" icon={<Dice5 size={18} />}>
            <div className="aad-nextup-list">
              {nextUp.map((game, index) => (
                <div key={game.name} className="aad-nextup-card">
                  <div className="aad-nextup-rank">{index + 1}</div>
                  <div className="aad-nextup-info">
                    <strong>{game.name}</strong>
                    <span>{game.reason}</span>
                  </div>
                  <div className="aad-nextup-meta">
                    <span className="aad-highlight">{game.score} pts</span>
                    <span className="aad-muted">{game.hours > 0 ? `${game.hours}h` : 'unplayed'}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {sessionQuality && (
          <SectionCard title="Session Quality" icon={<Activity size={18} />}>
            <div className="aad-quality-grid">
              <div className="aad-quality-card">
                <strong>{sessionQuality.averageSessionMinutes}</strong>
                <span>Avg minutes</span>
              </div>
              <div className="aad-quality-card">
                <strong>{sessionQuality.longestSessionMinutes}</strong>
                <span>Longest minutes</span>
              </div>
              <div className="aad-quality-card">
                <strong>{sessionQuality.bestStreak}</strong>
                <span>Best streak</span>
              </div>
              <div className="aad-quality-card">
                <strong>{sessionQuality.consistencyScore}%</strong>
                <span>Consistency</span>
              </div>
            </div>
            <div className="aad-quality-day">
              <span>Your strongest day is <strong>{sessionQuality.bestDay}</strong> with {sessionQuality.bestDayHours}h played.</span>
            </div>
          </SectionCard>
        )}

        {backlogPriority?.length > 0 && (
          <SectionCard title="Backlog Priority" icon={<TrendingUp size={18} />}>
            <div className="aad-ranked-list">
              {backlogPriority.slice(0, 5).map((g) => (
                <div key={g.name} className="aad-ranked-row">
                  <div className="aad-ranked-info">
                    <strong>{g.name}</strong>
                    <span>{g.genres.slice(0, 2).join(', ')}</span>
                  </div>
                  <MiniBar value={g.score} max={200} />
                  <span className="aad-highlight">{g.score}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {genreEvolution?.datasets?.length > 0 && (
          <SectionCard title="Genre Evolution" icon={<PieChartIcon size={18} />}>
            <div className="aad-genre-evolution">
              <BarChart data={Object.fromEntries(genreEvolution.labels.map((label, i) => {
                const total = genreEvolution.datasets.reduce((sum, ds) => sum + (ds.data[i] || 0), 0);
                return [label, total];
              }))} title="Monthly hours by genre" />
            </div>
          </SectionCard>
        )}

        {platformBreakdown?.length > 0 && (
          <SectionCard title="Platform Value" icon={<Gamepad2 size={18} />}>
            <div className="aad-platform-grid">
              {platformBreakdown.map((p) => (
                <div key={p.platform} className="aad-platform-card">
                  <strong>{p.platform}</strong>
                  <span>{p.games} games</span>
                  <span>{formatPlaytime(p.minutes * 60)}</span>
                  <span>{formatCurrency(p.value)}</span>
                  <span className="aad-muted">{formatCurrency(p.valuePerHour)}/h</span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {backlogInvestments?.totalBacklogGames > 0 && (
          <SectionCard title="Backlog Investments" icon={<Layers size={18} />}>
            <div className="aad-backlog-hero">
              <div className="aad-big-stat">
                <strong>{formatCurrency(backlogInvestments.totalBacklogValue)}</strong>
                <span>{backlogInvestments.totalBacklogGames} unplayed/unfinished games</span>
              </div>
            </div>
            <div className="aad-grid-two">
              {backlogInvestments.topUnplayed?.length > 0 && (
                <div className="aad-ranked-list">
                  <h4>Top Unplayed by Value</h4>
                  {backlogInvestments.topUnplayed.slice(0, 5).map((g) => (
                    <div key={g.name} className="aad-ranked-row">
                      <div className="aad-ranked-info">
                        <strong>{g.name}</strong>
                        <span>{g.platform}</span>
                      </div>
                      <span className="aad-highlight">{formatCurrency(g.value)}</span>
                    </div>
                  ))}
                </div>
              )}
              {backlogInvestments.biggestPartial?.length > 0 && (
                <div className="aad-ranked-list">
                  <h4>Biggest Partial Plays</h4>
                  {backlogInvestments.biggestPartial.slice(0, 5).map((g) => (
                    <div key={g.name} className="aad-ranked-row">
                      <div className="aad-ranked-info">
                        <strong>{g.name}</strong>
                        <span>{g.hours}h played</span>
                      </div>
                      <span className="aad-highlight">{formatCurrency(g.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}

export default AdvancedAnalyticsDashboard;
