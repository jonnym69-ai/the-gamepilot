import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Flame,
  Gamepad2,
  Medal,
  Moon,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { getPersonaVisual, accentToRgb } from './personaVisuals';
import { formatPlaytime } from '../utils/formatPlaytime';
import { displayGameTitle } from '../utils/gameTitle';
import { LocalShareService } from '../services/LocalShareService';
import WrappedPersonaShareCard from './WrappedPersonaShareCard';
import './YearWrappedModal.css';

const slideDate = (value) => {
  const ms = value instanceof Date ? value.getTime() : Number(value) || Date.parse(value);
  if (!ms || Number.isNaN(ms)) return '';
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const prefersReducedMotion = () =>
  (typeof document !== 'undefined' && document.body?.classList?.contains('reduced-motion')) ||
  (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);

// Numbers tick up from zero — keeps whatever decimals the source value had
// (312.5h counts up to 312.5, not 313).
const CountUp = ({ value, duration = 900 }) => {
  const target = Math.max(0, Number(value) || 0);
  const decimals = String(value).includes('.') ? String(value).split('.')[1].length : 0;
  const [display, setDisplay] = useState(() =>
    prefersReducedMotion() ? target.toFixed(decimals) : (0).toFixed(decimals)
  );

  useEffect(() => {
    if (prefersReducedMotion()) {
      setDisplay(target.toFixed(decimals));
      return undefined;
    }
    let raf;
    let start;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      if (start === undefined) start = now;
      const t = Math.min(1, (now - start) / duration);
      setDisplay((target * ease(t)).toFixed(decimals));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, decimals, duration]);

  return <>{display}</>;
};

// Build the deck order from whatever the snapshot actually has — slides with
// no data are skipped rather than shown empty.
export const buildWrappedSlides = (snapshot, year) => {
  if (!snapshot?.hasData) return [];
  const slides = [{ id: 'intro' }];
  const summary = snapshot.summary || {};
  const topGames = snapshot.topGames || [];
  const distributions = snapshot.distributions || {};
  const deepStats = snapshot.deepStats || {};
  const habits = snapshot.habits || {};
  const milestones = snapshot.milestones || {};
  const persona = snapshot.persona || {};
  const monthly = snapshot.monthly || {};
  const monthEntries = Object.entries(monthly.playtimeMinutes || {});
  const totalMinutes = summary.totalPlaytimeMinutes || monthEntries.reduce((sum, [, minutes]) => sum + minutes, 0);

  slides.push({ id: 'totals', summary, habits });
  if (monthEntries.some(([, minutes]) => minutes > 0)) {
    slides.push({
      id: 'months',
      months: monthEntries,
      totalMinutes,
      peakLabel: milestones.records?.biggestMonth?.label,
    });
  }
  if (topGames[0]) slides.push({ id: 'topGame', games: topGames.slice(0, 5), totalMinutes });
  if (topGames[1]) slides.push({ id: 'spotlight', game: topGames[1], rank: 2, totalMinutes });
  if (topGames[2]) slides.push({ id: 'spotlight', game: topGames[2], rank: 3, totalMinutes });
  if ((milestones.records?.longestStreakDays?.days || 0) > 1) {
    slides.push({ id: 'streak', streak: milestones.records.longestStreakDays });
  }
  if (distributions.topGenres?.[0] || distributions.topMoods?.[0]) {
    slides.push({ id: 'flavor', genre: distributions.topGenres?.[0], mood: distributions.topMoods?.[0] });
  }
  if (deepStats.longestSession) slides.push({ id: 'longestSession', session: deepStats.longestSession });
  if (milestones.records && Object.values(milestones.records).some(Boolean)) {
    slides.push({ id: 'records', records: milestones.records });
  }
  if (milestones.achievements?.unlockedThisYear > 0) {
    slides.push({ id: 'achievements', achievements: milestones.achievements });
  }
  if (milestones.finished?.length > 0) slides.push({ id: 'finished', finished: milestones.finished });
  if (milestones.comebacks?.[0]) slides.push({ id: 'comeback', comeback: milestones.comebacks[0] });
  if (milestones.firsts?.length > 0) {
    slides.push({ id: 'firsts', firsts: milestones.firsts, firstsCount: milestones.firstsCount });
  }
  slides.push({ id: 'persona', persona, year });
  slides.push({ id: 'outro', year });
  return slides;
};

const SlideShell = ({ slideId, coverUrl, sharp = false, children }) => (
  <div className="wrapped-slide" key={slideId}>
    {coverUrl ? (
      <div className={`wrapped-slide-art${sharp ? ' sharp' : ''}`} style={{ backgroundImage: `url(${coverUrl})` }} />
    ) : null}
    <div className="wrapped-slide-scrim" />
    <div className="wrapped-slide-inner">{children}</div>
  </div>
);

const Eyebrow = ({ icon: Icon, children }) => (
  <p className="wrapped-eyebrow">
    {Icon ? <Icon size={15} aria-hidden="true" /> : null}
    {children}
  </p>
);

// 12 mini bars for a game's year — the shape of the obsession at a glance.
const MonthlySpark = ({ minutes }) => {
  if (!Array.isArray(minutes) || !minutes.some((value) => value > 0)) return null;
  const max = Math.max(1, ...minutes);
  return (
    <div className="wrapped-sparkline" aria-hidden="true">
      {minutes.map((value, index) => (
        <div
          key={index}
          className={`wrapped-spark-bar${value > 0 ? ' lit' : ''}`}
          style={{ '--bar-h': `${(value / max) * 100}%`, animationDelay: `${index * 40}ms` }}
        />
      ))}
    </div>
  );
};

export default function YearWrappedModal({ snapshot, year, username = 'Pilot', onClose, onOpenChronicle }) {
  const slides = useMemo(() => buildWrappedSlides(snapshot, year), [snapshot, year]);
  const [index, setIndex] = useState(0);
  const total = slides.length;
  const slide = slides[Math.min(index, total - 1)] || null;

  const goNext = useCallback(() => setIndex((i) => Math.min(i + 1, total - 1)), [total]);
  const goPrev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  const personaSlide = slides.find((s) => s.id === 'persona') || null;
  const personaCardRef = useRef(null);
  const [sharing, setSharing] = useState(false);

  const capturePersonaCard = useCallback(async () => {
    if (!personaCardRef.current) return null;
    const canvas = await html2canvas(personaCardRef.current, {
      backgroundColor: '#0b0d13',
      scale: 1,
      logging: false,
      useCORS: true,
    });
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }, []);

  const handleCopyPersonaCard = useCallback(async () => {
    setSharing(true);
    try {
      const blob = await capturePersonaCard();
      if (blob) await LocalShareService.copyImageToClipboard(blob, `gamepilot-persona-${year}.png`);
    } catch {
      /* clipboard unavailable — keep the deck running */
    } finally {
      setSharing(false);
    }
  }, [capturePersonaCard, year]);

  const handleSavePersonaCard = useCallback(async () => {
    setSharing(true);
    try {
      const blob = await capturePersonaCard();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gamepilot-persona-${year}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      /* save unavailable */
    } finally {
      setSharing(false);
    }
  }, [capturePersonaCard, year]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight' || event.key === ' ') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, goNext, goPrev]);

  if (!slide) return null;
  const atEnd = index >= total - 1;

  const renderSlide = () => {
    switch (slide.id) {
      case 'intro':
        return (
          <SlideShell slideId="intro">
            <Eyebrow icon={Sparkles}>GamePilot wrapped</Eyebrow>
            <h2 className="wrapped-mega">
              Your {year}
              <br />
              in review
            </h2>
            <p className="wrapped-sub">
              {username}, here's what you actually got up to — every session, tracked locally.
            </p>
          </SlideShell>
        );

      case 'totals': {
        const s = slide.summary;
        return (
          <SlideShell slideId="totals">
            <Eyebrow icon={Clock}>The headline</Eyebrow>
            <h2 className="wrapped-number">
              <CountUp value={s.playtimeHours} />h
            </h2>
            <p className="wrapped-sub">
              across {s.uniqueGames} game{s.uniqueGames === 1 ? '' : 's'} in {s.sessions} session
              {s.sessions === 1 ? '' : 's'}
              {slide.habits.daysActive > 0 ? ` — ${slide.habits.daysActive} days you showed up` : ''}
            </p>
          </SlideShell>
        );
      }

      case 'months': {
        const entries = slide.months;
        const max = Math.max(1, ...entries.map(([, minutes]) => minutes));
        const peak = entries.reduce((best, entry) => (entry[1] > (best?.[1] || 0) ? entry : best), null);
        const peakPct =
          peak && slide.totalMinutes > 0 ? Math.max(1, Math.round((peak[1] / slide.totalMinutes) * 100)) : 0;
        return (
          <SlideShell slideId="months">
            <Eyebrow icon={CalendarDays}>The rhythm</Eyebrow>
            <h2 className="wrapped-title">Your year by month</h2>
            <div className="wrapped-months">
              {entries.map(([label, minutes], index) => (
                <div key={label} className="wrapped-month-col">
                  <span className="wrapped-month-hours">{minutes > 0 ? formatPlaytime(minutes) : ''}</span>
                  <div className="wrapped-month-track">
                    <div
                      className={`wrapped-month-bar${peak && label === peak[0] ? ' peak' : ''}`}
                      style={{ '--bar-h': `${(minutes / max) * 100}%`, animationDelay: `${index * 45}ms` }}
                    />
                  </div>
                  <span className="wrapped-month-label">{label}</span>
                </div>
              ))}
            </div>
            {peak ? (
              <p className="wrapped-sub">
                {slide.peakLabel || peak[0]} was your peak{peakPct > 0 ? ` — ${peakPct}% of the year` : ''}.
              </p>
            ) : null}
          </SlideShell>
        );
      }

      case 'topGame': {
        const [top, ...rest] = slide.games;
        const share =
          slide.totalMinutes > 0 ? Math.max(1, Math.round((top.totalPlaytime / slide.totalMinutes) * 100)) : null;
        return (
          <SlideShell slideId="topGame" coverUrl={top.coverUrl} sharp>
            <Eyebrow icon={Crown}>Most played</Eyebrow>
            <h2 className="wrapped-title">{displayGameTitle(top.name)}</h2>
            <p className="wrapped-sub">
              {formatPlaytime(top.totalPlaytime)} · {top.sessions} session{top.sessions === 1 ? '' : 's'}
              {top.avgSessionMinutes ? ` · ~${formatPlaytime(top.avgSessionMinutes)} a sitting` : ''}
              {share ? ` — ${share}% of your year` : ''}
            </p>
            <MonthlySpark minutes={top.monthlyMinutes} />
            {rest.length > 0 && (
              <ul className="wrapped-lineup">
                {rest.map((game) => (
                  <li key={game.id || game.name}>
                    <span>{displayGameTitle(game.name)}</span>
                    <span className="wrapped-lineup-hours">{formatPlaytime(game.totalPlaytime)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SlideShell>
        );
      }

      case 'spotlight': {
        const game = slide.game;
        const share =
          slide.totalMinutes > 0 ? Math.max(1, Math.round((game.totalPlaytime / slide.totalMinutes) * 100)) : null;
        return (
          <SlideShell slideId={`spotlight-${game.id || slide.rank}`} coverUrl={game.coverUrl} sharp>
            <Eyebrow icon={Crown}>#{slide.rank} most played</Eyebrow>
            <h2 className="wrapped-title">{displayGameTitle(game.name)}</h2>
            <div className="wrapped-spotlight-stats">
              {share !== null ? (
                <div className="wrapped-spotlight-stat">
                  <strong>
                    <CountUp value={share} />%
                  </strong>
                  <span>of your year</span>
                </div>
              ) : null}
              <div className="wrapped-spotlight-stat">
                <strong>
                  <CountUp value={game.sessions} />
                </strong>
                <span>session{game.sessions === 1 ? '' : 's'}</span>
              </div>
              {game.avgSessionMinutes ? (
                <div className="wrapped-spotlight-stat">
                  <strong>{formatPlaytime(game.avgSessionMinutes)}</strong>
                  <span>a sitting</span>
                </div>
              ) : null}
            </div>
            <MonthlySpark minutes={game.monthlyMinutes} />
          </SlideShell>
        );
      }

      case 'streak': {
        const streak = slide.streak;
        const games = Array.isArray(streak.games) ? streak.games : [];
        const count = streak.gameCount ?? games.length;
        return (
          <SlideShell slideId="streak">
            <Eyebrow icon={Flame}>The streak</Eyebrow>
            <h2 className="wrapped-number">
              <CountUp value={streak.days} />
            </h2>
            <p className="wrapped-sub">
              consecutive days showing up — {slideDate(streak.startDate)} to {slideDate(streak.endDate)}
              {count > 0 ? `, across ${count} different game${count === 1 ? '' : 's'}` : ''}.
            </p>
            {games.some((game) => game.coverUrl) ? (
              <div className="wrapped-streak-covers">
                {games.map((game, index) =>
                  game.coverUrl ? (
                    <img
                      key={`${game.name}-${index}`}
                      src={game.coverUrl}
                      alt={displayGameTitle(game.name)}
                      title={displayGameTitle(game.name)}
                      className="wrapped-streak-cover"
                      style={{ animationDelay: `${index * 60}ms` }}
                    />
                  ) : null
                )}
              </div>
            ) : null}
          </SlideShell>
        );
      }

      case 'flavor':
        return (
          <SlideShell slideId="flavor">
            <Eyebrow icon={BookOpen}>Your flavor</Eyebrow>
            <h2 className="wrapped-title">{slide.genre?.label || slide.mood?.label || ' eclectic'}</h2>
            <p className="wrapped-sub">
              {slide.genre ? `${slide.genre.label} led your genres` : ''}
              {slide.genre && slide.mood ? ' — ' : ''}
              {slide.mood ? `${slide.mood.label} was your dominant mood` : ''}
            </p>
          </SlideShell>
        );

      case 'longestSession': {
        const s = slide.session;
        return (
          <SlideShell slideId="longestSession" coverUrl={s.coverUrl}>
            <Eyebrow icon={Moon}>The marathon</Eyebrow>
            <h2 className="wrapped-number">{formatPlaytime(s.playtimeMinutes)}</h2>
            <p className="wrapped-sub">
              {displayGameTitle(s.gameName)}
              {slideDate(s.timestamp) ? ` · ${slideDate(s.timestamp)}` : ''} — your longest single sitting.
            </p>
          </SlideShell>
        );
      }

      case 'records': {
        const r = slide.records;
        return (
          <SlideShell slideId="records">
            <Eyebrow icon={Flame}>Records</Eyebrow>
            <div className="wrapped-records">
              {r.biggestMonth && (
                <div className="wrapped-record">
                  <strong>{r.biggestMonth.label}</strong>
                  <span>biggest month</span>
                  <small>{formatPlaytime(r.biggestMonth.minutes)}</small>
                </div>
              )}
              {r.mostSessionsDay && (
                <div className="wrapped-record">
                  <strong>{r.mostSessionsDay.count}</strong>
                  <span>sessions in one day</span>
                  <small>{slideDate(r.mostSessionsDay.date)}</small>
                </div>
              )}
            </div>
          </SlideShell>
        );
      }

      case 'achievements': {
        const a = slide.achievements;
        return (
          <SlideShell slideId="achievements">
            <Eyebrow icon={Medal}>Achievements</Eyebrow>
            <h2 className="wrapped-number">
              <CountUp value={a.unlockedThisYear} />
            </h2>
            <p className="wrapped-sub">unlocked across {a.gamesWithUnlocks} games</p>
            {a.rarest && (
              <div className="wrapped-callout">
                <Sparkles size={15} aria-hidden="true" />
                <span>
                  Rarest pull: <strong>{a.rarest.name}</strong> — {a.rarest.percent}% of players (
                  {displayGameTitle(a.rarest.gameName)})
                </span>
              </div>
            )}
          </SlideShell>
        );
      }

      case 'finished': {
        const list = slide.finished;
        return (
          <SlideShell slideId="finished" coverUrl={list.find((g) => g.coverUrl)?.coverUrl}>
            <Eyebrow icon={Trophy}>Credits rolled</Eyebrow>
            <h2 className="wrapped-number">
              <CountUp value={list.length} />
            </h2>
            <p className="wrapped-sub">game{list.length === 1 ? '' : 's'} finished this year</p>
            <ul className="wrapped-lineup">
              {list.slice(0, 5).map((game) => (
                <li key={game.name}>
                  <span>{displayGameTitle(game.name)}</span>
                  <span className="wrapped-lineup-hours">{game.status === '100%' ? '100%' : game.status}</span>
                </li>
              ))}
            </ul>
          </SlideShell>
        );
      }

      case 'comeback': {
        const c = slide.comeback;
        return (
          <SlideShell slideId="comeback" coverUrl={c.coverUrl}>
            <Eyebrow icon={RotateCcw}>The comeback</Eyebrow>
            <h2 className="wrapped-title">{displayGameTitle(c.name)}</h2>
            <p className="wrapped-sub">
              back after {c.gapDays} days away — {slideDate(c.returnedAt)}
            </p>
          </SlideShell>
        );
      }

      case 'firsts': {
        const count = slide.firstsCount ?? slide.firsts.length;
        return (
          <SlideShell slideId="firsts" coverUrl={slide.firsts.find((g) => g.coverUrl)?.coverUrl}>
            <Eyebrow icon={Zap}>New discoveries</Eyebrow>
            <h2 className="wrapped-number">
              <CountUp value={count} />
            </h2>
            <p className="wrapped-sub">game{count === 1 ? '' : 's'} played for the first time</p>
            <p className="wrapped-names">{slide.firsts.map((g) => displayGameTitle(g.name)).join(' · ')}</p>
          </SlideShell>
        );
      }

      case 'persona': {
        const p = slide.persona;
        const visual = getPersonaVisual(p.identityThemeId, p.identityId);
        const PersonaIcon = visual.icon;
        const accentRgb = accentToRgb(visual.accent);
        const evidence = [
          p.dominantMood ? `${p.dominantMood} was your strongest mood signal` : null,
          p.dominantGenre ? `${p.dominantGenre} shaped your genre profile` : null,
          p.preferredSessionLabel ? `session rhythm: ${p.preferredSessionLabel}` : null,
          p.peakPlayWindow ? `most active window: ${String(p.peakPlayWindow).toLowerCase()}` : null,
          p.avgSessionMinutes ? `~${formatPlaytime(p.avgSessionMinutes)} per sitting` : null,
        ].filter(Boolean);
        return (
          <SlideShell slideId="persona">
            <div
              className="wrapped-persona-card"
              style={{ '--persona-accent': visual.accent, '--persona-accent-rgb': accentRgb }}
            >
              <Eyebrow icon={Gamepad2}>The verdict</Eyebrow>
              <div className="wrapped-persona-emblem">
                <PersonaIcon size={44} aria-hidden="true" />
              </div>
              <h2 className="wrapped-title wrapped-persona-label">{p.identityLabel || 'Adaptive Pilot'}</h2>
              {p.identityDescription ? <p className="wrapped-sub">{p.identityDescription}</p> : null}
              {evidence.length > 0 && (
                <div className="wrapped-evidence">
                  <p className="wrapped-evidence-title">Why this verdict</p>
                  <ul>
                    {evidence.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
              {p.roast ? <p className="wrapped-roast">&ldquo;{p.roast}&rdquo;</p> : null}
              <div className="wrapped-share-actions">
                <button type="button" className="wrapped-share-btn" onClick={handleCopyPersonaCard} disabled={sharing}>
                  Copy as image
                </button>
                <button type="button" className="wrapped-share-btn" onClick={handleSavePersonaCard} disabled={sharing}>
                  Save card
                </button>
              </div>
            </div>
          </SlideShell>
        );
      }

      case 'outro':
      default:
        return (
          <SlideShell slideId="outro">
            <Eyebrow icon={CalendarDays}>{slide.year} · wrapped</Eyebrow>
            <h2 className="wrapped-title">That's your year.</h2>
            <p className="wrapped-sub">
              Every number came from your local sessions — no cloud, no guesses.
              {onOpenChronicle ? ' The Chronicle tells the same year month by month.' : ''}
            </p>
            {onOpenChronicle ? (
              <button type="button" className="wrapped-chronicle-btn" onClick={onOpenChronicle}>
                <BookOpen size={15} aria-hidden="true" />
                Read the full chronicle
              </button>
            ) : null}
          </SlideShell>
        );
    }
  };

  return (
    <div className="wrapped-overlay" role="dialog" aria-modal="true" aria-label={`${year} year in review`}>
      <button type="button" className="wrapped-close" onClick={onClose} aria-label="Close year in review">
        <X size={18} />
      </button>

      <button
        type="button"
        className="wrapped-nav wrapped-nav-prev"
        onClick={goPrev}
        disabled={index === 0}
        aria-label="Previous"
      >
        <ChevronLeft size={22} />
      </button>
      <button
        type="button"
        className="wrapped-nav wrapped-nav-next"
        onClick={atEnd ? onClose : goNext}
        aria-label={atEnd ? 'Finish' : 'Next'}
      >
        {atEnd ? <ArrowRight size={22} /> : <ChevronRight size={22} />}
      </button>

      {renderSlide()}

      <div className="wrapped-progress">
        {slides.map((s, i) => (
          <button
            key={s.id + i}
            type="button"
            className={`wrapped-dot${i === index ? ' active' : ''}${i < index ? ' done' : ''}`}
            onClick={() => setIndex(i)}
            aria-label={`Slide ${i + 1}`}
            tabIndex={-1}
          />
        ))}
      </div>

      {personaSlide && (
        <div className="wrapped-share-offscreen" aria-hidden="true">
          <div ref={personaCardRef}>
            <WrappedPersonaShareCard persona={personaSlide.persona} year={year} username={username} />
          </div>
        </div>
      )}
    </div>
  );
}
