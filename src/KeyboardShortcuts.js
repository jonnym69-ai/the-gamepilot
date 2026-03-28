// KeyboardShortcuts.js - Global keyboard shortcut handler
export class KeyboardShortcuts {
  static shortcuts = new Map();
  static isListening = false;

  static init() {
    if (this.isListening) return;

    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.isListening = true;
  }

  static register(shortcut, callback, description = '') {
    this.shortcuts.set(shortcut, { callback, description });
  }

  static unregister(shortcut) {
    this.shortcuts.delete(shortcut);
  }

  static handleKeyDown(event) {
    // Don't trigger shortcuts when user is typing in input fields
    if (event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.contentEditable === 'true') {
      return;
    }

    const key = this.getKeyString(event);

    if (this.shortcuts.has(key)) {
      event.preventDefault();
      event.stopPropagation();
      this.shortcuts.get(key).callback(event);
    }
  }

  static getKeyString(event) {
    const parts = [];

    if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');

    parts.push(event.key.toUpperCase());

    return parts.join('+');
  }

  static getShortcutList() {
    return Array.from(this.shortcuts.entries()).map(([key, value]) => ({
      key,
      description: value.description
    }));
  }

  static showHelp() {
    const shortcuts = this.getShortcutList();
    if (shortcuts.length === 0) return;

    const helpText = shortcuts
      .map(shortcut => `${shortcut.key}: ${shortcut.description}`)
      .join('\n');

    alert(`Keyboard Shortcuts:\n\n${helpText}`);
  }
}

// Initialize keyboard shortcuts system
KeyboardShortcuts.init();
