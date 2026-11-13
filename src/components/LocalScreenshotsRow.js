import React, { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import './LocalScreenshotsRow.css';

// The user's own Steam screenshots, read straight off disk
// (userdata/…/remote/<appid>/screenshots). Local files only — no network.
export default function LocalScreenshotsRow({ appid, gameName }) {
  const [shots, setShots] = useState(null);

  useEffect(() => {
    const api = typeof window !== 'undefined' ? window.electronAPI?.gameScreenshots : null;
    if (!appid || !api) {
      setShots([]);
      return undefined;
    }
    let cancelled = false;
    setShots(null);
    api(appid)
      .then((result) => {
        if (!cancelled) setShots(result?.ok ? result.shots || [] : []);
      })
      .catch(() => {
        if (!cancelled) setShots([]);
      });
    return () => {
      cancelled = true;
    };
  }, [appid]);

  if (!appid || !shots || shots.length === 0) return null;
  const withThumbs = shots.filter((shot) => shot.thumb);
  if (withThumbs.length === 0) return null;

  const open = (shot) => {
    window.electronAPI?.openScreenshot?.({ appid, dir: shot.dir, name: shot.name });
  };

  return (
    <div className="local-shots">
      <p className="local-shots-label">
        <Camera size={13} aria-hidden="true" />
        Your captures — {withThumbs.length} on disk
      </p>
      <div className="local-shots-strip" role="group" aria-label={`Your ${gameName || 'game'} screenshots`}>
        {withThumbs.map((shot) => (
          <button
            key={`${shot.dir}-${shot.name}`}
            type="button"
            className="local-shots-thumb"
            onClick={() => open(shot)}
            title={new Date(shot.mtime).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
            aria-label={`Open screenshot ${shot.name}`}
          >
            <img src={shot.thumb} alt="" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
}
