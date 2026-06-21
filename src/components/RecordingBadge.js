import React, { useMemo } from 'react';
import { Video } from 'lucide-react';
import { RecordingDetectionService } from '../services/RecordingDetectionService';

const RecordingBadge = ({ gameName }) => {
  const stats = useMemo(() => RecordingDetectionService.getRecordingStats(gameName), [gameName]);
  if (!stats.isContentCreator) return null;

  return (
    <span className="recording-badge" title={`Recorded ${stats.recordedSessions}/${stats.totalSessions} sessions`}>
      <Video size={10} />
    </span>
  );
};

export default React.memo(RecordingBadge, (prev, next) => prev.gameName === next.gameName);
