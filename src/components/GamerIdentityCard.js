import React, { useMemo, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LocalShareService } from '../services/LocalShareService';
import { resolveGameArtworkBundle } from '../services/GameArtworkService';
import {
  User,
  Download,
  Share2,
  Clock,
  Gamepad2,
  BarChart3,
  Sparkles,
  Zap,
  Medal,
  ScanEye,
  ChevronDown,
  Dices,
  Hourglass,
} from 'lucide-react';
import { UserBehaviorProfile } from '../services/UserBehaviorProfile';
import { StatsAggregationService } from '../services/StatsAggregationService';
import GamingPersonaService from '../services/GamingPersonaService';
import SignatureTitleService from '../services/SignatureTitleService';
import CurrentEraService from '../services/CurrentEraService';
import PersonaHistoryService from '../services/PersonaHistoryService';
import { StartupPersonalizationService } from '../services/StartupPersonalizationService';
import { getPersonaVisual, accentToRgb, getPersonaTier, PERSONA_TIERS } from './personaVisuals';
import './GamerIdentityCard.css';

const StatPill = ({ icon: Icon, label, value }) => (
  <div className="gamer-stat-pill">
    <Icon size={14} />
    <span className="gamer-stat-label">{label}</span>
    <span className="gamer-stat-value">{value}</span>
  </div>
);

const CONFIDENCE_META = {
  high: { label: 'Locked in', className: 'is-confirmed' },
  confirmed: { label: 'Locked in', className: 'is-confirmed' },
  medium: { label: 'Learning', className: 'is-growing' },
  growing: { label: 'Learning', className: 'is-growing' },
  low: { label: 'Early read', className: 'is-provisional' },
  provisional: { label: 'Early read', className: 'is-provisional' },
};

const normalizeName = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

// The roast paragraph reads like a rap sheet: first sentence is the headline
// charge, the rest are the counts against them.
const splitRoast = (text) => {
  const sentences = String(text || '')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length <= 1) return { headline: text || '', charges: [] };
  return { headline: sentences[0], charges: sentences.slice(1, 4) };
};

const fillTraitDescription = (trait, dominantGenre) =>
  String(trait?.description || '').replace(
    'GENRE_PLACEHOLDER',
    trait?.meta?.dominantGenre || dominantGenre || 'their favorite genre'
  );

const loadShareImage = (sources) =>
  new Promise((resolve) => {
    const tryNext = (index) => {
      if (index >= sources.length) {
        resolve(null);
        return;
      }
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => tryNext(index + 1);
      image.src = sources[index];
    };
    tryNext(0);
  });

const truncateCanvasText = (ctx, value, maxWidth) => {
  let label = String(value);
  if (ctx.measureText(label).width <= maxWidth) return label;
  while (label.length && ctx.measureText(`${label}…`).width > maxWidth) label = label.slice(0, -1);
  return `${label}…`;
};

// Both the download and the share button rasterize the same canvas so the
// copied image matches the exported card exactly — no text-only share path.
export const buildIdentityCanvas = async (identity) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const width = 800;
  const height = 480;
  canvas.width = width * 2;
  canvas.height = height * 2;
  ctx.scale(2, 2);

  const accent = identity.visual?.accent || '#3dd9ff';
  const accentRgb = identity.accentRgb || '61, 217, 255';

  // Background gradient based on persona
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(1, '#1e293b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Top-played game cover on the right — the same artwork the in-app card is
  // drawn from, so the shared image shows what the app shows.
  const bundle = identity.topGame
    ? resolveGameArtworkBundle(identity.topGame, { surface: 'portrait', fallbackSurface: 'library_card' })
    : null;
  const sources = bundle ? [bundle.artwork, bundle.fallbackSrc, bundle.placeholder].filter(Boolean) : [];
  const cover = sources.length > 0 ? await loadShareImage(sources) : null;
  const panelX = 552;
  const panelY = 66;
  const panelW = 216;
  const panelH = 310;
  if (cover && ctx.drawImage) {
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(panelX, panelY, panelW, panelH, 14);
    } else {
      ctx.rect(panelX, panelY, panelW, panelH);
    }
    ctx.clip();
    const imageRatio = cover.width / cover.height;
    const boxRatio = panelW / panelH;
    let drawW = panelW;
    let drawH = panelH;
    let drawX = panelX;
    let drawY = panelY;
    if (imageRatio > boxRatio) {
      drawW = panelH * imageRatio;
      drawX = panelX - (drawW - panelW) / 2;
    } else {
      drawH = panelW / imageRatio;
      drawY = panelY - (drawH - panelH) / 2;
    }
    ctx.drawImage(cover, drawX, drawY, drawW, drawH);
    const fade = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    fade.addColorStop(0, 'rgba(15, 23, 42, 0)');
    fade.addColorStop(1, 'rgba(15, 23, 42, 0.55)');
    ctx.fillStyle = fade;
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.restore();
    ctx.strokeStyle = `rgba(${accentRgb}, 0.35)`;
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.fillText('MOST PLAYED', panelX, panelY + panelH + 26);
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(truncateCanvasText(ctx, identity.topGame?.name || '', panelW), panelX, panelY + panelH + 50);
  }

  // Accent bar in the persona's own color
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, width, 6);

  // Title
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('GamePilot Identity', 32, 52);

  // Persona label in the persona accent
  ctx.fillStyle = accent;
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(identity.label, 32, 110);

  // Earned signature title sits under the persona like a title card.
  let textY = 148;
  if (identity.signatureTitle?.name) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`★ ${identity.signatureTitle.name.toUpperCase()}`, 32, 136);
    textY = 162;
  }

  // Description
  ctx.fillStyle = '#94a3b8';
  ctx.font = '18px sans-serif';
  const words = identity.description.split(' ');
  let line = '';
  let y = textY;
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > 500 && line !== '') {
      ctx.fillText(line, 32, y);
      line = word + ' ';
      y += 26;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, 32, y);

  // Tags
  let tagX = 32;
  const tagY = y + 40;
  ctx.font = '14px sans-serif';
  identity.tags.slice(0, 4).forEach((tag) => {
    const textWidth = ctx.measureText(tag).width + 20;
    ctx.fillStyle = `rgba(${accentRgb}, 0.15)`;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(tagX, tagY - 18, textWidth, 28, 6);
    } else {
      ctx.rect(tagX, tagY - 18, textWidth, 28);
    }
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillText(tag, tagX + 10, tagY);
    tagX += textWidth + 10;
  });

  // Stats grid
  const stats = [
    { label: 'Games', value: String(identity.totalGames) },
    { label: 'Hours', value: String(identity.totalHours) },
    { label: 'Sessions', value: String(identity.totalSessions) },
    { label: 'Avg Session', value: `${identity.avgSession}m` },
  ];

  let statX = 32;
  const statY = tagY + 60;
  stats.forEach((stat) => {
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.fillText(stat.label.toUpperCase(), statX, statY);
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(stat.value, statX, statY + 28);
    statX += 140;
  });

  // Footer
  ctx.fillStyle = '#475569';
  ctx.font = '12px sans-serif';
  ctx.fillText('Generated by GamePilot — Your Gaming Librarian', 32, height - 20);

  return canvas;
};

const MARATHON_MAP = {
  short: { label: 'Sprint', fill: 0.3 },
  medium: { label: 'Steady', fill: 0.6 },
  long: { label: 'Marathon', fill: 1 },
  weekend: { label: 'Weekender', fill: 0.5 },
};

const GamerIdentityCard = ({ library = [], className = '' }) => {
  const cardRef = useRef(null);
  const navigate = useNavigate();
  const [shareStatus, setShareStatus] = useState('');
  const [roastSeed, setRoastSeed] = useState(null);

  const identity = useMemo(() => {
    if (!Array.isArray(library)) {
      return null;
    }

    const persona = GamingPersonaService.getPersona(null, roastSeed);
    const primary = persona?.primaryPersona || null;
    const dashboard = StatsAggregationService.getDashboardData(library);
    const allTime = dashboard?.periods?.all;
    const trackedMinutes = Number(allTime?.playtimeMinutes) || 0;
    const importedMinutes = Number(dashboard?.importedPlaytime?.totalMinutes) || 0;
    let topGame = null;
    let topGameMinutes = 0;
    const libraryMinutes = library.reduce((sum, game) => {
      const mins = Math.max(
        Number(game?.time_played) || 0,
        Number(game?.playtime?.total) || 0,
        Number(game?.importedPlaytimeMinutes) || 0
      );
      if (mins > topGameMinutes) {
        topGameMinutes = mins;
        topGame = game;
      }
      return sum + mins;
    }, 0);
    const lifetimeMinutes = Math.max(trackedMinutes, importedMinutes, libraryMinutes);

    const topMoods = UserBehaviorProfile.getTopMoods(3);
    const topGenres = UserBehaviorProfile.getTopGenres(3);
    const peakHours = UserBehaviorProfile.getPeakPlayHours(1);
    // Recent-play identity signals: the persona's dominant genre and peak hour
    // come from the current rotation (adaptive session pool), falling back to
    // all-time behavior stats only when no recent signal exists.
    const recentGenre = persona?.signals?.dominantGenre || null;
    const recentPeakHour = Number.isFinite(persona?.signals?.peakHour) ? persona.signals.peakHour : null;

    const visual = getPersonaVisual(primary?.theme?.id, primary?.id);
    const roastText = persona?.summaryRoast || primary?.roast || 'Building your gaming identity one session at a time.';
    const { headline, charges } = splitRoast(roastText);

    // Earned signature title for the game anchoring this persona ("Zomboid
    // Survivor"); falls back to any unlocked title when the anchor has none.
    const anchorName = primary?.basedOnGame || topGame?.name || null;
    let signatureTitle = null;
    try {
      signatureTitle =
        SignatureTitleService.getTitleForGame(anchorName, library) ||
        SignatureTitleService.getSignatureTitles(library).find((t) => t.unlocked) ||
        null;
    } catch {
      signatureTitle = null;
    }

    // Receipts: the games the verdict is built on, with real cover art.
    const receipts = (persona?.topGames || [])
      .slice(0, 3)
      .map((entry) => {
        const key = normalizeName(entry?.name);
        const libGame = key && library.find((g) => normalizeName(g?.name || g?.title || g?.gameName) === key);
        const bundle = resolveGameArtworkBundle(libGame || { name: entry?.name }, { surface: 'library_card' });
        const minutes = Math.max(Number(entry?.minutes) || 0, Number(entry?.lifetimeMinutes) || 0);
        const hours = Math.round(minutes / 60);
        return {
          name: entry?.name,
          art: bundle?.artwork || bundle?.fallbackSrc || null,
          hours: hours > 0 ? `${hours}h` : '<1h',
        };
      })
      .filter((r) => r.name);

    // The next-closest archetype, when it's within striking distance — makes
    // the verdict feel like a live read instead of a permanent label.
    const secondary = persona?.secondaryPersona || null;
    const rival =
      primary && secondary && Number.isFinite(secondary.score) && Number.isFinite(primary.score)
        ? secondary.score >= primary.score - 20 && secondary.score >= 30
          ? secondary
          : null
        : null;

    // Persona flip-history + the current era — both recorded live so the card
    // is a single character sheet, not a fragment.
    try {
      PersonaHistoryService.record(primary);
    } catch {
      /* history is best-effort */
    }
    const pastLives = PersonaHistoryService.getPastLives(primary?.id).slice(0, 4);
    const yearbook = PersonaHistoryService.getYearbook().slice(0, 5);
    let era = null;
    try {
      const current = CurrentEraService.getCurrentEra();
      if (current?.snapshot?.totalMinutes > 0) era = current;
    } catch {
      era = null;
    }

    // Character-sheet attributes, all derived from real persona signals.
    const s = persona?.signals || {};
    const sheetStats = [
      Number.isFinite(s.unplayedRatio) && {
        name: 'Hoarding',
        value: `${s.unplayedRatio}%`,
        fill: s.unplayedRatio / 100,
        hint: `${s.neverPlayedGames || 0} games never played`,
      },
      Number.isFinite(s.top3SessionShare) && {
        name: 'Focus',
        value: `${s.top3SessionShare}%`,
        fill: s.top3SessionShare / 100,
        hint: 'Top 3 games share of sessions',
      },
      MARATHON_MAP[s.sessionPattern] && {
        name: 'Marathon',
        value: MARATHON_MAP[s.sessionPattern].label,
        fill: MARATHON_MAP[s.sessionPattern].fill,
        hint: 'Average session length',
      },
      Number.isFinite(s.challengeRatio) && {
        name: 'Pain Tolerance',
        value: `${s.challengeRatio}%`,
        fill: s.challengeRatio / 100,
        hint: 'Share of playtime in punishing games',
      },
    ].filter(Boolean);

    const tier = getPersonaTier(primary?.score);

    return {
      label: primary?.label || 'Gamer in Progress',
      description: roastText,
      roastHeadline: headline,
      roastCharges: charges,
      traits: (persona?.subTraits || []).slice(0, 4),
      tags: (persona?.subTraits || []).map((trait) => trait.label),
      evidence: primary?.evidence || [],
      signatureTitle,
      receipts,
      rival,
      tier,
      tierMeta: PERSONA_TIERS[tier],
      era,
      sheetStats,
      pastLives,
      yearbook,
      visual,
      accentRgb: accentToRgb(visual.accent),
      contextLine: persona?.contextLine || null,
      totalGames: library.length,
      totalHours: Math.round(lifetimeMinutes / 60),
      totalSessions: allTime?.sessions || 0,
      avgSession: allTime?.avgSessionMinutes || 0,
      topGame,
      topMoods,
      topGenres,
      recentGenre,
      peakWindow:
        recentPeakHour !== null
          ? UserBehaviorProfile.getTimeOfDay(recentPeakHour)
          : peakHours[0]?.timeOfDay || 'Unknown',
      confidence: persona?.confidence || 'low',
      blendFactor: persona?.blendFactor ?? 0,
      dominantGenre: recentGenre || topGenres[0]?.genre || null,
    };
  }, [library, roastSeed]);

  // Confidence + warm-up state, merged in from the former IdentitySnapshotCard
  // so this is the single persona statement on the identity view.
  const confidenceMeta = CONFIDENCE_META[identity?.confidence] || null;
  const canTune = (() => {
    try {
      return !StartupPersonalizationService.hasCompletedOnboarding();
    } catch {
      return false;
    }
  })();
  const provisionalNote =
    identity && identity.blendFactor < 1
      ? 'Warming up — blending your library with tracked play until ~10h of recent sessions.'
      : canTune
        ? 'Still learning your tastes — a quick tune-up sharpens recommendations.'
        : null;

  const handleExport = useCallback(async () => {
    if (!cardRef.current || !identity) return;

    try {
      const canvas = await buildIdentityCanvas(identity);

      // Download
      const link = document.createElement('a');
      link.download = `gamepilot-identity-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.warn('GamerIdentityCard export failed:', e);
    }
  }, [identity]);

  const handleShare = useCallback(async () => {
    if (!identity) return;
    try {
      const canvas = await buildIdentityCanvas(identity);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      const copied = blob
        ? await LocalShareService.copyImageToClipboard(blob, `gamepilot-identity-${Date.now()}.png`)
        : false;
      setShareStatus(
        copied ? 'Card image copied. Paste it wherever you share.' : 'Could not copy the image. Try exporting instead.'
      );
    } catch {
      setShareStatus('Could not copy the image. Try exporting instead.');
    }
  }, [identity]);

  if (!identity) {
    return (
      <div className={`gamer-identity-card empty ${className}`}>
        <User size={32} />
        <p>Play more games to generate your gamer identity card.</p>
      </div>
    );
  }

  const VisualIcon = identity.visual.icon;

  return (
    <div
      className={`gamer-identity-card ${className}`}
      ref={cardRef}
      style={{
        '--persona-accent': identity.visual.accent,
        '--persona-accent-rgb': identity.accentRgb,
      }}
    >
      <div className="gamer-card-header">
        <div className="gamer-card-title">
          <Sparkles size={18} />
          <span>Gamer Identity</span>
          {confidenceMeta && (
            <span className={`gamer-confidence-badge ${confidenceMeta.className}`}>{confidenceMeta.label}</span>
          )}
          {identity.tierMeta && (
            <span className={`gamer-tier-badge ${identity.tierMeta.className}`}>{identity.tierMeta.label}</span>
          )}
        </div>
        <div className="gamer-card-actions">
          <button
            type="button"
            className="gamer-card-btn"
            onClick={() => setRoastSeed(Math.floor(Math.random() * 1e9))}
            title="Reroll the roast"
          >
            <Dices size={16} />
          </button>
          <button type="button" className="gamer-card-btn" onClick={handleExport} title="Export as image">
            <Download size={16} />
          </button>
          <button type="button" className="gamer-card-btn" onClick={handleShare} title="Copy card image">
            <Share2 size={16} />
          </button>
        </div>
      </div>

      {shareStatus && <p role="status">{shareStatus}</p>}
      <div className="gamer-card-identity">
        <div className="gamer-avatar">
          <VisualIcon size={30} />
        </div>
        <div className="gamer-identity-body">
          <h4 className="gamer-identity-label">{identity.label}</h4>
          {identity.signatureTitle && (
            <p className="gamer-epithet">
              <Medal size={13} />
              <span>{identity.signatureTitle.name}</span>
            </p>
          )}
          <p className="gamer-identity-desc gamer-roast-headline">{identity.roastHeadline}</p>
          {identity.roastCharges.length > 0 && (
            <ul className="gamer-roast-charges">
              {identity.roastCharges.map((charge, index) => (
                <li key={index}>{charge}</li>
              ))}
            </ul>
          )}
          <div className="gamer-identity-tags">
            {identity.traits.map((trait) => {
              const evidence = Array.isArray(trait.evidence) ? trait.evidence : [];
              const tip = fillTraitDescription(trait, identity.dominantGenre);
              const hasTip = Boolean(tip) || evidence.length > 0;
              return (
                <span key={trait.id || trait.label} className="gamer-tag" tabIndex={hasTip ? 0 : undefined}>
                  {trait.label}
                  {hasTip && (
                    <span className="gamer-tag-tip" role="tooltip">
                      {tip && <span className="gamer-tag-tip-desc">{tip}</span>}
                      {evidence.map((line, index) => (
                        <span key={index} className="gamer-tag-tip-evidence">
                          {line}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {identity.era && (
        <div className="gamer-era-strip">
          <Hourglass size={14} />
          <span className="gamer-era-name">{identity.era.name}</span>
          <span className="gamer-era-meta">
            {identity.era.estimated ? 'Estimated era' : `Day ${identity.era.dayCount || 1}`}
            {identity.era.gameDominated && identity.era.dominantGameShare && identity.era.topGame
              ? ` · ${Math.round(identity.era.dominantGameShare * 100)}% ${identity.era.topGame}`
              : ''}
          </span>
        </div>
      )}

      {identity.receipts.length > 0 && (
        <div className="gamer-receipts">
          <span className="gamer-receipts-label">Convicted by</span>
          <div className="gamer-receipts-list">
            {identity.receipts.map((receipt) => (
              <span className="gamer-receipt" key={receipt.name} title={`${receipt.hours} in ${receipt.name}`}>
                {receipt.art ? (
                  <img className="gamer-receipt-art" src={receipt.art} alt="" loading="lazy" />
                ) : (
                  <span className="gamer-receipt-art is-fallback">
                    <Gamepad2 size={13} />
                  </span>
                )}
                <span className="gamer-receipt-name">{receipt.name}</span>
                <span className="gamer-receipt-hours">{receipt.hours}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {identity.sheetStats.length > 0 && (
        <div className="gamer-sheet">
          <span className="gamer-sheet-label">Attributes</span>
          <div className="gamer-sheet-stats">
            {identity.sheetStats.map((stat) => (
              <div className="gamer-sheet-stat" key={stat.name} title={stat.hint}>
                <span className="gamer-sheet-name">{stat.name}</span>
                <div className="gamer-sheet-track">
                  <div className="gamer-sheet-fill" style={{ width: `${Math.round(stat.fill * 100)}%` }} />
                </div>
                <span className="gamer-sheet-value">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="gamer-card-stats">
        <StatPill icon={Gamepad2} label="Games" value={identity.totalGames} />
        <StatPill icon={Clock} label="Hours" value={identity.totalHours} />
        <StatPill icon={Zap} label="Sessions" value={identity.totalSessions} />
        <StatPill icon={BarChart3} label="Avg" value={`${identity.avgSession}m`} />
      </div>

      {identity.pastLives.length > 0 && (
        <div className="gamer-past-lives">
          <span className="gamer-past-lives-label">Past lives</span>
          <div className="gamer-past-lives-list">
            {identity.pastLives.map((life) => {
              const LifeIcon = getPersonaVisual(life.themeId, life.id).icon;
              return (
                <span className="gamer-past-life" key={`${life.id}-${life.since}`}>
                  <LifeIcon size={13} />
                  <span>{life.label}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {identity.yearbook.length > 0 && (
        <div className="gamer-yearbook">
          <span className="gamer-past-lives-label">Yearbook</span>
          <div className="gamer-past-lives-list">
            {identity.yearbook.map((entry) => {
              const YearIcon = getPersonaVisual(entry.themeId, entry.id).icon;
              return (
                <span className="gamer-past-life gamer-yearbook-chip" key={entry.year}>
                  <span className="gamer-yearbook-year">{entry.year}</span>
                  <YearIcon size={13} />
                  <span>{entry.label}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="gamer-card-footer">
        <span>Peak: {identity.peakWindow}</span>
        {(identity.recentGenre || identity.topGenres.length > 0) && (
          <span>Top Genre: {identity.recentGenre || identity.topGenres[0].genre}</span>
        )}
        {identity.rival && <span className="gamer-rival">Creeping up: {identity.rival.label}</span>}
      </div>
      {identity.evidence.length > 0 && (
        <details className="gamer-evidence">
          <summary>
            <ScanEye size={13} />
            <span>Why this verdict</span>
            <ChevronDown size={13} className="gamer-evidence-caret" />
          </summary>
          <ul>
            {identity.evidence.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        </details>
      )}
      {identity.contextLine && (
        <div className="gamer-card-footer">
          <span>{identity.contextLine}</span>
        </div>
      )}
      {provisionalNote && (
        <div className="gamer-card-footer gamer-provisional-note">
          <span>
            {provisionalNote}
            {canTune && (
              <>
                {' '}
                <button type="button" className="gamer-tune-link" onClick={() => navigate('/profile')}>
                  Tune recommendations →
                </button>
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
};

export default GamerIdentityCard;
