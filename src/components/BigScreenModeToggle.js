import React from 'react';
import { Monitor, Tv } from 'lucide-react';
import InterfacePreferencesService from '../services/InterfacePreferencesService';
import useInterfacePreferences from '../hooks/useInterfacePreferences';
import './BigScreenModeToggle.css';

export function BigScreenModeToggle() {
  const prefs = useInterfacePreferences();
  const isBigScreen = !!prefs.bigScreenMode;

  const toggle = () => {
    InterfacePreferencesService.set('bigScreenMode', !isBigScreen);
  };

  return (
    <button
      type="button"
      className={`big-screen-toggle ${isBigScreen ? 'active' : ''}`}
      onClick={toggle}
      aria-pressed={isBigScreen}
      title={isBigScreen ? 'Exit big-screen mode' : 'Enter big-screen mode'}
    >
      {isBigScreen ? <Monitor size={20} /> : <Tv size={20} />}
      <span className="big-screen-toggle-label">{isBigScreen ? 'TV On' : 'TV Mode'}</span>
    </button>
  );
}
