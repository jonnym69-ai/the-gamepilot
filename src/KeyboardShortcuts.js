// KeyboardShortcuts.js - Global keyboard shortcut handler
import StorageService from './services/StorageService';

const SHORTCUT_SETTINGS_KEY = 'keyboardShortcutSettings';

const normalizeShortcut = (shortcut) => String(shortcut || '')
  .trim()
  .split('+')
  .map((part) => part.trim())
  .filter(Boolean)
  .map((part, index, parts) => {
    const lower = part.toLowerCase();
    if (lower === 'cmd' || lower === 'meta' || lower === 'control' || lower === 'ctrl') {
      return 'Ctrl';
    }
    if (lower === 'option' || lower === 'alt') {
      return 'Alt';
    }
    if (lower === 'shift') {
      return 'Shift';
    }
    if (parts.length === 1 && part === '?') {
      return '?';
    }
    return part.length === 1 ? part.toUpperCase() : `${part.charAt(0).toUpperCase()}${part.slice(1)}`;
  })
  .join('+');

const readShortcutSettings = () => {
  try {
    const parsed = StorageService.get(SHORTCUT_SETTINGS_KEY, {});
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { enabled: true, bindings: {} };
    }
    return {
      enabled: parsed.enabled !== false,
      bindings: parsed.bindings && typeof parsed.bindings === 'object' && !Array.isArray(parsed.bindings)
        ? parsed.bindings
        : {}
    };
  } catch (error) {
    return { enabled: true, bindings: {} };
  }
};

export class KeyboardShortcuts {
  static actions = new Map();
  static shortcutToAction = new Map();
  static isListening = false;
  static settings = readShortcutSettings();

  static init() {
    if (this.isListening) return;

    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.isListening = true;
    this.rebuildShortcutIndex();
  }

  static persistSettings() {
    StorageService.set(SHORTCUT_SETTINGS_KEY, this.settings);
  }

  static rebuildShortcutIndex() {
    this.shortcutToAction = new Map();
    this.actions.forEach((config, actionId) => {
      const shortcut = this.getShortcutForAction(actionId);
      if (shortcut) {
        this.shortcutToAction.set(shortcut, actionId);
      }
    });
  }

  static registerAction(actionId, defaultShortcut, callback, description = '') {
    if (!actionId) {
      return;
    }

    this.actions.set(actionId, {
      actionId,
      defaultShortcut: normalizeShortcut(defaultShortcut),
      callback,
      description
    });
    this.rebuildShortcutIndex();
  }

  static unregisterAction(actionId) {
    this.actions.delete(actionId);
    this.rebuildShortcutIndex();
  }

  static register(shortcut, callback, description = '') {
    const normalizedShortcut = normalizeShortcut(shortcut);
    this.registerAction(normalizedShortcut, normalizedShortcut, callback, description);
  }

  static unregister(shortcut) {
    const normalizedShortcut = normalizeShortcut(shortcut);
    this.unregisterAction(normalizedShortcut);
  }

  static setEnabled(enabled) {
    this.settings.enabled = Boolean(enabled);
    this.persistSettings();
  }

  static isEnabled() {
    return this.settings.enabled !== false;
  }

  static getShortcutForAction(actionId) {
    const action = this.actions.get(actionId);
    if (!action) {
      return '';
    }

    const customShortcut = normalizeShortcut(this.settings.bindings?.[actionId] || '');
    return customShortcut || action.defaultShortcut || '';
  }

  static setShortcutForAction(actionId, shortcut) {
    if (!this.actions.has(actionId)) {
      return { success: false, message: 'Shortcut action not found.' };
    }

    const normalizedShortcut = normalizeShortcut(shortcut);
    if (!normalizedShortcut) {
      delete this.settings.bindings[actionId];
      this.persistSettings();
      this.rebuildShortcutIndex();
      return { success: true, message: 'Shortcut reset to default.' };
    }

    const duplicateAction = Array.from(this.actions.keys()).find((candidateId) => (
      candidateId !== actionId && this.getShortcutForAction(candidateId) === normalizedShortcut
    ));

    if (duplicateAction) {
      const duplicateMeta = this.actions.get(duplicateAction);
      return {
        success: false,
        message: `${normalizedShortcut} is already assigned to ${duplicateMeta?.description || duplicateAction}.`
      };
    }

    this.settings.bindings[actionId] = normalizedShortcut;
    this.persistSettings();
    this.rebuildShortcutIndex();
    return { success: true, message: 'Shortcut updated.' };
  }

  static resetShortcut(actionId) {
    if (typeof actionId === 'string' && actionId) {
      delete this.settings.bindings[actionId];
    } else {
      this.settings.bindings = {};
    }
    this.persistSettings();
    this.rebuildShortcutIndex();
  }

  static getSettings() {
    return {
      enabled: this.isEnabled(),
      bindings: { ...(this.settings.bindings || {}) }
    };
  }

  static handleKeyDown(event) {
    if (!this.isEnabled()) {
      return;
    }

    if (event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.contentEditable === 'true') {
      return;
    }

    const key = this.getKeyString(event);
    const actionId = this.shortcutToAction.get(key);

    if (actionId && this.actions.has(actionId)) {
      event.preventDefault();
      event.stopPropagation();
      this.actions.get(actionId).callback(event);
    }
  }

  static getKeyString(event) {
    const parts = [];

    if (event.ctrlKey || event.metaKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) {
      // For single-character symbols that require Shift (e.g. ?, !, {), the
      // key already encodes the shifted state, so adding Shift would break
      // matching against shortcuts registered as the raw symbol.
      const key = event.key;
      const isSingleNonLetter = typeof key === 'string' && key.length === 1 && !/[A-Z]/.test(key);
      if (!isSingleNonLetter) {
        parts.push('Shift');
      }
    }

    const keyValue = event.key === ' ' ? 'Space' : event.key;
    parts.push(typeof keyValue === 'string' ? keyValue.toUpperCase() : String(keyValue));

    return normalizeShortcut(parts.join('+'));
  }

  static getShortcutList() {
    return Array.from(this.actions.entries()).map(([actionId, value]) => ({
      actionId,
      key: this.getShortcutForAction(actionId),
      defaultKey: value.defaultShortcut,
      description: value.description
    }));
  }

  static showHelp() {
    const shortcuts = this.getShortcutList();
    if (shortcuts.length === 0) return;

    const helpText = shortcuts
      .map((shortcut) => `${shortcut.key}: ${shortcut.description}`)
      .join('\n');

    alert(`Keyboard Shortcuts:\n\n${helpText}`);
  }
}

KeyboardShortcuts.init();
