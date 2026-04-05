import { useEffect, useCallback, useRef } from 'react';

function ControllerSupport({ children, onControllerInput }) {
  const lastInputRef = useRef({});

  const isControllerModeEnabled = useCallback(() => {
    return typeof document !== 'undefined' && document.body.classList.contains('big-screen-mode');
  }, []);

  const emitControllerInput = useCallback((...args) => {
    const [action, payload] = args;

    if (!isControllerModeEnabled() && action !== 'connected' && action !== 'disconnected') {
      return false;
    }

    if (typeof onControllerInput === 'function') {
      onControllerInput(...args);
    }

    const controllerEvent = new CustomEvent('controllerInput', {
      cancelable: true,
      detail: {
        action,
        payload
      }
    });

    return window.dispatchEvent(controllerEvent);
  }, [isControllerModeEnabled, onControllerInput]);

  const emitDebouncedInput = useCallback((action, payload = null, cooldownMs = 180) => {
    const now = Date.now();
    const lastInputAt = lastInputRef.current[action] || 0;
    if (now - lastInputAt < cooldownMs) {
      return;
    }

    lastInputRef.current[action] = now;
    emitControllerInput(action, payload);
  }, [emitControllerInput]);

  const handleGamepadInput = useCallback((gamepad) => {
    if (!gamepad) return;

    const buttons = gamepad.buttons.map(button => button.pressed);
    const axes = gamepad.axes.map(axis => Math.abs(axis) > 0.2 ? axis : 0);

    if (buttons[12] || axes[1] < -0.5) emitDebouncedInput('up');
    if (buttons[13] || axes[1] > 0.5) emitDebouncedInput('down');
    if (buttons[14] || axes[0] < -0.5) emitDebouncedInput('left');
    if (buttons[15] || axes[0] > 0.5) emitDebouncedInput('right');
    if (axes[3] < -0.45) emitDebouncedInput('scroll_up', null, 120);
    if (axes[3] > 0.45) emitDebouncedInput('scroll_down', null, 120);
    if (buttons[0]) emitDebouncedInput('confirm', null, 220);
    if (buttons[1]) emitDebouncedInput('cancel', null, 220);
    if (buttons[4] || buttons[6]) emitDebouncedInput('page_previous', null, 220);
    if (buttons[5] || buttons[7]) emitDebouncedInput('page_next', null, 220);
  }, [emitDebouncedInput]);

  useEffect(() => {
    const handleConnected = (e) => {
      console.log('Controller connected:', e.gamepad.id);
      emitControllerInput('connected', e.gamepad.id);
    };

    const handleDisconnected = (e) => {
      console.log('Controller disconnected:', e.gamepad.id);
      emitControllerInput('disconnected', e.gamepad.id);
    };

    window.addEventListener('gamepadconnected', handleConnected);
    window.addEventListener('gamepaddisconnected', handleDisconnected);

    const interval = setInterval(() => {
      const gamepads = (navigator.getGamepads?.() || []).filter(g => g && g.connected);
      if (gamepads.length > 0) {
        gamepads.forEach((gamepad) => {
          handleGamepadInput(gamepad);
        });
      }
    }, 100); // Poll every 100ms

    return () => {
      clearInterval(interval);
      window.removeEventListener('gamepadconnected', handleConnected);
      window.removeEventListener('gamepaddisconnected', handleDisconnected);
    };
  }, [emitControllerInput, handleGamepadInput]);

  return children;
}

export default ControllerSupport;
