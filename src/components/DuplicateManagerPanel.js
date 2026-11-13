import React, { useMemo, useState } from 'react';
import { Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { GameCurationService } from '../services/GameCurationService';
import { formatPlaytime } from '../utils/formatPlaytime';
import './DuplicateManagerPanel.css';

// Surfaces same-title copies across launchers and lets the user pick the
// preferred one. Merging folds the non-primary entries into the primary
// (they leave the grid but keep their data — unmerge restores them).
export default function DuplicateManagerPanel({ games, onChanged }) {
  const [open, setOpen] = useState(false);
  const [preferred, setPreferred] = useState({});
  const [version, setVersion] = useState(0);

  // `version` bumps re-render after merge/unmerge so storage is re-read.
  const groups = useMemo(
    () =>
      GameCurationService.findDuplicates(games).filter(
        (g) => g.filter((x) => !x.isDuplicateMerged).length > 1 && new Set(g.map((x) => x.platform)).size > 1
      ),
    [games]
  );
  void version;
  const merges = GameCurationService.getDuplicateMerges();

  if (groups.length === 0 && Object.keys(merges).length === 0) return null;

  const apply = (group) => {
    const primaryName = preferred[groupKey(group)] || pickDefault(group)?.name;
    if (!primaryName) return;
    GameCurationService.mergeDuplicateGames(
      primaryName,
      group.map((g) => g.name).filter((n) => n !== primaryName)
    );
    setVersion((v) => v + 1);
    onChanged?.();
  };

  const unmerge = (primaryKey) => {
    GameCurationService.unmergeDuplicateGames(primaryKey);
    setVersion((v) => v + 1);
    onChanged?.();
  };

  const mergedCount = Object.values(merges).reduce((n, list) => n + (list?.length || 0), 0);

  return (
    <div className="duplicate-manager">
      <button type="button" className="duplicate-manager-head" onClick={() => setOpen((o) => !o)}>
        <Copy size={14} aria-hidden="true" />
        <span>
          {groups.length} duplicate {groups.length === 1 ? 'title' : 'titles'}
          {mergedCount > 0 ? ` · ${mergedCount} merged` : ''}
        </span>
        {open ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
      </button>
      {open && (
        <div className="duplicate-manager-body">
          {groups.map((group) => {
            const key = groupKey(group);
            const selected = preferred[key] || pickDefault(group)?.name;
            return (
              <div key={key} className="duplicate-group">
                <h4>{group[0].name}</h4>
                {group.map((entry) => (
                  <label key={`${entry.name}-${entry.platform}`} className="duplicate-entry">
                    <input
                      type="radio"
                      name={`dup-${key}`}
                      checked={selected === entry.name}
                      onChange={() => setPreferred((p) => ({ ...p, [key]: entry.name }))}
                    />
                    <span className="duplicate-entry-name">{entry.name}</span>
                    <span className="duplicate-entry-meta">
                      {entry.platform}
                      {(entry.time_played || 0) > 0 ? ` · ${formatPlaytime(entry.time_played)}` : ''}
                    </span>
                  </label>
                ))}
                <button type="button" className="duplicate-merge-btn" onClick={() => apply(group)}>
                  Keep “{selected}” — hide the{' '}
                  {group.length - 1 === 1 ? 'other copy' : `${group.length - 1} other copies`}
                </button>
              </div>
            );
          })}
          {Object.entries(merges).map(([primary, dupes]) => (
            <div key={primary} className="duplicate-group duplicate-merged">
              <h4>{primary}</h4>
              <p className="duplicate-merged-note">{(dupes || []).join(', ')} folded into this entry.</p>
              <button type="button" className="duplicate-merge-btn" onClick={() => unmerge(primary)}>
                Unmerge — show all copies again
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const groupKey = (group) => group.map((g) => g.name).join('|');

// Highest recorded playtime is the most likely preferred copy.
const pickDefault = (group) => [...group].sort((a, b) => (b.time_played || 0) - (a.time_played || 0))[0] || null;
