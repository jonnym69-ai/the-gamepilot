import React, { useMemo } from 'react';
import { Puzzle } from 'lucide-react';
import { ModFolderDetectionService } from '../services/ModFolderDetectionService';

const ModBadge = ({ game }) => {
  const cacheKey = game?.path || game?.installPath || game?.gameDir || game?.appid || game?.name;
  const status = useMemo(
    () => ModFolderDetectionService.detectModded(game || {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cacheKey]
  );
  if (!status.modded) return null;

  return (
    <span className="mod-badge" title={`Modded: ${status.indicators.join(', ')}`}>
      <Puzzle size={10} />
      <span>Modded</span>
    </span>
  );
};

export default React.memo(ModBadge, (prev, next) => {
  const a = prev.game || {};
  const b = next.game || {};
  return (
    (a.path || a.installPath || a.gameDir || a.appid || a.name) ===
    (b.path || b.installPath || b.gameDir || b.appid || b.name)
  );
});
