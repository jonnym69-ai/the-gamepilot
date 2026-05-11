import React, { useState, useEffect } from 'react';
import './ControllerHints.css';

const ControllerHints = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [hints, setHints] = useState([]);

  useEffect(() => {
    const checkController = () => {
      const gamepads = navigator.getGamepads?.() || [];
      const connected = gamepads.some(g => g && g.connected);
      setIsVisible(connected);
      return connected;
    };

    const updateHints = () => {
      const path = window.location.hash?.replace('#', '') || '/';
      
      // Base hints that show everywhere
      const baseHints = [
        { button: 'D-Pad', action: 'Move Focus' },
        { button: 'A', action: 'Select' },
        { button: 'B', action: 'Back/Close' },
        { button: 'LB/RB', action: 'Navigate Pages' }
      ];

      // Page-specific hints
      let pageHints = [];
      
      if (path === '/library' || path.includes('library')) {
        pageHints = [
          { button: 'A', action: 'Open Game' },
          { button: 'X', action: 'Favorite' }
        ];
      } else if (path === '/' || path === '') {
        pageHints = [
          { button: 'A', action: 'Play/Choose' }
        ];
      } else {
        pageHints = [];
      }

      // Modal is open - show modal hints
      const modal = document.querySelector('.game-modal-overlay, [data-modal-open="true"]');
      if (modal) {
        pageHints = [
          { button: 'A', action: 'Confirm' },
          { button: 'B', action: 'Close' },
          { button: 'D-Pad', action: 'Navigate' }
        ];
      }

      setHints([...pageHints, ...baseHints]);
    };

    // Check immediately
    checkController();
    updateHints();

    const handleControllerConnected = () => {
      checkController();
      updateHints();
    };

    const handleControllerDisconnected = () => {
      checkController();
      updateHints();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) updateHints();
    };

    window.addEventListener('gamepadconnected', handleControllerConnected);
    window.addEventListener('gamepaddisconnected', handleControllerDisconnected);
    window.addEventListener('hashchange', updateHints);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('gamepadconnected', handleControllerConnected);
      window.removeEventListener('gamepaddisconnected', handleControllerDisconnected);
      window.removeEventListener('hashchange', updateHints);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (!isVisible || hints.length === 0) {
    return null;
  }

  return (
    <div className="controller-hints-bar">
      <div className="controller-hints-container">
        {hints.map((hint, index) => (
          <div key={index} className="controller-hint-item">
            <span className="controller-hint-button">{hint.button}</span>
            <span className="controller-hint-action">{hint.action}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ControllerHints;
