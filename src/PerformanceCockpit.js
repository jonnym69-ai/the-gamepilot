import {
  AlertTriangle,
  CheckCircle,
  Cpu,
  Gamepad2,
  Gauge,
  HardDrive,
  MemoryStick,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import LazyImage from "./components/LazyImage";
import { Link } from "react-router-dom";
import { formatPrice, getCurrentCurrency, getCurrencySymbol, convertToUSD } from "./CurrencyConverter";
import NavBar from "./NavBar";
import SpecCard from "./components/SpecCard";
import "./PerformanceCockpit.css";
import { BottleneckAnalyzer } from "./services/BottleneckAnalyzer";
import { GameRequirements } from "./services/GameRequirements";
import { HardwareDetector } from "./services/HardwareDetector";
import { HardwareScoring } from "./services/HardwareScoring";
import { PersonaPerformanceInsights } from "./services/PersonaPerformanceInsights";
import { PersonaPerformanceCompatibility } from "./services/PersonaPerformanceCompatibility";
import { UserBehaviorProfile } from "./services/UserBehaviorProfile";

const getFallbackSystemInfo = () => ({
  cpu: { model: "Unknown CPU", brand: "Unknown CPU", cores: 0, speed: 0 },
  gpu: { model: "Unknown GPU", vramGB: 0 },
  ram: { total: 0, type: "Unknown", speed: 0, used: 0, free: 0 },
  storage: [],
  scores: { overall: 0, tier: "Unknown", cpu: 0, gpu: 0, ram: 0, storage: 0 },
});

const getFallbackAnalysis = (totalGames = 0) => ({
  overallScore: 0,
  bottlenecks: {},
  recommendations: [],
  compatibilityMatrix: [],
  stats: {
    totalGames,
    analyzedGames: 0,
    canRunMinimum: 0,
    canRunMedium: 0,
    canRunRecommended: 0,
    canRunUltra: 0,
    cannotRun: 0,
    verifiedMatches: 0,
    estimatedMatches: 0,
  },
});

const normalizeAnalysisResult = (analysisResult, totalGames = 0) => {
  const fallback = getFallbackAnalysis(totalGames);
  const source =
    analysisResult && typeof analysisResult === "object" ? analysisResult : {};

  return {
    ...fallback,
    ...source,
    bottlenecks:
      source.bottlenecks && typeof source.bottlenecks === "object"
        ? source.bottlenecks
        : fallback.bottlenecks,
    recommendations: Array.isArray(source.recommendations)
      ? source.recommendations.filter(Boolean)
      : fallback.recommendations,
    compatibilityMatrix: Array.isArray(source.compatibilityMatrix)
      ? source.compatibilityMatrix.filter(Boolean)
      : fallback.compatibilityMatrix,
    stats: {
      ...fallback.stats,
      ...(source.stats && typeof source.stats === "object" ? source.stats : {}),
    },
  };
};

function PerformanceCockpit({
  library = [],
}) {
  const [systemInfo, setSystemInfo] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [compatibilitySort, setCompatibilitySort] = useState("issue-severity");
  const [compatibilityPage, setCompatibilityPage] = useState(1);
  const [error, setError] = useState(null);
  const [personaProfile, setPersonaProfile] = useState(null);
  const [personaSynergy, setPersonaSynergy] = useState([]);
  const [budget, setBudget] = useState('');
  const [budgetRec, setBudgetRec] = useState(null);
  const [activeCurrency, setActiveCurrency] = useState(getCurrentCurrency());

  const analyzeSystem = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const rawInfo = await HardwareDetector.getSystemInfo();
      const fallbackInfo = getFallbackSystemInfo();
      const rawObject = rawInfo && typeof rawInfo === "object" ? rawInfo : {};
      const baseInfo = {
        ...fallbackInfo,
        ...rawObject,
        cpu: {
          ...fallbackInfo.cpu,
          ...(rawObject.cpu || {}),
        },
        gpu: {
          ...fallbackInfo.gpu,
          ...(rawObject.gpu || {}),
        },
        ram: {
          ...fallbackInfo.ram,
          ...(rawObject.ram || {}),
        },
        storage: Array.isArray(rawObject.storage)
          ? rawObject.storage
          : fallbackInfo.storage,
      };
      const scores = HardwareScoring.getOverallScore(baseInfo);
      const enrichedInfo = {
        ...baseInfo,
        scores: scores || fallbackInfo.scores,
      };
      const normalizedLibrary = Array.isArray(library)
        ? library.filter(Boolean)
        : [];

      PersonaPerformanceCompatibility.setSystemInfo(enrichedInfo);
      setSystemInfo(enrichedInfo);

      // Ensure the lazy-loaded requirements DB is in memory before analyzing
      // the library; otherwise every game would fall through to the estimate
      // path and the Performance page would show inaccurate data.
      await GameRequirements.ensureDatabaseLoaded().catch(() => { /* fall back to estimates */ });

      const result = BottleneckAnalyzer.analyzeLibrary(
        normalizedLibrary,
        enrichedInfo,
      );
      setAnalysis(normalizeAnalysisResult(result, normalizedLibrary.length));

      const personaSnapshot = UserBehaviorProfile.getPersonaSnapshot();
      setPersonaProfile(personaSnapshot);

      const synergyCandidates =
        personaSnapshot && normalizedLibrary.length
          ? normalizedLibrary
              .map((game) => {
                if (!game) return null;
                const compatibility =
                  PersonaPerformanceCompatibility.getCompatibility(
                    game,
                    enrichedInfo,
                  );
                if (
                  !compatibility ||
                  !compatibility.canRun ||
                  compatibility.settingsLevel === "cannot_run"
                ) {
                  return null;
                }

                const alignment = UserBehaviorProfile.getPersonaAlignmentScore({
                  mood: personaSnapshot.dominantMood,
                  genres: PersonaPerformanceInsights.extractGenres(
                    game,
                    personaSnapshot.dominantGenre,
                  ),
                  sessionMinutes:
                    PersonaPerformanceInsights.estimateSessionMinutes(game),
                });

                if (!alignment || alignment <= 0) {
                  return null;
                }

                const hardwareMatch =
                  PersonaPerformanceCompatibility.getHardwareMatchContribution(
                    compatibility,
                  ) || 0;
                const compositeScore = alignment * 0.6 + hardwareMatch * 0.4;

                return {
                  id: game.appid || game.app_id || game.steamAppId || game.name,
                  name: game.name || "Unknown Game",
                  alignment,
                  hardwareMatch,
                  compatibility,
                  compositeScore,
                  lastPlayed: game.last_played || null,
                };
              })
              .filter(Boolean)
              .sort((a, b) => b.compositeScore - a.compositeScore)
              .slice(0, 4)
          : [];

      setPersonaSynergy(synergyCandidates);
      setLoading(false);
    } catch (err) {
      console.error("Error analyzing system:", err);
      setError("Failed to analyze system. Please try again.");
      setLoading(false);
    }
  }, [library]);

  useEffect(() => {
    analyzeSystem();

    const handleStorageChange = (event) => {
      if (
        !event ||
        !event.key ||
        event.key === "gameLibrary" ||
        event.key === "systemInfo"
      ) {
        analyzeSystem();
      }
      if (event && event.key === "selectedCurrency") {
        setActiveCurrency(getCurrentCurrency());
      }
    };

    const handleFocus = () => {
      analyzeSystem();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [analyzeSystem]);

  const getScoreColor = (score) => {
    if (score >= 90) return "#00e676"; // Bright green
    if (score >= 75) return "#4caf50"; // Green
    if (score >= 60) return "#2196f3"; // Blue
    if (score >= 45) return "#ff9800"; // Orange
    return "#f44336"; // Red
  };

  const getScoreLabel = (score) => {
    if (score >= 90) return "🔥 Beast";
    if (score >= 75) return "💎 Excellent";
    if (score >= 60) return "🎮 Good";
    if (score >= 40) return "🎯 Budget";
    return "🦖 Weak";
  };

  const getPriorityColor = (priority) => {
    if (priority === "high") return "#f44336";
    if (priority === "medium") return "#ff9800";
    return "#4caf50";
  };

  const handleBudgetChange = (value) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num <= 0) {
      setBudget('');
      setBudgetRec(null);
      return;
    }
    setBudget(num);
    if (analysis && systemInfo) {
      const usdBudget = convertToUSD(num, activeCurrency);
      const rec = BottleneckAnalyzer.getBudgetRecommendation(
        usdBudget,
        analysis.bottlenecks,
        systemInfo,
        analysis.stats
      );
      setBudgetRec(rec);
    }
  };

  const convertCostString = (costString) => {
    if (typeof costString !== "string") {
      return "$0";
    }

    // Parse cost string like "$250-350" or "$50-150"
    const match = costString.match(/\$(\d+)-(\d+)/);
    if (!match) return costString;

    const minCost = parseInt(match[1]);
    const maxCost = parseInt(match[2]);
    const currency = activeCurrency;

    const minConverted = formatPrice(minCost, currency);
    const maxConverted = formatPrice(maxCost, currency);

    // Extract just the numeric part and currency symbol
    const minNum = minConverted.replace(/[^\d.]/g, "");
    const maxNum = maxConverted.replace(/[^\d.]/g, "");

    // Get currency symbol
    const symbols = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
      CAD: "C$",
      AUD: "A$",
      CHF: "CHF",
      CNY: "¥",
      INR: "₹",
      BRL: "R$",
      RUB: "₽",
    };
    const symbol = symbols[currency] || "$";

    return `${symbol}${minNum}-${maxNum}`;
  };

  const getPerformanceLabel = (level) => {
    return GameRequirements.getSettingsLabel(level)?.text || "Unknown";
  };

  const getPerformanceColor = (level) => {
    return GameRequirements.getSettingsLabel(level)?.color || "#6b7280";
  };

  const getMatchTypeLabel = (item) => {
    if (item?.isEstimate) return "Estimated";
    if (item?.matchType === "name") return "Name Match";
    return "Requirements DB";
  };

  const getBottleneckImpactScore = (item) => {
    if (
      !item?.bottlenecks ||
      !Array.isArray(item.bottlenecks) ||
      item.bottlenecks.length === 0
    )
      return 0;
    const impactOrder = { high: 3, medium: 2, low: 1 };
    return item.bottlenecks.reduce((total, bottleneck) => {
      const impact = bottleneck?.impact || "low";
      return total + (impactOrder[impact.toLowerCase()] || 0);
    }, 0);
  };

  const sortedCompatibilityMatrix = useMemo(() => {
    if (
      !analysis?.compatibilityMatrix ||
      !Array.isArray(analysis.compatibilityMatrix)
    )
      return [];
    const matrix = [...analysis.compatibilityMatrix];

    matrix.sort((a, b) => {
      if (compatibilitySort === "issue-severity") {
        if (a.canRun !== b.canRun) return a.canRun ? 1 : -1;
        const aScore = getBottleneckImpactScore(a);
        const bScore = getBottleneckImpactScore(b);
        if (aScore !== bScore) return bScore - aScore;
        const levelOrder = {
          cannot_run: 0,
          low: 1,
          high: 2,
          ultra: 3,
          unknown: 4,
        };
        return (
          (levelOrder[a.performanceLevel] || 0) -
            (levelOrder[b.performanceLevel] || 0) ||
          a.gameName.localeCompare(b.gameName)
        );
      }

      if (compatibilitySort === "performance") {
        const levelOrder = {
          ultra: 4,
          high: 3,
          low: 2,
          cannot_run: 1,
          unknown: 0,
        };
        return (
          (levelOrder[b.performanceLevel] || 0) -
            (levelOrder[a.performanceLevel] || 0) ||
          a.gameName.localeCompare(b.gameName)
        );
      }

      return a.gameName.localeCompare(b.gameName);
    });

    return matrix;
  }, [analysis?.compatibilityMatrix, compatibilitySort]);

  const matrixPageSize = 20;
  const matrixTotalPages = Math.max(
    1,
    Math.ceil((sortedCompatibilityMatrix.length || 0) / matrixPageSize),
  );
  const paginatedMatrix = useMemo(() => {
    const start = (compatibilityPage - 1) * matrixPageSize;
    return sortedCompatibilityMatrix.slice(start, start + matrixPageSize);
  }, [sortedCompatibilityMatrix, compatibilityPage]);

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

  if (!systemInfo || !analysis) {
    return (
      <div className="performance-cockpit">
        <NavBar />
        <div className="error-container">
          <AlertTriangle size={48} />
          <p>System analysis data is unavailable right now.</p>
          <button type="button" onClick={analyzeSystem}>
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  const readinessScore = Number(systemInfo?.scores?.overall || 0);

  return (
    <div className="performance-cockpit">
      <NavBar />

      <div className="cockpit-container">
        <div className="cockpit-header">
          <h1>
            <Gauge size={32} /> Performance Cockpit
          </h1>
          <p className="subtitle">
            System analysis and upgrade recommendations
          </p>
        </div>

        {/* System Readiness Score */}
        <div className="readiness-section">
          <div className="readiness-card">
            <h2>System Readiness</h2>
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
                    stroke={
                      readinessScore >= 75
                        ? "#4caf50"
                        : readinessScore >= 50
                          ? "#ff9800"
                          : "#f44336"
                    }
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
              {readinessScore >= 90 &&
                "🚀 Beast mode. Your PC laughs at system requirements."}
              {readinessScore >= 75 &&
                readinessScore < 90 &&
                "💎 Top-tier rig. Handles any game at maximum settings."}
              {readinessScore >= 60 &&
                readinessScore < 75 &&
                "🎮 Strong system. Runs most games on high settings."}
              {readinessScore >= 40 &&
                readinessScore < 60 &&
                "🎯 Capable system. Entry-level gaming performance."}
              {readinessScore < 40 &&
                "� Budget warrior. Stick to lighter games and older titles."}
            </p>
          </div>

          {/* Library Stats */}
          <div className="library-stats">
            <h3>Library Compatibility</h3>
            <p className="library-stats-summary">
              {analysis.stats.verifiedMatches} verified from known requirements
              • {analysis.stats.estimatedMatches} estimated from hardware
              heuristics • Library fit {analysis.overallScore}/100
            </p>
            <div className="stat-grid">
              <div className="stat-item">
                <div className="stat-icon" style={{ background: "#4caf50" }}>
                  <CheckCircle size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">
                    {analysis.stats.canRunUltra}
                  </span>
                  <span className="stat-label">Ultra Settings</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon" style={{ background: "#2196f3" }}>
                  <TrendingUp size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">
                    {analysis.stats.canRunRecommended}
                  </span>
                  <span className="stat-label">High Settings</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon" style={{ background: "#8ab4f8" }}>
                  <Zap size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">
                    {analysis.stats.canRunMedium}
                  </span>
                  <span className="stat-label">Medium Settings</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon" style={{ background: "#ff9800" }}>
                  <Zap size={24} />
                </div>
                <div className="stat-info">
                  <span className="stat-value">
                    {analysis.stats.canRunMinimum}
                  </span>
                  <span className="stat-label">Low Settings</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon" style={{ background: "#f44336" }}>
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
            <div className="persona-synergy-card">
              <div className="persona-header">
                <h2>
                  <Sparkles size={22} /> Rig + Persona Sweet Spots
                </h2>
                <span className="persona-identity subtle">
                  Local only • No cloud learning
                </span>
              </div>

              {personaSynergy.length === 0 && (
                <p className="persona-description">
                  Start tracking a few moods and we’ll spotlight games that suit
                  your identity and run brilliantly on this PC.
                </p>
              )}

              {personaSynergy.length > 0 && (
                <ul className="synergy-list">
                  {personaSynergy.map((item) => (
                    <li key={item.id} className="synergy-item">
                      <div className="synergy-header">
                        <div>
                          <h4>
                            <Gamepad2 size={18} /> {item.name}
                          </h4>
                          <span className="synergy-subline">
                            Alignment {item.alignment}% • Hardware{" "}
                            {item.hardwareMatch}%
                          </span>
                        </div>
                        <span
                          className="performance-badge"
                          style={{
                            background: getPerformanceColor(
                              item.compatibility.settingsLevel,
                            ),
                          }}
                        >
                          {getPerformanceLabel(
                            item.compatibility.settingsLevel,
                          )}
                        </span>
                      </div>
                      <p className="synergy-reason">
                        {PersonaPerformanceCompatibility.describeCompatibility(
                          item.compatibility,
                        )}
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
            <SpecCard
              icon={Cpu}
              title="CPU"
              model={systemInfo.cpu.model}
              details={`${systemInfo.cpu.cores} Cores @ ${systemInfo.cpu.speed} GHz`}
              badgeText={getScoreLabel(systemInfo.scores.cpu)}
              badgeColor={getScoreColor(systemInfo.scores.cpu)}
              score={systemInfo.scores.cpu}
              scoreColor={getScoreColor(systemInfo.scores.cpu)}
            />

            <SpecCard
              icon={Gauge}
              title="GPU"
              model={systemInfo.gpu.model}
              details={`${systemInfo.gpu.vramGB}GB VRAM`}
              badgeText={getScoreLabel(systemInfo.scores.gpu)}
              badgeColor={getScoreColor(systemInfo.scores.gpu)}
              score={systemInfo.scores.gpu}
              scoreColor={getScoreColor(systemInfo.scores.gpu)}
            />

            <SpecCard
              icon={MemoryStick}
              title="RAM"
              model={`${systemInfo.ram.total}GB ${systemInfo.ram.type}`}
              details={
                `${systemInfo.ram.speed > 0 ? `${systemInfo.ram.speed} MHz • ` : ""}` +
                `${systemInfo.ram.used}GB Used / ${systemInfo.ram.free}GB Free`
              }
              badgeText={getScoreLabel(systemInfo.scores.ram)}
              badgeColor={getScoreColor(systemInfo.scores.ram)}
              score={systemInfo.scores.ram}
              scoreColor={getScoreColor(systemInfo.scores.ram)}
            />

            {systemInfo.storage &&
              systemInfo.storage.map((drive, index) => {
                const driveColor = drive.isNVMe
                  ? "#00e676"
                  : drive.isSSD
                    ? "#4caf50"
                    : "#ff9800";
                const driveScore = drive.isNVMe ? 100 : drive.isSSD ? 90 : 50;
                return (
                  <SpecCard
                    key={index}
                    icon={HardDrive}
                    title={`Storage${systemInfo.storage.length > 1 ? ` #${index + 1}` : ""}`}
                    model={drive.name}
                    details={`${drive.type} • ${drive.size}GB Physical`}
                    badgeText={drive.isNVMe ? "NVMe" : drive.isSSD ? "SSD" : "HDD"}
                    badgeColor={driveColor}
                    score={driveScore}
                    scoreColor={driveColor}
                  >
                    {drive.partitions && drive.partitions.length > 0 && (
                      <div style={{ marginTop: "8px", fontSize: "0.9em" }}>
                        {drive.partitions.map((partition, pIndex) => (
                          <div key={pIndex} style={{ marginTop: "4px" }}>
                            <strong>{partition.mount}:</strong> {partition.free}
                            GB free of {partition.size}GB (
                            {partition.usePercent}% used)
                          </div>
                        ))}
                      </div>
                    )}
                  </SpecCard>
                );
              })}
          </div>
        </div>

        {/* Storage link */}
        <div className="storage-cockpit-section">
          <h2>Storage</h2>
          <p className="storage-cockpit-subtitle">
            Drive capacities and library space breakdown are handled in the Library Reclaimer.
          </p>
          <Link to="/storage-manager" className="storage-cockpit-link">
            Open Library Reclaimer
          </Link>
        </div>

        {/* Upgrade Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="recommendations-section">
            <h2>
              <AlertTriangle size={24} /> Upgrade Recommendations
            </h2>

            {/* Budget-based upgrade picker */}
            <div className="budget-upgrade-card">
              <h3>💰 Set Your Upgrade Budget</h3>
              <p className="budget-copy">
                Enter how much you're willing to spend and we'll tell you the best component to upgrade.
              </p>
              <div className="budget-input-row">
                <span className="budget-prefix">{getCurrencySymbol(activeCurrency)}</span>
                <input
                  type="number"
                  value={budget || ''}
                  onChange={(e) => handleBudgetChange(e.target.value)}
                  placeholder="e.g. 500"
                  className="budget-input"
                />
              </div>
              {budgetRec && (
                <div className={`budget-result ${budgetRec.withinBudget ? 'in-budget' : 'over-budget'}`}>
                  <div className="budget-result-header">
                    <span className="budget-result-component">{budgetRec.component.toUpperCase()}</span>
                    <span className="budget-result-cost">{convertCostString(budgetRec.estimatedCost)}</span>
                  </div>
                  <p className="budget-result-suggestion">{budgetRec.suggestion}</p>
                  <div className="budget-result-meta">
                    {budgetRec.fpsGain && (
                      <span className="budget-result-gain">{budgetRec.fpsGain}</span>
                    )}
                    <span className="budget-result-games">
                      Impacts {budgetRec.gamesAffected} game{budgetRec.gamesAffected !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>

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
                    <span className="rec-cost">
                      {convertCostString(rec.estimatedCost)}
                    </span>
                    <span className="rec-games">
                      {rec.gamesAffected} games affected
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game Compatibility Matrix */}
        {analysis.compatibilityMatrix.length > 0 && (
          <div className="compatibility-section">
            <div
              className="compatibility-header-row"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2>Game Compatibility Matrix</h2>
              <div className="compatibility-sort-control">
                <label
                  htmlFor="compatibility-sort"
                  style={{ marginRight: "8px", fontSize: "0.9rem" }}
                >
                  Sort by:
                </label>
                <select
                  id="compatibility-sort"
                  value={compatibilitySort}
                  onChange={(e) => {
                    setCompatibilitySort(e.target.value);
                    setCompatibilityPage(1);
                  }}
                >
                  <option value="issue-severity">Problem Severity</option>
                  <option value="performance">Performance Level</option>
                  <option value="name">Name</option>
                </select>
              </div>
            </div>
            <div className="compatibility-table">
              <table>
                <thead>
                  <tr>
                    <th>Cover</th>
                    <th>Game</th>
                    <th>Source</th>
                    <th>Can Run</th>
                    <th>Performance</th>
                    <th>FPS</th>
                    <th>Bottleneck</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMatrix.map((item, index) => (
                    <tr key={index}>
                      <td
                        className="game-cover"
                        style={{ width: "60px", padding: "4px" }}
                      >
                        <LazyImage
                          src={item.gameImage}
                          alt={item.gameName}
                          placeholder="https://placehold.co/60x60.png?text=?"
                          style={{
                            width: "56px",
                            height: "56px",
                            objectFit: "cover",
                            borderRadius: "6px",
                          }}
                          gameName={item.gameName}
                        />
                      </td>
                      <td className="game-name">{item.gameName}</td>
                      <td className="match-type-cell">
                        <span
                          className={`match-type-badge ${item.isEstimate ? "estimated" : "verified"}`}
                        >
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
                          style={{
                            background: getPerformanceColor(
                              item.performanceLevel,
                            ),
                          }}
                        >
                          {getPerformanceLabel(item.performanceLevel)}
                        </span>
                      </td>
                      <td className="score">{item.fps}</td>
                      <td className="bottleneck">
                        {item.bottleneck ? (
                          <span className="bottleneck-tag">
                            {item.bottleneck.toUpperCase()}
                          </span>
                        ) : (
                          <span style={{ opacity: 0.5 }}>None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sortedCompatibilityMatrix.length > matrixPageSize && (
              <div className="compatibility-pagination">
                <button
                  type="button"
                  className="pagination-button"
                  disabled={compatibilityPage <= 1}
                  onClick={() => setCompatibilityPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {compatibilityPage} of {matrixTotalPages}
                </span>
                <button
                  type="button"
                  className="pagination-button"
                  disabled={compatibilityPage >= matrixTotalPages}
                  onClick={() => setCompatibilityPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PerformanceCockpit;
