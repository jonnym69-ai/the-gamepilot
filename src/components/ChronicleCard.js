import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronDown, Download, Feather, ScrollText } from 'lucide-react';
import SessionRepository from '../services/SessionRepository';
import { buildChronicle } from '../services/ChronicleService';
import GamingPersonaService from '../services/GamingPersonaService';
import GameCapturesService from '../services/GameCapturesService';
import { LocalShareService } from '../services/LocalShareService';
import { resolveGameArtworkBundle, getGameArtworkPlaceholder } from '../services/GameArtworkService';
import { getPersonaVisual } from './personaVisuals';
import { formatPlaytime } from '../utils/formatPlaytime';
import LazyImage from './LazyImage';
import './ChronicleCard.css';

const formatFooterDate = (ms) => {
  const date = new Date(ms);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatReceiptDate = (ms) => {
  const date = new Date(ms);
  if (!Number.isFinite(date.getTime())) return 'Undated session';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const monthKeyOf = (ms) => {
  const date = new Date(ms);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const useProtagonist = () =>
  useMemo(() => {
    try {
      const identity = GamingPersonaService.getPublicIdentity();
      const primary = identity?.primary;
      if (!identity?.label || !primary || identity?.confidence === 'low') {
        return { label: 'the player', visual: null };
      }
      return {
        label: identity.label,
        visual: getPersonaVisual(primary.theme?.id, primary.id),
      };
    } catch {
      return { label: 'the player', visual: null };
    }
  }, []);

const findChapterCapture = (chapter, names, capturesByGame) => {
  for (const name of names.filter(Boolean)) {
    const captures = capturesByGame.get(name) || [];
    const inMonth = captures
      .filter((capture) => monthKeyOf(capture.capturedAt) === chapter.key)
      .sort((a, b) => b.capturedAt - a.capturedAt);
    if (inMonth.length > 0) return { capture: inMonth[0], gameName: name };
  }
  return null;
};

const ChronicleChapter = ({ chapter, previousChapter, libraryByName, capturesByGame, expanded, onToggle }) => {
  const dominantName = chapter.dominantGame?.name;
  const repeatsPrevious =
    dominantName && previousChapter?.dominantGame?.name?.toLowerCase() === dominantName.toLowerCase();
  const alternateName = repeatsPrevious ? chapter.month.topGames?.[1]?.name : null;
  const visualName = alternateName || dominantName;
  const captureMatch = findChapterCapture(chapter, [visualName, dominantName], capturesByGame);
  const capture = captureMatch?.capture || null;
  const [captureSrc, setCaptureSrc] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [shareState, setShareState] = useState('idle');
  const shareCardRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setCaptureSrc(null);
    if (!capture) return undefined;
    const resolve =
      capture.kind === 'image'
        ? GameCapturesService.readImageDataUrl(capture)
        : GameCapturesService.getClipPosterFrame(capture, { maxWidth: 1400 });
    resolve.then((dataUrl) => {
      if (!cancelled && dataUrl) setCaptureSrc(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [capture]);

  const game = visualName ? libraryByName.get(visualName.toLowerCase()) : null;
  const stub = visualName ? { name: visualName, platform: game?.platform } : null;
  const bundle = resolveGameArtworkBundle(game || stub, { surface: 'hero', fallbackSurface: 'portrait' });
  const placeholder = bundle.placeholder || (stub ? getGameArtworkPlaceholder({ game: stub, surface: 'hero' }) : null);
  const visualSrc = captureSrc || bundle.artwork;
  const visualGameName = captureMatch?.gameName || visualName;

  useEffect(() => {
    if (!sharing) return undefined;
    const timer = setTimeout(async () => {
      try {
        if (!shareCardRef.current) throw new Error('Share card is not mounted');
        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(shareCardRef.current, {
          scale: 2,
          backgroundColor: '#0b0b10',
          useCORS: true,
          logging: false,
        });
        const fileName = `chronicle-${chapter.key}.png`;
        const result = await LocalShareService.downloadImageFromCanvas(canvas, fileName);
        setShareState(result?.success ? 'saved' : 'error');
      } catch {
        setShareState('error');
      } finally {
        setSharing(false);
      }
    }, 80);
    return () => clearTimeout(timer);
  }, [sharing, chapter.key]);

  const receipts = chapter.month.receipts || [];
  const share = chapter.dominantGame?.share;
  const lastIndex = chapter.paragraphs.length - 1;

  return (
    <section
      id={`chronicle-chapter-${chapter.key}`}
      className={`chronicle-chapter${chapter.isCurrent ? ' is-current' : ''}${expanded ? ' is-expanded' : ''}`}
      aria-label={chapter.title}
    >
      <div className={`chronicle-chapter-visual${visualSrc ? ' has-artwork' : ''}`}>
        {visualSrc && (
          <LazyImage
            src={visualSrc}
            alt={`${visualGameName} chapter artwork`}
            placeholder={placeholder}
            fallbackSrc={bundle.fallbackSrc}
            gameName={visualGameName}
            platform={game?.platform}
            className="chronicle-banner-img"
          />
        )}
        <button
          type="button"
          className="chronicle-chapter-head"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`chronicle-pages-${chapter.key}`}
        >
          <span className="chronicle-chapter-heading">
            <span className="chronicle-chapter-title">{chapter.title}</span>
            <span className="chronicle-chapter-dates">{chapter.subtitle}</span>
          </span>
          <ChevronDown size={17} className="chronicle-chapter-chevron" aria-hidden="true" />
        </button>
        {visualSrc && (
          <span className="chronicle-artwork-credit">
            {captureSrc ? `Your capture · ${captureMatch.gameName}` : visualGameName}
          </span>
        )}
      </div>

      {expanded && (
        <div id={`chronicle-pages-${chapter.key}`} className="chronicle-chapter-pages">
          <div className="chronicle-prose-block">
            {chapter.paragraphs.map((text, index) => (
              <p
                key={index}
                className={`chronicle-prose${chapter.isCurrent && index === lastIndex ? ' chronicle-still-writing' : ''}`}
              >
                {text}
                {chapter.isCurrent && index === lastIndex && (
                  <span className="chronicle-writing-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                )}
              </p>
            ))}
          </div>

          <div className="chronicle-margin-notes">
            {Number.isFinite(chapter.month.minutes) && chapter.month.minutes > 0 && (
              <span className="chronicle-note">
                <strong>{formatPlaytime(chapter.month.minutes)}</strong> played
              </span>
            )}
            <span className="chronicle-note">
              <strong>{chapter.month.sessions}</strong> session{chapter.month.sessions === 1 ? '' : 's'}
            </span>
            {chapter.month.varietyCount > 0 && (
              <span className="chronicle-note">
                <strong>{chapter.month.varietyCount}</strong> game{chapter.month.varietyCount === 1 ? '' : 's'}
              </span>
            )}
            {Number.isFinite(share) && share > 0 && (
              <span className="chronicle-note">
                <strong>{Math.round(share * 100)}%</strong> {chapter.dominantGame.name}
              </span>
            )}
          </div>

          <div className="chronicle-chapter-actions">
            {receipts.length > 0 && (
              <details className="chronicle-receipts">
                <summary>
                  <ScrollText size={13} aria-hidden="true" /> Receipts · {receipts.length} recorded session
                  {receipts.length === 1 ? '' : 's'}
                </summary>
                <ol className="chronicle-receipt-list">
                  {receipts.map((receipt, index) => (
                    <li key={`${receipt.startMs}-${receipt.gameName}-${index}`}>
                      <span className="chronicle-receipt-date">{formatReceiptDate(receipt.startMs)}</span>
                      <span className="chronicle-receipt-game">{receipt.gameName || 'Untracked game'}</span>
                      <strong>{formatPlaytime(receipt.minutes)}</strong>
                    </li>
                  ))}
                </ol>
              </details>
            )}
            <button
              type="button"
              className="chronicle-share-button"
              onClick={() => {
                setShareState('idle');
                setSharing(true);
              }}
              disabled={sharing}
            >
              <Download size={14} aria-hidden="true" />
              {sharing
                ? 'Rendering…'
                : shareState === 'saved'
                  ? 'Saved'
                  : shareState === 'error'
                    ? 'Try again'
                    : 'Share chapter'}
            </button>
          </div>
        </div>
      )}

      {sharing && (
        <div className="chronicle-share-stage" aria-hidden="true">
          <div ref={shareCardRef} className="chronicle-share-card">
            <div className="chronicle-share-kicker">YOUR CHRONICLE · {chapter.subtitle}</div>
            <h3>{chapter.title}</h3>
            {visualSrc && <img src={visualSrc} alt="" className="chronicle-share-artwork" />}
            <div className="chronicle-share-prose">
              {chapter.paragraphs.slice(0, 2).map((text, index) => (
                <p key={index}>{text}</p>
              ))}
            </div>
            <div className="chronicle-share-stats">
              <strong>{formatPlaytime(chapter.month.minutes)}</strong>
              <span>{chapter.month.sessions} sessions</span>
              <span>{chapter.month.varietyCount} games</span>
            </div>
            <div className="chronicle-share-watermark">GamePilot · your gaming biography</div>
          </div>
        </div>
      )}
    </section>
  );
};

const ChronicleCard = ({ library = [], username = '' }) => {
  const sessions = useMemo(() => SessionRepository.getSessionHistory(), []);
  const chronicle = useMemo(() => {
    try {
      return buildChronicle(sessions, library);
    } catch {
      return null;
    }
  }, [sessions, library]);
  const protagonist = useProtagonist();
  const [capturesByGame, setCapturesByGame] = useState(() => new Map());
  const chapterKeys = chronicle?.chapters.map((chapter) => chapter.key).join('|') || '';
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());

  useEffect(() => {
    setExpandedKeys(new Set(chapterKeys ? chapterKeys.split('|') : []));
  }, [chapterKeys]);

  useEffect(() => {
    let cancelled = false;
    GameCapturesService.getAttribution({ library })
      .then((result) => {
        if (!cancelled) setCapturesByGame(result?.byGame || new Map());
      })
      .catch(() => {
        if (!cancelled) setCapturesByGame(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, [library]);

  const libraryByName = useMemo(() => {
    const map = new Map();
    (Array.isArray(library) ? library : []).forEach((game) => {
      const key = String(game?.name || '')
        .trim()
        .toLowerCase();
      if (key && !map.has(key)) map.set(key, game);
    });
    return map;
  }, [library]);

  if (!chronicle) return null;

  const { facts, prologue, chapters } = chronicle;
  const isEmpty = !prologue?.exists && chapters.length === 0;
  const ProtagonistIcon = protagonist.visual?.icon || Feather;
  const protagonistAccent = protagonist.visual?.accent;
  const firstYear = facts.firstSession?.startedAt ? new Date(facts.firstSession.startedAt).getFullYear() : null;
  const lastYear = facts.lastSessionAt ? new Date(facts.lastSessionAt).getFullYear() : null;
  const volumeLabel = firstYear
    ? `Volume I · ${firstYear}${lastYear && lastYear !== firstYear ? `–${lastYear}` : ''}`
    : 'Volume I';

  const navigateTo = (id) => {
    document.getElementById(id)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="result-card identity-card chronicle-card">
      <header className="chronicle-header chronicle-title-page">
        <div className="chronicle-title-row">
          <BookOpen size={18} aria-hidden="true" />
          <span className="chronicle-kicker">Your Chronicle</span>
        </div>
        <h3 className="chronicle-book-title">The Gaming Life of {username || 'the Player'}</h3>
        <p className="chronicle-subtitle">{volumeLabel} · the story so far</p>
        <p className="chronicle-protagonist">
          <ProtagonistIcon
            size={13}
            aria-hidden="true"
            style={protagonistAccent ? { color: protagonistAccent } : undefined}
          />
          <span>
            starring <strong>{protagonist.label}</strong>
          </span>
        </p>
        {facts.totalSessions > 0 && (
          <p className="chronicle-title-evidence">
            {facts.totalSessions} recorded sessions · {formatPlaytime(facts.totalMinutes)} · {facts.gameCount} games
          </p>
        )}
      </header>

      {isEmpty && (
        <p className="chronicle-empty">The chronicle has not begun — play something and it will start writing.</p>
      )}

      {(prologue?.exists || chapters.length > 0) && (
        <nav className="chronicle-contents" aria-label="Chronicle contents">
          <span className="chronicle-contents-label">Contents</span>
          <div className="chronicle-contents-list">
            {prologue?.exists && (
              <button type="button" onClick={() => navigateTo('chronicle-prologue')}>
                Prologue
              </button>
            )}
            {chapters.map((chapter) => (
              <button
                type="button"
                key={chapter.key}
                onClick={() => {
                  setExpandedKeys((current) => new Set(current).add(chapter.key));
                  navigateTo(`chronicle-chapter-${chapter.key}`);
                }}
              >
                {chapter.title}
              </button>
            ))}
          </div>
        </nav>
      )}

      {prologue?.exists && (
        <section id="chronicle-prologue" className="chronicle-prologue" aria-label="Prologue">
          <h4 className="chronicle-prologue-heading">Prologue · Before the Chronicle</h4>
          <p className="chronicle-prose">{prologue.text}</p>
          <p className="chronicle-caption">reconstructed from launcher records</p>
        </section>
      )}

      {chapters.map((chapter, index) => (
        <ChronicleChapter
          key={chapter.key}
          chapter={chapter}
          previousChapter={index > 0 ? chapters[index - 1] : null}
          libraryByName={libraryByName}
          capturesByGame={capturesByGame}
          expanded={expandedKeys.has(chapter.key)}
          onToggle={() =>
            setExpandedKeys((current) => {
              const next = new Set(current);
              if (next.has(chapter.key)) next.delete(chapter.key);
              else next.add(chapter.key);
              return next;
            })
          }
        />
      ))}

      {facts?.totalSessions > 0 && (
        <footer className="chronicle-footer">
          Written from {facts.totalSessions} session{facts.totalSessions === 1 ? '' : 's'} recorded locally
          {facts.firstSession?.startedAt && facts.lastSessionAt
            ? ` between ${formatFooterDate(facts.firstSession.startedAt)} and ${formatFooterDate(facts.lastSessionAt)}`
            : ''}
          . Imported totals are marked as reconstructions.
        </footer>
      )}
    </div>
  );
};

export default ChronicleCard;
