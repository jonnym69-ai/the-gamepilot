import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LocalShareService } from '../services/LocalShareService';
import { formatDuration } from '../services/RecentActivityAggregator';
import { resolveGameArtworkBundle } from '../services/GameArtworkService';

const COLORS = ['#ff854f', '#63ddd2', '#ffe08a', '#8994ae'];

export function drawSessionHistoryCard(canvas, breakdown, name = '', images = {}) {
  canvas.width = 1200;
  canvas.height = 900;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image preview unavailable');
  const text = (value, x, y, size = 22, color = '#e9edf5', maxWidth = 1080) => {
    ctx.font = `${size >= 30 ? 'bold ' : ''}${size}px Arial`;
    ctx.fillStyle = color;
    let label = String(value);
    if (ctx.measureText(label).width > maxWidth) {
      while (label.length && ctx.measureText(`${label}…`).width > maxWidth) label = label.slice(0, -1);
      label += '…';
    }
    ctx.fillText(label, x, y);
  };
  ctx.fillStyle = '#10141e';
  ctx.fillRect(0, 0, 1200, 900);
  ctx.fillStyle = COLORS[0];
  ctx.fillRect(60, 54, 56, 5);
  text('GAMEPILOT / SESSION HISTORY', 60, 98, 20, COLORS[0]);
  text(`My last ${breakdown.days} days`, 60, 160, 48);
  const dateLabel = (key) =>
    new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  text(`${dateLabel(breakdown.dateRange[0])} – ${dateLabel(breakdown.dateRange.at(-1))}`, 60, 200, 22, '#adb8cc');
  if (name.trim()) text(name.trim(), 800, 98, 22, '#adb8cc', 340);
  const stats = breakdown.overview;
  [
    [stats.totalPlaytimeLabel, 'PLAYTIME'],
    [stats.totalSessions, 'SESSIONS'],
    [stats.uniqueGames, 'GAMES PLAYED'],
  ].forEach(([value, label], index) => {
    text(value, 60 + index * 370, 277, 38, '#ffffff', 350);
    text(label, 60 + index * 370, 313, 18, '#adb8cc');
  });
  const top = breakdown.perGameBreakdown.slice(0, 3);
  const max = Math.max(1, ...breakdown.dailyTimeline.map((day) => day.totalMinutes));
  text(`DAILY PLAYTIME · peak ${formatDuration(max)}`, 60, 370, 18, '#adb8cc');
  const step = 1080 / breakdown.dailyTimeline.length;
  breakdown.dailyTimeline.forEach((day, index) => {
    const amounts = top.map((game) => day.games[game.name] || 0);
    amounts.push(Math.max(0, day.totalMinutes - amounts.reduce((sum, value) => sum + value, 0)));
    let bottom = 560;
    amounts.forEach((minutes, color) => {
      const height = (minutes / max) * 160;
      ctx.fillStyle = COLORS[color];
      ctx.fillRect(60 + index * step, bottom - height, Math.max(1, step - 2), height);
      bottom -= height;
    });
  });
  top.forEach((game, index) => {
    const y = 620 + index * 48;
    const cover = images[game.name];
    ctx.fillStyle = COLORS[index];
    ctx.fillRect(60, y - 17, 14, 14);
    let nameX = 88;
    if (cover && ctx.drawImage) {
      // 2:3 portrait thumb beside the colour key, matching the library tiles.
      ctx.save();
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(96, y - 38, 30, 44, 5);
      } else {
        ctx.rect(96, y - 38, 30, 44);
      }
      ctx.clip();
      ctx.drawImage(cover, 96, y - 38, 30, 44);
      ctx.restore();
      nameX = 140;
    }
    text(game.name, nameX, y, 23, '#e9edf5', 690 - (nameX - 88));
    const percent =
      stats.totalPlaytimeMinutes > 0 ? Math.round((game.totalMinutes / stats.totalPlaytimeMinutes) * 100) : 0;
    text(`${formatDuration(game.totalMinutes)} · ${percent}%`, 850, y, 23, '#e9edf5', 290);
  });
  if (breakdown.perGameBreakdown.length > 3) text('Other games shown in grey', 60, 772, 18, COLORS[3]);
  text(`${stats.activeDays} active days · ${stats.avgSessionLabel} average session`, 60, 822, 23);
  text('Recorded sessions only · Generated locally with GamePilot', 60, 866, 18, '#adb8cc');
}

const loadFirstAvailable = (sources) =>
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

export default function SessionHistoryShare({ breakdown, onClose }) {
  const dialogRef = useRef(null);
  const canvasRef = useRef(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState('');
  const [covers, setCovers] = useState({});

  // Artwork candidates for the top games, in preference order: Steam portrait,
  // its landscape fallback, the recorded session cover, then the generated
  // name-tile placeholder so every game still gets an image.
  const coverSources = useMemo(() => {
    const sources = {};
    (breakdown.perGameBreakdown || []).slice(0, 3).forEach((game) => {
      const bundle = resolveGameArtworkBundle(
        { name: game.name, appid: game.appid || null, platform: 'steam' },
        { surface: 'portrait', fallbackSurface: 'library_card' }
      );
      sources[game.name] = [bundle.artwork, bundle.fallbackSrc, game.coverUrl, bundle.placeholder].filter(
        (value, index, list) => value && list.indexOf(value) === index
      );
    });
    return sources;
  }, [breakdown]);

  useEffect(() => {
    dialogRef.current.showModal();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const entries = Object.entries(coverSources).filter(([, sources]) => sources.length > 0);
    if (entries.length === 0) {
      setCovers({});
      return undefined;
    }
    Promise.all(entries.map(([key, sources]) => loadFirstAvailable(sources).then((image) => [key, image]))).then(
      (loaded) => {
        if (cancelled) return;
        setCovers(Object.fromEntries(loaded.filter(([, image]) => image)));
      }
    );
    return () => {
      cancelled = true;
    };
  }, [coverSources]);

  useEffect(() => {
    try {
      drawSessionHistoryCard(canvasRef.current, breakdown, name, covers);
      setReady(true);
      setMessage('');
    } catch {
      setReady(false);
      setMessage('Could not generate the preview. Close and try again.');
    }
  }, [breakdown, name, covers]);

  const exportImage = async (copy) => {
    setBusy(true);
    setMessage('');
    try {
      if (copy) {
        const blob = await new Promise((resolve) => canvasRef.current.toBlob(resolve, 'image/png'));
        if (!blob || !(await LocalShareService.copyImageToClipboard(blob))) throw new Error();
        setMessage('Image copied. Paste it wherever you want to share.');
      } else {
        const result = await LocalShareService.downloadImageFromCanvas(
          canvasRef.current,
          `gamepilot-session-history-${breakdown.days}d-${breakdown.dateRange.at(-1)}.png`
        );
        if (!result.success) throw new Error();
        setMessage('PNG download started.');
      }
    } catch {
      setMessage(
        copy ? 'Could not copy the image. Try Save PNG instead.' : 'Could not save the image. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="ra-share-dialog" aria-labelledby="ra-share-title" onCancel={onClose}>
      <div className="ra-share-toolbar">
        <h2 id="ra-share-title">Share session history</h2>
        <button onClick={onClose} disabled={busy} autoFocus>
          Close
        </button>
      </div>
      <p>Preview your card. Nothing is uploaded or posted automatically.</p>
      <label className="ra-share-name">
        Name on card (optional)
        <input value={name} maxLength={60} disabled={busy} onChange={(event) => setName(event.target.value)} />
      </label>
      <canvas
        ref={canvasRef}
        className="ra-share-canvas"
        role="img"
        aria-label={`Session history card for the last ${breakdown.days} days: ${breakdown.overview.totalPlaytimeLabel}, ${breakdown.overview.totalSessions} sessions`}
      />
      <div className="ra-share-toolbar">
        <button disabled={busy || !ready} onClick={() => exportImage(false)}>
          Save PNG
        </button>
        <button disabled={busy || !ready} onClick={() => exportImage(true)}>
          Copy image
        </button>
      </div>
      <p role="status">{busy ? 'Preparing image…' : message}</p>
    </dialog>
  );
}
