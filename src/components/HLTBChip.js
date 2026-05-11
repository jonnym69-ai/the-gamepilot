import React, { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import HowLongToBeatService from '../services/HowLongToBeatService';
import './HLTBChip.css';

const formatHours = (h) => {
  if (!h || h <= 0) return null;
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 10) return `${h.toFixed(1)}h`;
  return `${Math.round(h)}h`;
};

const HLTBChip = ({ game, variant = 'compact', autoFetch = false }) => {
  const [entry, setEntry] = useState(() => HowLongToBeatService.getCached(game));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setEntry(HowLongToBeatService.getCached(game));
    if (!autoFetch) return undefined;
    if (!HowLongToBeatService.isEnabled()) return undefined;
    const cached = HowLongToBeatService.getCached(game);
    if (cached && cached.found) return undefined;
    setLoading(true);
    HowLongToBeatService.getTimes(game).then((next) => {
      if (!cancelled) {
        setEntry(next || null);
        setLoading(false);
      }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [game, autoFetch]);

  if (!HowLongToBeatService.isEnabled()) {
    return null;
  }

  if (!entry || !entry.found) {
    if (loading) {
      return (
        <span className="hltb-chip hltb-chip--pending" title="Fetching from HowLongToBeat…">
          <Clock3 size={11} aria-hidden="true" />
          <span>—</span>
        </span>
      );
    }
    return (
      <span className="hltb-chip hltb-chip--pending" title="No HowLongToBeat data yet. Hover or wait for lookup.">
        <Clock3 size={11} aria-hidden="true" />
        <span>?</span>
      </span>
    );
  }

  const main = formatHours(entry.mainHours);
  const ext = formatHours(entry.mainExtraHours);
  const comp = formatHours(entry.completionistHours);

  if (variant === 'compact') {
    const label = main || ext || comp;
    if (!label) return null;
    const tip = [
      main && `Main story: ${main}`,
      ext && `Main + Extras: ${ext}`,
      comp && `Completionist: ${comp}`,
      entry.manualOverride && '(manual)'
    ].filter(Boolean).join('\n') + '\nSource: HowLongToBeat';
    return (
      <span className="hltb-chip" title={tip} aria-label={`HowLongToBeat main story ${label}`}>
        <Clock3 size={11} aria-hidden="true" />
        <span>{label}</span>
      </span>
    );
  }

  return (
    <div className="hltb-chip-row" aria-label="HowLongToBeat times">
      {main && <span className="hltb-chip hltb-chip--main" title="Main story">M {main}</span>}
      {ext && <span className="hltb-chip hltb-chip--ext" title="Main + extras">+ {ext}</span>}
      {comp && <span className="hltb-chip hltb-chip--comp" title="Completionist">100% {comp}</span>}
    </div>
  );
};

export default HLTBChip;
