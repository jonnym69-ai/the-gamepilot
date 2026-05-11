import React, { useRef, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
import './DraggableHomeSection.css';

const DraggableHomeSection = ({
  id,
  label,
  isEditMode = false,
  isDragging = false,
  isDropTarget = false,
  dropPosition = 'above',
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  children
}) => {
  const wrapperRef = useRef(null);
  const draggingRef = useRef(false);

  const computePosition = (clientY, rect) => {
    const midpoint = rect.top + rect.height / 2;
    return clientY < midpoint ? 'above' : 'below';
  };

  useEffect(() => {
    if (!isEditMode || !wrapperRef.current) return;

    const handle = wrapperRef.current.querySelector('.draggable-home-section-handle');
    if (!handle) return;

    let active = false;
    let lastTargetId = null;
    let lastPosition = 'above';

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      active = true;
      draggingRef.current = true;
      if (typeof window !== 'undefined') {
        window.__gamePilotDragSourceId = id;
      }
      onDragStart && onDragStart(id);
    };

    const onMouseMove = (e) => {
      if (!active) return;
      e.preventDefault();
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const target = el?.closest('[data-home-section-id]');
      if (!target) return;
      const targetId = target.dataset.homeSectionId;
      const rect = target.getBoundingClientRect();
      const position = computePosition(e.clientY, rect);
      if (targetId !== lastTargetId || position !== lastPosition) {
        if (lastTargetId && lastTargetId !== targetId) {
          onDragLeave && onDragLeave(lastTargetId);
        }
        lastTargetId = targetId;
        lastPosition = position;
        onDragOver && onDragOver(targetId, position);
      }
    };

    const onMouseUp = (e) => {
      if (!active) return;
      active = false;
      draggingRef.current = false;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const target = el?.closest('[data-home-section-id]');
      if (target) {
        const targetId = target.dataset.homeSectionId;
        const rect = target.getBoundingClientRect();
        const position = computePosition(e.clientY, rect);
        const sourceId = (typeof window !== 'undefined' && window.__gamePilotDragSourceId) || id;
        onDrop && onDrop(sourceId, targetId, position);
      }
      if (lastTargetId) {
        onDragLeave && onDragLeave(lastTargetId);
      }
      lastTargetId = null;
      if (typeof window !== 'undefined') {
        window.__gamePilotDragSourceId = null;
      }
      onDragEnd && onDragEnd();
    };

    handle.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      handle.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isEditMode, id, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd]);

  const wrapperClass = [
    'draggable-home-section',
    isEditMode ? 'is-edit-mode' : '',
    isDragging ? 'is-dragging' : '',
    isDropTarget ? `is-drop-target drop-${dropPosition}` : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={wrapperRef}
      className={wrapperClass}
      data-home-section-id={id}
    >
      {isEditMode && (
        <div
          className="draggable-home-section-handle"
          aria-hidden="true"
        >
          <GripVertical size={16} />
          <span className="draggable-home-section-label">{label}</span>
        </div>
      )}
      <div className="draggable-home-section-body">
        {children}
      </div>
    </div>
  );
};

export default DraggableHomeSection;
