import { useEffect, useCallback, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[role="button"]:not([aria-disabled="true"])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

const isElementVisible = (element) => {
  if (!element || !(element instanceof HTMLElement)) return false;
  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  return rect.width > 0
    && rect.height > 0
    && style.visibility !== 'hidden'
    && style.display !== 'none'
    && !element.closest('[aria-hidden="true"], [hidden]');
};

const getFocusableElements = () => Array.from(document.querySelectorAll(FOCUSABLE_SELECTOR))
  .filter((element) => isElementVisible(element));

const getElementCenter = (element) => {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
};

const findDirectionalTarget = (currentElement, direction, focusableElements) => {
  if (!focusableElements.length) return null;
  if (!currentElement || !focusableElements.includes(currentElement)) {
    return focusableElements[0];
  }

  const currentCenter = getElementCenter(currentElement);
  const candidates = focusableElements
    .filter((element) => element !== currentElement)
    .map((element) => {
      const center = getElementCenter(element);
      const deltaX = center.x - currentCenter.x;
      const deltaY = center.y - currentCenter.y;
      const primaryDistance = direction === 'left' || direction === 'right' ? Math.abs(deltaX) : Math.abs(deltaY);
      const secondaryDistance = direction === 'left' || direction === 'right' ? Math.abs(deltaY) : Math.abs(deltaX);

      return {
        element,
        deltaX,
        deltaY,
        score: primaryDistance + secondaryDistance * 1.8
      };
    })
    .filter((candidate) => {
      if (direction === 'up') return candidate.deltaY < -8;
      if (direction === 'down') return candidate.deltaY > 8;
      if (direction === 'left') return candidate.deltaX < -8;
      if (direction === 'right') return candidate.deltaX > 8;
      return false;
    })
    .sort((a, b) => a.score - b.score);

  if (candidates[0]) return candidates[0].element;

  const currentIndex = focusableElements.indexOf(currentElement);
  if (direction === 'up' || direction === 'left') {
    return focusableElements[Math.max(0, currentIndex - 1)] || currentElement;
  }
  return focusableElements[Math.min(focusableElements.length - 1, currentIndex + 1)] || currentElement;
};

const focusElement = (element) => {
  if (!element) return false;
  element.focus({ preventScroll: true });
  element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  return true;
};

const activateElement = (element) => {
  if (!element || !(element instanceof HTMLElement)) return false;
  const tagName = element.tagName.toLowerCase();
  const type = element.getAttribute('type');

  if (tagName === 'input' && (type === 'checkbox' || type === 'radio')) {
    element.click();
    return true;
  }

  if (tagName === 'select' || tagName === 'textarea' || (tagName === 'input' && type !== 'button' && type !== 'submit')) {
    element.focus();
    return true;
  }

  element.click();
  return true;
};

const findCloseTarget = () => document.querySelector([
  '[aria-label*="close" i]',
  '[title*="close" i]',
  '.modal-close',
  '.close-button',
  '.game-modal-close',
  '.dropdown-toggle[aria-expanded="true"]'
].join(','));

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

  const handleControllerNavigation = useCallback((direction) => {
    if (!isControllerModeEnabled()) return false;
    const focusableElements = getFocusableElements();
    const target = findDirectionalTarget(document.activeElement, direction, focusableElements);
    return focusElement(target);
  }, [isControllerModeEnabled]);

  const handleControllerActivation = useCallback(() => {
    if (!isControllerModeEnabled()) return false;
    const activeElement = document.activeElement;
    if (!activeElement || activeElement === document.body) {
      return focusElement(getFocusableElements()[0]);
    }
    return activateElement(activeElement);
  }, [isControllerModeEnabled]);

  const handleControllerCancel = useCallback(() => {
    if (!isControllerModeEnabled()) return false;
    const closeTarget = findCloseTarget();
    if (closeTarget) {
      closeTarget.click();
      return true;
    }
    const currentPath = window.location.hash?.replace('#', '') || '/';
    if (currentPath && currentPath !== '/') {
      window.history.back();
      return true;
    }
    return false;
  }, [isControllerModeEnabled]);

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
      if (!isControllerModeEnabled()) return;
      if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
      const gamepads = navigator.getGamepads();
      if (!gamepads) return;
      const active = [];
      for (let i = 0; i < gamepads.length; i++) {
        const g = gamepads[i];
        if (g && g.connected) active.push(g);
      }
      if (active.length > 0) {
        // Only process the first active gamepad to avoid duplicate inputs
        handleGamepadInput(active[0]);
      }
    }, 250); // Poll only while controller mode is enabled

    return () => {
      clearInterval(interval);
      window.removeEventListener('gamepadconnected', handleConnected);
      window.removeEventListener('gamepaddisconnected', handleDisconnected);
    };
  }, [emitControllerInput, handleGamepadInput, isControllerModeEnabled]);

  useEffect(() => {
    const handleControllerInput = (e) => {
      if (e.defaultPrevented) return;
      if (e.detail.action === 'up' && handleControllerNavigation('up')) e.preventDefault();
      if (e.defaultPrevented) return;
      if (e.detail.action === 'down' && handleControllerNavigation('down')) e.preventDefault();
      if (e.defaultPrevented) return;
      if (e.detail.action === 'left' && handleControllerNavigation('left')) e.preventDefault();
      if (e.defaultPrevented) return;
      if (e.detail.action === 'right' && handleControllerNavigation('right')) e.preventDefault();
      if (e.defaultPrevented) return;
      if (e.detail.action === 'confirm' && handleControllerActivation()) e.preventDefault();
      if (e.defaultPrevented) return;
      if (e.detail.action === 'cancel' && handleControllerCancel()) e.preventDefault();
    };

    window.addEventListener('controllerInput', handleControllerInput);

    return () => {
      window.removeEventListener('controllerInput', handleControllerInput);
    };
  }, [handleControllerNavigation, handleControllerActivation, handleControllerCancel]);

  return children || null;
}

export default ControllerSupport;
