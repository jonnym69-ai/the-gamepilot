import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';

/**
 * MilestoneToast — shows celebratory pop-up toasts when milestones are reached.
 * Accepts an array of milestone objects (from MilestoneService.checkMilestones).
 * Each toast auto-dismisses after 6 seconds. Multiple milestones stack briefly.
 */
const MilestoneToast = ({ milestones = [], onDismiss }) => {
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    if (!milestones || milestones.length === 0) return;
    setVisible(milestones);

    const timers = milestones.map((m, i) =>
      setTimeout(() => {
        setVisible((prev) => prev.filter((p) => p.id !== m.id));
        if (onDismiss) onDismiss(m);
      }, 6000 + i * 500)
    );

    return () => timers.forEach(clearTimeout);
  }, [milestones, onDismiss]);

  if (visible.length === 0) return null;

  return (
    <div className="milestone-toast-container">
      {visible.map((milestone) => (
        <div key={milestone.id} className="milestone-toast">
          <div className="milestone-toast-icon">
            <span aria-hidden="true">{milestone.icon}</span>
          </div>
          <div className="milestone-toast-content">
            <div className="milestone-toast-eyebrow">
              <Sparkles size={11} />
              <span>Milestone reached</span>
            </div>
            <div className="milestone-toast-label">{milestone.label}</div>
          </div>
          <button
            className="milestone-toast-close"
            onClick={() => {
              setVisible((prev) => prev.filter((p) => p.id !== milestone.id));
              if (onDismiss) onDismiss(milestone);
            }}
            aria-label="Dismiss milestone"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default MilestoneToast;
