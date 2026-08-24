import React, { useMemo } from 'react';
import {
  Brain,
  Clock,
  TrendingUp,
  TrendingDown,
  Gamepad2,
  BarChart3,
  Target,
  Sparkles,
  Activity,
  Palette
} from 'lucide-react';
import { UserBehaviorProfile } from '../services/UserBehaviorProfile';
import { StatsAggregationService } from '../services/StatsAggregationService';
import { GameCurationService } from '../services/GameCurationService';
import { GamingIdentity } from '../GamingIdentity';
import GamingPersonaService from '../services/GamingPersonaService';
import { isGameUnplayed } from '../services/RecommendationEngine';
import './HabitInsightsPanel.css';

const InsightCard = ({ icon: Icon, title, value, subtitle, tone = 'neutral' }) => (
  <div className={`habit-insight-card tone-${tone}`}>
    <div className="insight-icon">
      <Icon size={20} />
    </div>
    <div className="insight-body">
      <span className="insight-title">{title}</span>
      <span className="insight-value">{value}</span>
      {subtitle && <span className="insight-subtitle">{subtitle}</span>}
    </div>
  </div>
);

const PatternRow = ({ label, detail, tone = 'neutral' }) => (
  <div className={`habit-pattern-row tone-${tone}`}>
    <span className="pattern-label">{label}</span>
    <span className="pattern-detail">{detail}</span>
  </div>
);

const HabitInsightsPanel = ({ library = [] }) => {
  const insights = useMemo(() => {
    if (!Array.isArray(library) || library.length === 0) {
      return null;
    }

    const persona = UserBehaviorProfile.getPersonaSnapshot();
    const gamingPersona = GamingPersonaService.getPersona();
    const primary = gamingPersona?.primaryPersona;
    const dashboard = StatsAggregationService.getDashboardData(library);
    const allTime = dashboard?.periods?.all;
    // Recent habit window: prefer this week, fall back to this month, then
    // all-time — so the patterns reflect current play, not ancient history.
    const recentPeriod = ['weekly', 'monthly']
      .map((key) => dashboard?.periods?.[key])
      .find((period) => (period?.sessions || 0) > 0) || allTime;
    const habit = recentPeriod?.habitInsights;
    const enrichedLibrary = GameCurationService.enrichLibrary(library);
    const tasteClusters = GamingIdentity.detectTasteClusters(GamingIdentity.getSignatureGames(5));

    // Abandonment analysis
    const abandonedCount = enrichedLibrary.filter((g) => {
      const completion = GameCurationService.getGameCompletion(g.name);
      return completion.status === 'abandoned';
    }).length;

    const totalWithStatus = enrichedLibrary.filter((g) => {
      const completion = GameCurationService.getGameCompletion(g.name);
      return completion.status && completion.status !== 'not-started';
    }).length;

    const abandonmentRate = totalWithStatus > 0
      ? Math.round((abandonedCount / totalWithStatus) * 100)
      : 0;

    // Genre diversity
    const genreCounts = {};
    enrichedLibrary.forEach((g) => {
      (g.genres || []).forEach((genre) => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    });
    const genreCount = Object.keys(genreCounts).length;

    // Session length trend (compare recent 10 sessions vs overall average)
    const recentSessions = (allTime?.recentSessions || []).slice(0, 10);
    const recentAvg = recentSessions.length > 0
      ? Math.round(recentSessions.reduce((s, r) => s + (r.playtimeMinutes || 0), 0) / recentSessions.length)
      : 0;
    const overallAvg = allTime?.avgSessionMinutes || 0;
    const sessionTrend = recentAvg > overallAvg * 1.15
      ? 'increasing'
      : recentAvg < overallAvg * 0.85
        ? 'decreasing'
        : 'stable';

    // Peak time window — from the current-rotation persona's recent session
    // pool, falling back to all-time behavior stats when no sessions exist.
    const recentPeakHour = Number.isFinite(gamingPersona?.signals?.peakHour)
      ? gamingPersona.signals.peakHour
      : null;
    const peakHours = UserBehaviorProfile.getPeakPlayHours(3);
    const peakWindow = recentPeakHour !== null
      ? `${UserBehaviorProfile.getTimeOfDay(recentPeakHour)} (${recentPeakHour}:00)`
      : peakHours.length > 0
        ? `${peakHours[0].timeOfDay} (${peakHours[0].hour}:00)`
        : 'Not enough data';

    // Mood consistency — from sessions in the recent period when available,
    // else the all-time behavior profile.
    const recentMoodEntries = Object.entries(recentPeriod?.moodCounts || {})
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    const topMoods = UserBehaviorProfile.getTopMoods(3);
    const moodConsistency = recentMoodEntries.length > 0
      ? recentMoodEntries.map(([mood, count]) => `${mood} (${count} session${count === 1 ? '' : 's'})`).join(' · ')
      : topMoods.length > 0
        ? topMoods.map((m) => `${m.mood} (${m.count} sessions)`).join(' · ')
        : 'Still learning';

    // Backlog health
    const unplayed = enrichedLibrary.filter((g) => isGameUnplayed(g)).length;
    const backlogRatio = library.length > 0 ? Math.round((unplayed / library.length) * 100) : 0;

    // Completion velocity
    const completedCount = enrichedLibrary.filter((g) => {
      const c = GameCurationService.getGameCompletion(g.name);
      return ['finished', 'beaten', 'completed', '100%'].includes(c.status);
    }).length;

    // Time-of-day heatmap data
    const allHours = Array.from({ length: 24 }, (_, i) => i);
    const hourCounts = {};
    allHours.forEach((h) => { hourCounts[h] = 0; });
    (allTime?.recentSessions || []).forEach((s) => {
      const d = s.date ? new Date(s.date) : s.startTime ? new Date(s.startTime) : null;
      const h = d ? d.getHours() : null;
      if (h !== null) hourCounts[h] = (hourCounts[h] || 0) + (s.playtimeMinutes || 1);
    });
    const maxHourValue = Math.max(1, ...Object.values(hourCounts));
    const heatmap = allHours.map((h) => ({
      hour: h,
      label: h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`,
      value: hourCounts[h] || 0,
      intensity: (hourCounts[h] || 0) / maxHourValue
    }));

    // Session trend (last 14 sessions)
    const sessionTrendRaw = (allTime?.recentSessions || [])
      .slice(-14)
      .map((s, idx) => ({
        index: idx + 1,
        minutes: s.playtimeMinutes || 0,
        game: s.gameName || ''
      }));

    // Genre phase (recent sessions grouped by genre over time)
    const genrePhase = (allTime?.recentSessions || [])
      .slice(-20)
      .map((s) => {
        const game = library.find(
          (g) => String(g.name).toLowerCase() === String(s.gameName).toLowerCase()
        );
        return {
          genre: (game?.genres?.[0]) || 'Unknown',
          minutes: s.playtimeMinutes || 0
        };
      });
    const genrePhaseTotals = {};
    genrePhase.forEach((p) => {
      genrePhaseTotals[p.genre] = (genrePhaseTotals[p.genre] || 0) + p.minutes;
    });
    const genrePhaseSorted = Object.entries(genrePhaseTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      persona,
      gamingPersona,
      primary,
      habit,
      habitPeriodLabel: recentPeriod?.label || null,
      abandonmentRate,
      genreCount,
      sessionTrend,
      recentAvg,
      overallAvg,
      peakWindow,
      moodConsistency,
      unplayed,
      backlogRatio,
      completedCount,
      totalGames: library.length,
      totalSessions: allTime?.sessions || 0,
      totalHours: allTime?.playtimeHours || 0,
      heatmap,
      sessionTrendRaw,
      genrePhaseSorted,
      tasteClusters
    };
  }, [library]);

  if (!insights) {
    return (
      <div className="habit-insights-panel empty">
        <Brain size={32} />
        <p>Keep playing — your habit insights will appear here once GamePilot learns your patterns.</p>
      </div>
    );
  }

  const {
    persona,
    gamingPersona,
    primary,
    habit,
    habitPeriodLabel,
    abandonmentRate,
    genreCount,
    sessionTrend,
    recentAvg,
    peakWindow,
    moodConsistency,
    unplayed,
    backlogRatio,
    completedCount,
    totalGames,
    totalSessions,
    totalHours,
    heatmap,
    sessionTrendRaw,
    genrePhaseSorted,
    tasteClusters
  } = insights;

  const trendIcon = sessionTrend === 'increasing'
    ? TrendingUp
    : sessionTrend === 'decreasing'
      ? TrendingDown
      : Target;
  const trendTone = sessionTrend === 'increasing' ? 'good' : sessionTrend === 'decreasing' ? 'warn' : 'neutral';

  return (
    <div className="habit-insights-panel">
      <div className="habit-insights-header">
        <Brain size={20} />
        <h3>Habit Insights</h3>
        <span className="habit-insights-badge">Librarian Analytics</span>
      </div>

      <div className="habit-insights-grid">
        <InsightCard
          icon={Gamepad2}
          title="Gaming Identity"
          value={primary?.label || persona?.personaIdentity?.label || 'Explorer'}
          subtitle={gamingPersona?.summaryRoast || primary?.roast || persona?.personaIdentity?.description || 'Still forming your profile'}
          tone="highlight"
        />
        <InsightCard
          icon={Clock}
          title="Peak Gaming Time"
          value={peakWindow}
          subtitle={`Recent avg session: ${recentAvg} min`}
          tone="neutral"
        />
        <InsightCard
          icon={trendIcon}
          title="Session Trend"
          value={sessionTrend}
          subtitle={`Recent avg: ${recentAvg} min`}
          tone={trendTone}
        />
        <InsightCard
          icon={BarChart3}
          title="Library Health"
          value={`${backlogRatio}% backlog`}
          subtitle={`${completedCount} completed · ${unplayed} unplayed`}
          tone={backlogRatio > 60 ? 'warn' : 'good'}
        />
      </div>

      <div className="habit-patterns-section">
        <h4>
          <Sparkles size={16} />
          Detected Patterns{habitPeriodLabel ? ` · ${habitPeriodLabel}` : ''}
        </h4>
        <div className="habit-patterns-list">
          <PatternRow
            label="Dominant Mood"
            detail={moodConsistency}
            tone="highlight"
          />
          <PatternRow
            label="Genre Diversity"
            detail={`${genreCount} unique genres across your library`}
            tone={genreCount < 5 ? 'warn' : 'good'}
          />
          <PatternRow
            label="Abandonment Rate"
            detail={`${abandonmentRate}% of started games abandoned`}
            tone={abandonmentRate > 30 ? 'warn' : 'good'}
          />
          {habit?.weekendSessions > 0 && (
            <PatternRow
              label="Weekend Warrior"
              detail={`${habit.weekendSessions} weekend sessions · ${Math.round(habit.weekendPlaytimeMinutes / 60)} hours`}
              tone="good"
            />
          )}
          {habit?.lateNightSessions > 0 && (
            <PatternRow
              label="Night Owl"
              detail={`${habit.lateNightSessions} late-night sessions`}
              tone="neutral"
            />
          )}
          {habit?.mostReturnedTo && (
            <PatternRow
              label="Most Returned To"
              detail={`${habit.mostReturnedTo.name} (${habit.mostReturnedTo.sessions} sessions)`}
              tone="highlight"
            />
          )}
          {habit?.longestSession && (
            <PatternRow
              label="Longest Session"
              detail={`${habit.longestSession.gameName} — ${Math.round(habit.longestSession.playtimeMinutes / 60 * 10) / 10} hours`}
              tone="highlight"
            />
          )}
        </div>
      </div>

      {heatmap && heatmap.some((h) => h.value > 0) && (
        <div className="habit-viz-section">
          <h4>
            <Activity size={16} />
            Time-of-Day Heatmap
          </h4>
          <div className="viz-heatmap">
            {heatmap.map((h) => (
              <div key={h.hour} className="viz-heatmap-cell" title={`${h.label}: ${Math.round(h.value)} min`}>
                <div
                  className="viz-heatmap-bar"
                  style={{
                    height: `${Math.max(4, h.intensity * 100)}%`,
                    opacity: 0.3 + h.intensity * 0.7
                  }}
                />
                <span className="viz-heatmap-label">{h.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sessionTrendRaw && sessionTrendRaw.length > 2 && (
        <div className="habit-viz-section">
          <h4>
            <BarChart3 size={16} />
            Session Trend (Last {sessionTrendRaw.length})
          </h4>
          {sessionTrendRaw.every((s) => (s.minutes || 0) === 0) ? (
            <p className="habit-viz-empty">Session durations unavailable for these records.</p>
          ) : (
            <>
              <div className="viz-trend">
                {sessionTrendRaw.map((s) => {
                  const maxMin = Math.max(...sessionTrendRaw.map((x) => x.minutes), 1);
                  return (
                    <div key={s.index} className="viz-trend-cell" title={`${s.game}: ${s.minutes}m`}>
                      <div
                        className="viz-trend-bar"
                        style={{ height: `${(s.minutes / maxMin) * 100}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="viz-trend-axis">
                <span>Older</span>
                <span>Newer</span>
              </div>
            </>
          )}
        </div>
      )}

      {genrePhaseSorted && genrePhaseSorted.length > 0 && (
        <div className="habit-viz-section">
          <h4>
            <Palette size={16} />
            Recent Genre Phases
          </h4>
          <div className="viz-genres">
            {genrePhaseSorted.map(([genre, minutes]) => {
              const total = genrePhaseSorted.reduce((sum, [, m]) => sum + m, 0) || 1;
              const pct = Math.round((minutes / total) * 100);
              return (
                <div key={genre} className="viz-genre-row">
                  <span className="viz-genre-name">{genre}</span>
                  <div className="viz-genre-track">
                    <div className="viz-genre-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="viz-genre-value">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tasteClusters && tasteClusters.length > 0 && (
        <div className="habit-viz-section">
          <h4>
            <Target size={16} />
            Detected Taste Clusters
          </h4>
          <div className="viz-taste-clusters">
            {tasteClusters.map((cluster) => (
              <div key={cluster.id} className="viz-taste-cluster">
                <div className="viz-taste-cluster-header">
                  <span className="viz-taste-cluster-label">{cluster.label}</span>
                  <span className="viz-taste-cluster-count">{cluster.matchCount} signature games</span>
                </div>
                <span className="viz-taste-cluster-description">{cluster.description}</span>
                <span className="viz-taste-cluster-games">{cluster.gameNames.join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="habit-summary-bar">
        <span>{totalGames} games</span>
        <span>{totalSessions} sessions</span>
        <span>{Math.round(totalHours)} hours tracked</span>
      </div>
    </div>
  );
};

export default HabitInsightsPanel;
