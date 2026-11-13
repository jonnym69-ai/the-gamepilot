// AchievementCompletionCard — surfaces Steam-achievement completion detections.
// Games with every achievement unlocked are auto-marked '100%' during scans;
// fuzzier "beaten" detections (story-completion achievement names) wait here
// for the user to confirm or dismiss. The card always shows when Steam public
// data is enabled — a status line reports the last sweep even when there is
// nothing new to review.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trophy, Check, X, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';
import AchievementCompletionService from '../services/AchievementCompletionService';
import SessionRepository from '../services/SessionRepository';
import { LocalShareService } from '../services/LocalShareService';
import ShareMenu from './ShareMenu';
import GameShareCard, { buildGameShareData, buildGameShareCaption } from './GameShareCard';
import './AchievementCompletionCard.css';

const timeAgo = (ts) => {
  if (!ts) return 'never';
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const fmtDur = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? `${m % 60}m` : ''}` : `${m}m`);

/** "in your Nov 12 session · 2h41m" — null-safe. */
const sessionLabel = (ev) => {
  if (!ev?.endTime) return null;
  const day = new Date(ev.endTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `in your ${day} session${ev.minutes > 0 ? ` · ${fmtDur(ev.minutes)}` : ''}`;
};

const AchievementCompletionCard = ({ library = [] }) => {
  const [candidates, setCandidates] = useState([]);
  const [applied, setApplied] = useState([]);
  const [finishLine, setFinishLine] = useState([]);
  const [stillPlaying, setStillPlaying] = useState([]);
  const [stats, setStats] = useState(() => AchievementCompletionService.getScanStats());
  const [progress, setProgress] = useState(null);
  const [justBeaten, setJustBeaten] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const shareCardRef = useRef(null);
  const mountedRef = useRef(true);
  const sessions = useMemo(() => {
    try {
      return SessionRepository.getSnapshot()?.sessionHistory || [];
    } catch {
      return [];
    }
  }, []);

  const shareGame = useMemo(() => {
    if (!justBeaten) return null;
    const found = library.find((g) => String(g?.name || g?.title) === justBeaten.name);
    return { ...(found || { name: justBeaten.name }), completionStatus: 'beaten' };
  }, [justBeaten, library]);

  const shareStats = useMemo(() => {
    if (!justBeaten) return {};
    const name = String(justBeaten.name || '').toLowerCase();
    const ev = justBeaten.sessionEvidence;
    return {
      sessions: sessions.filter((s) => String(s?.gameName || s?.gameId || '').toLowerCase() === name),
      beatenSession:
        ev?.minutes > 0
          ? {
              minutes: ev.minutes,
              day: new Date(ev.endTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            }
          : null,
    };
  }, [justBeaten, sessions]);

  const captureSharePng = useCallback(async () => {
    if (!shareCardRef.current) return null;
    const canvas = await html2canvas(shareCardRef.current, {
      scale: 2,
      backgroundColor: null,
      useCORS: true,
      logging: false,
    });
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshState = useCallback(() => {
    setCandidates(AchievementCompletionService.getCandidates());
    setStats(AchievementCompletionService.getScanStats());
    setFinishLine(AchievementCompletionService.getFinishLine(library));
    setStillPlaying(AchievementCompletionService.getPlayingGames(library, { sessions }));
  }, [library, sessions]);

  const runScan = useCallback(
    async (limit) => {
      setProgress({ done: 0, total: 0, gameName: null });
      try {
        const result = await AchievementCompletionService.scan(library, {
          limit,
          onProgress: (p) => {
            if (mountedRef.current) setProgress(p);
          },
        });
        if (!mountedRef.current) return;
        setApplied(result.applied);
        refreshState();
      } catch {
        /* scan is best-effort */
      } finally {
        if (mountedRef.current) setProgress(null);
      }
    },
    [library, refreshState]
  );

  useEffect(() => {
    if (!AchievementCompletionService.isAvailable()) return;
    setCandidates(AchievementCompletionService.getCandidates());
    setFinishLine(AchievementCompletionService.getFinishLine(library));
    setStillPlaying(AchievementCompletionService.getPlayingGames(library, { sessions }));
    if (AchievementCompletionService.shouldScanNow()) {
      runScan();
    }
  }, [runScan, library, sessions]);

  if (!AchievementCompletionService.isAvailable()) return null;

  const scanning = Boolean(progress);

  const handleConfirm = (candidate) => {
    AchievementCompletionService.confirmBeaten(candidate.name, candidate.achievementName, candidate.appid);
    const ev = AchievementCompletionService.getCandidateSessionEvidence(candidate, sessions);
    setJustBeaten({ ...candidate, sessionEvidence: ev });
    refreshState();
  };

  const handleDismiss = (candidate) => {
    AchievementCompletionService.dismiss(candidate.appid);
    refreshState();
  };

  const statusLine = (() => {
    if (scanning) {
      return progress.total > 0
        ? `Sweeping Steam achievements — ${progress.done}/${progress.total}${progress.gameName ? ` · ${progress.gameName}` : ''}…`
        : 'Sweeping Steam achievements…';
    }
    if (!stats) return 'First sweep runs shortly — Steam games checked for finished runs.';
    const total = stats.totalSteam > stats.scanned ? ` of ${stats.totalSteam}` : '';
    const findings =
      stats.applied > 0 || stats.candidates > 0
        ? ` · ${stats.applied} auto-marked, ${stats.candidates} to review`
        : ' · nothing new';
    return `Last sweep ${timeAgo(stats.at)} · ${stats.scanned}${total} Steam games${findings}`;
  })();

  return (
    <div className="achievement-review-card">
      <div className="achievement-review-head">
        <Trophy size={16} />
        <span className="achievement-review-title">Achievement Sweep</span>
        {candidates.length > 0 && <span className="achievement-review-count">{candidates.length} to review</span>}
        <button
          type="button"
          className="achievement-review-rescan"
          onClick={() => runScan(Number.MAX_SAFE_INTEGER)}
          disabled={scanning}
          title="Scan your whole Steam library now"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {applied.length > 0 && (
        <div className="achievement-review-block">
          <span className="achievement-review-label">Auto-marked 100%</span>
          {applied.map((item) => {
            const ev = sessionLabel(
              AchievementCompletionService.getCompletionSessionEvidence(item.appid, item.name, sessions)
            );
            return (
              <div className="achievement-review-row is-applied" key={item.appid}>
                <Check size={13} />
                <div className="achievement-review-info">
                  <span className="achievement-review-game">{item.name}</span>
                  <span className="achievement-review-why">
                    {item.reason}
                    {ev && <em className="achievement-review-session">{ev}</em>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {candidates.length > 0 && (
        <div className="achievement-review-block">
          <span className="achievement-review-label">Looks beaten — confirm?</span>
          {candidates.map((candidate) => {
            const ev = sessionLabel(AchievementCompletionService.getCandidateSessionEvidence(candidate, sessions));
            return (
              <div className="achievement-review-row" key={candidate.appid}>
                <div className="achievement-review-info">
                  <span className="achievement-review-game">{candidate.name}</span>
                  <span className="achievement-review-why">
                    {candidate.reason}
                    {ev && <em className="achievement-review-session">{ev}</em>}
                  </span>
                </div>
                <div className="achievement-review-actions">
                  <button
                    type="button"
                    className="achievement-review-btn is-confirm"
                    onClick={() => handleConfirm(candidate)}
                    title="Mark as beaten"
                  >
                    <Check size={13} /> Beaten
                  </button>
                  <button
                    type="button"
                    className="achievement-review-btn is-dismiss"
                    onClick={() => handleDismiss(candidate)}
                    title="Not finished — don't ask again"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {justBeaten && shareGame && (
        <div className="achievement-review-block">
          <div className="achievement-review-row is-applied">
            <Check size={13} />
            <div className="achievement-review-info">
              <span className="achievement-review-game">{justBeaten.name} — marked beaten</span>
              <span className="achievement-review-why">
                {justBeaten.sessionEvidence ? `Finished ${sessionLabel(justBeaten.sessionEvidence)}` : 'Share the win?'}
              </span>
            </div>
            <div className="achievement-review-actions">
              <ShareMenu
                triggerLabel="Share"
                imageAvailable
                disabled={isCapturing}
                buildCaption={() => buildGameShareCaption(buildGameShareData(shareGame, shareStats))}
                onShareText={async (channel, text) =>
                  LocalShareService.openShareIntent(
                    channel,
                    text || buildGameShareCaption(buildGameShareData(shareGame, shareStats))
                  )
                }
                onCopyText={async (text) =>
                  LocalShareService.copyTextToClipboard(
                    text || buildGameShareCaption(buildGameShareData(shareGame, shareStats))
                  )
                }
                onCopyImage={async () => {
                  setIsCapturing(true);
                  try {
                    const blob = await captureSharePng();
                    return blob ? LocalShareService.copyImageToClipboard(blob) : false;
                  } catch {
                    return false;
                  } finally {
                    setIsCapturing(false);
                  }
                }}
                onSaveImage={async () => {
                  setIsCapturing(true);
                  try {
                    const blob = await captureSharePng();
                    if (!blob) return;
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `beaten-${justBeaten.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsCapturing(false);
                  }
                }}
              />
              <button
                type="button"
                className="achievement-review-btn is-dismiss"
                onClick={() => setJustBeaten(null)}
                title="Close"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {finishLine.length > 0 && (
        <div className="achievement-review-block">
          <span className="achievement-review-label">Closing in on 100%</span>
          {finishLine.map((game) => (
            <div className="achievement-review-row" key={game.appid}>
              <div className="achievement-review-info">
                <span className="achievement-review-game">{game.name}</span>
                <span className="achievement-review-why">
                  {game.remaining} left · {Math.round(game.pct * 100)}%
                </span>
              </div>
              <div className="achievement-finish-track" aria-hidden="true">
                <div className="achievement-finish-fill" style={{ width: `${Math.round(game.pct * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {stillPlaying.length > 0 && (
        <div className="achievement-review-block">
          <span className="achievement-review-label">In progress</span>
          {stillPlaying.map((game) => {
            const pct =
              game.mainStoryHours > 0 && game.playedMinutes > 0
                ? Math.min(99, Math.round((game.playedMinutes / 60 / game.mainStoryHours) * 100))
                : null;
            const context = game.implied && game.lastPlayedMs ? `last played ${timeAgo(game.lastPlayedMs)}` : null;
            const estimate =
              game.remainingHours != null
                ? `~${Math.ceil(game.remainingHours)}h to credits`
                : game.playedMinutes > 0
                  ? `${Math.round(game.playedMinutes / 60)}h logged`
                  : game.implied
                    ? 'seen in a recent session'
                    : 'marked playing';
            return (
              <div className="achievement-review-row" key={game.name}>
                <div className="achievement-review-info">
                  <span className="achievement-review-game">{game.name}</span>
                  <span className="achievement-review-why">{[context, estimate].filter(Boolean).join(' · ')}</span>
                </div>
                {pct != null && (
                  <div className="achievement-finish-track" aria-hidden="true">
                    <div className="achievement-finish-fill" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="achievement-review-status">{statusLine}</p>

      {/* Hidden render target for the "beaten" share PNG */}
      {shareGame && (
        <div style={{ position: 'fixed', left: 0, top: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
          <div ref={shareCardRef}>
            <GameShareCard game={shareGame} gameStats={shareStats} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AchievementCompletionCard;
