import { useEffect, useCallback } from 'react';

const KeyboardShortcuts = ({ children, shortcuts }) => {
  const handleKeyDown = useCallback((event) => {
    // Check if user is typing in an input field
    const isInputFocused = event.target.tagName === 'INPUT' || 
                          event.target.tagName === 'TEXTAREA' || 
                          event.target.contentEditable === 'true';
    
    if (isInputFocused) return;

    const { key, ctrlKey, shiftKey, altKey } = event;
    const modifiers = {
      ctrl: ctrlKey,
      shift: shiftKey,
      alt: altKey
    };

    // Check for matching shortcuts
    for (const [shortcut, action] of Object.entries(shortcuts)) {
      const [shortcutKey, shortcutModifiers] = shortcut.split('+');
      
      if (key.toLowerCase() === shortcutKey.toLowerCase() &&
          (!shortcutModifiers?.includes('ctrl') || modifiers.ctrl) &&
          (!shortcutModifiers?.includes('shift') || modifiers.shift) &&
          (!shortcutModifiers?.includes('alt') || modifiers.alt)) {
        
        event.preventDefault();
        action();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return children;
};

export default KeyboardShortcuts;
