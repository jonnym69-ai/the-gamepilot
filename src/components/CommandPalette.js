import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, Home, Library as LibraryIcon, BarChart3, User, Settings as SettingsIcon, Gift, Eye, Compass, BookOpen, MessageSquarePlus } from 'lucide-react';
import StorageService from '../services/StorageService';
import InterfacePreferencesService from '../services/InterfacePreferencesService';
import { getLaunchSources } from '../services/LibraryDataService';
import { scoreCommandMatch } from './commandPaletteMatch';
import './CommandPalette.css';

// Phase 0.5: product IA only — Home, Library, Recs, Stats, Profile, Settings, Year in Review, Feedback.
const NAV_COMMANDS = [
  { id: 'nav-home', label: 'Go to Home', icon: Home, path: '/', keywords: 'home dashboard' },
  { id: 'nav-library', label: 'Go to Library', icon: LibraryIcon, path: '/library', keywords: 'library games browse' },
  { id: 'nav-recommendations', label: 'Go to Recommendations', icon: Compass, path: '/recommendations', keywords: 'recommendations playstyle perfect play surprise' },
  { id: 'nav-stats', label: 'Go to Stats', icon: BarChart3, path: '/stats', keywords: 'stats statistics playtime light local' },
  { id: 'nav-profile', label: 'Go to Profile', icon: User, path: '/profile', keywords: 'profile identity persona roast' },
  { id: 'nav-year', label: 'Go to Year in Review', icon: BookOpen, path: '/year-in-review', keywords: 'year review recap story arc' },
  { id: 'nav-settings', label: 'Go to Settings', icon: SettingsIcon, path: '/settings', keywords: 'settings preferences config themes' },
  { id: 'nav-feedback', label: 'Send Feedback', icon: MessageSquarePlus, path: '/feedback', keywords: 'feedback suggest feature idea request bug report' }
];

const ACTION_COMMANDS = [
  { id: 'act-compact-toggle', label: 'Toggle compact mode', icon: Eye, keywords: 'compact density small tight ui',
    run: () => InterfacePreferencesService.set('compactMode', !InterfacePreferencesService.get('compactMode')) },
  { id: 'act-motion-toggle', label: 'Toggle reduced motion', icon: Eye, keywords: 'motion animation reduce',
    run: () => InterfacePreferencesService.set('reducedMotion', !InterfacePreferencesService.get('reducedMotion')) },
  { id: 'act-focus-home', label: 'Apply Focus Home preset', icon: Home, keywords: 'focus home minimal preset clean',
    run: () => InterfacePreferencesService.applyFocusHomePreset() },
  { id: 'act-hide-streak', label: 'Toggle streak count', icon: Eye, keywords: 'streak hide daily',
    run: () => InterfacePreferencesService.set('showStreakBadge', !InterfacePreferencesService.get('showStreakBadge')) },
  { id: 'act-hide-daily', label: 'Toggle Daily button', icon: Gift, keywords: 'daily button hide navbar',
    run: () => InterfacePreferencesService.set('showDailyButton', !InterfacePreferencesService.get('showDailyButton')) },
  { id: 'act-reset-interface', label: 'Reset interface preferences', icon: SettingsIcon, keywords: 'reset interface defaults',
    run: () => InterfacePreferencesService.resetAll() }
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const [library, setLibrary] = useState([]);
  useEffect(() => {
    if (!open) return;
    const stored = StorageService.get('library', []);
    setLibrary(Array.isArray(stored) ? stored : []);
  }, [open]);

  const gameCommands = useMemo(() => (
    library.slice(0, 500).map((game) => {
      const sources = getLaunchSources(game);
      const platformLabel = sources.length > 1
        ? sources.map((source) => source.platform).join(' · ')
        : (game?.platform || sources[0]?.platform || '');
      return {
        id: `game-${game?.appid || game?.name}`,
        label: `▶ ${game?.name || 'Unknown'}${platformLabel ? `  —  ${platformLabel}` : ''}`,
        icon: LibraryIcon,
        keywords: `${game?.name || ''} ${sources.map((source) => source.platform).join(' ')} ${(game?.genres || []).join(' ')}`,
        game
      };
    })
  ), [library]);

  const filtered = useMemo(() => {
    const all = [...ACTION_COMMANDS, ...NAV_COMMANDS, ...gameCommands];
    const q = query.trim();
    if (!q) return all.slice(0, 30);
    const scored = all
      .map((cmd) => ({ cmd, score: scoreCommandMatch(cmd, q) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 40);
    return scored.map((entry) => entry.cmd);
  }, [query, gameCommands]);

  useEffect(() => {
    const handleKey = (e) => {
      const isMod = e.ctrlKey || e.metaKey;
      const active = document.activeElement;
      const tag = active?.tagName;
      const isTypingInField = tag === 'INPUT' || tag === 'TEXTAREA' || active?.isContentEditable;

      if (isMod && (e.key === 'k' || e.key === 'K')) {
        if (isTypingInField && !open) return;
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === '/' && !isMod && !e.altKey && !e.shiftKey) {
        // Global fuzzy-search shortcut. Skip when the user is already
        // typing in a form field so we don't hijack normal '/' input.
        if (isTypingInField) return;
        e.preventDefault();
        setOpen(true);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    const openHandler = () => setOpen(true);
    window.addEventListener('gamepilot:open-command-palette', openHandler);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('gamepilot:open-command-palette', openHandler);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  const runCommand = useCallback((cmd) => {
    if (!cmd) return;
    if (cmd.path) {
      navigate(cmd.path);
    } else if (typeof cmd.run === 'function') {
      cmd.run();
    } else if (cmd.game) {
      // Launch directly via the App-level handler. Listening site:
      // App.js installs a 'gamepilot:launch-game' window listener.
      window.dispatchEvent(new CustomEvent('gamepilot:launch-game', { detail: cmd.game }));
    }
    setOpen(false);
  }, [navigate]);

  const handleInputKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runCommand(filtered[activeIndex]);
    }
  };

  if (!open) return null;

  return createPortal((
    <div className="command-palette-overlay" onClick={() => setOpen(false)}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Command palette">
        <div className="command-palette-search">
          <Search size={16} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKey}
            placeholder="Search commands, pages, or games…  (press / anywhere)"
            autoFocus
          />
          <kbd>Esc</kbd>
        </div>
        <div className="command-palette-list">
          {filtered.length === 0 && (
            <div className="command-palette-empty">No matches.</div>
          )}
          {filtered.map((cmd, idx) => {
            const Icon = cmd.icon || Search;
            return (
              <button
                type="button"
                key={cmd.id}
                className={`command-palette-item ${idx === activeIndex ? 'active' : ''}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => runCommand(cmd)}
              >
                <Icon size={14} />
                <span>{cmd.label}</span>
              </button>
            );
          })}
        </div>
        <div className="command-palette-footer">
          <span><kbd>\u2191</kbd><kbd>\u2193</kbd> navigate</span>
          <span><kbd>\u21b5</kbd> select</span>
          <span><kbd>/</kbd> or <kbd>Ctrl</kbd>+<kbd>K</kbd> toggle</span>
        </div>
      </div>
    </div>
  ), document.body);
}
