import React, { useMemo } from 'react';
import { BookOpen, Feather } from 'lucide-react';
import SessionRepository from '../services/SessionRepository';
import { buildChronicle } from '../services/ChronicleService';
import GamingPersonaService from '../services/GamingPersonaService';
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

// "starring …" — persona name + emblem when the service has a confident read,
// otherwise the honest generic lead.
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

const ChapterIllustration = ({ dominantName, libraryByName }) => {
  const game = dominantName ? libraryByName.get(dominantName.toLowerCase()) : null;
  const stub = dominantName ? { name: dominantName, platform: game?.platform } : null;
  const bundle = resolveGameArtworkBundle(game || stub, { surface: 'portrait', fallbackSurface: 'hero' });
  const placeholder =
    bundle.placeholder || (stub ? getGameArtworkPlaceholder({ game: stub, surface: 'portrait' }) : null);
  if (!dominantName || (!bundle.artwork && !placeholder)) return null;
  return (
    <figure className="chronicle-illustration">
      <LazyImage
        src={bundle.artwork}
        alt={dominantName}
        placeholder={placeholder}
        fallbackSrc={bundle.fallbackSrc}
        gameName={dominantName}
        platform={game?.platform}
        className="chronicle-illustration-img"
      />
      <figcaption>{dominantName}</figcaption>
    </figure>
  );
};

const ChronicleCard = ({ library = [] }) => {
  const chronicle = useMemo(() => {
    try {
      return buildChronicle(SessionRepository.getSessionHistory(), library);
    } catch {
      return null;
    }
  }, [library]);

  const protagonist = useProtagonist();

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

  return (
    <div className="result-card identity-card chronicle-card">
      <header className="chronicle-header">
        <div className="chronicle-title-row">
          <BookOpen size={18} aria-hidden="true" />
          <h3 className="chronicle-title">Your Chronicle</h3>
        </div>
        <p className="chronicle-subtitle">the story so far</p>
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
      </header>

      {isEmpty && (
        <p className="chronicle-empty">The chronicle has not begun — play something and it will start writing.</p>
      )}

      {prologue?.exists && (
        <section className="chronicle-prologue" aria-label="Prologue">
          <h4 className="chronicle-prologue-heading">Prologue</h4>
          <p className="chronicle-prose">{prologue.text}</p>
          <p className="chronicle-caption">reconstructed from launcher records</p>
        </section>
      )}

      {chapters.map((chapter) => {
        const month = chapter.month || {};
        const share = chapter.dominantGame?.share;
        const lastIndex = chapter.paragraphs.length - 1;
        return (
          <section
            key={chapter.key}
            className={`chronicle-chapter${chapter.isCurrent ? ' is-current' : ''}`}
            aria-label={chapter.title}
          >
            <div className="chronicle-chapter-head">
              <h4 className="chronicle-chapter-title">{chapter.title}</h4>
              <span className="chronicle-chapter-dates">{chapter.subtitle}</span>
            </div>
            <div className="chronicle-chapter-body">
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
              <ChapterIllustration dominantName={chapter.dominantGame?.name} libraryByName={libraryByName} />
            </div>
            <div className="chronicle-margin-notes">
              {Number.isFinite(month.minutes) && month.minutes > 0 && (
                <span className="chronicle-note">
                  <strong>{formatPlaytime(month.minutes)}</strong> played
                </span>
              )}
              <span className="chronicle-note">
                <strong>{month.sessions}</strong> session{month.sessions === 1 ? '' : 's'}
              </span>
              {month.varietyCount > 0 && (
                <span className="chronicle-note">
                  <strong>{month.varietyCount}</strong> game{month.varietyCount === 1 ? '' : 's'}
                </span>
              )}
              {Number.isFinite(share) && share > 0 && (
                <span className="chronicle-note">
                  <strong>{Math.round(share * 100)}%</strong> {chapter.dominantGame.name}
                </span>
              )}
            </div>
          </section>
        );
      })}

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
