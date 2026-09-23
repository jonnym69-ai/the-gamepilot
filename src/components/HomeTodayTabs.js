import React, { useState } from 'react';
import { Play, Sparkles, Palette } from 'lucide-react';
import PlayNextCard from './PlayNextCard';
import DailySpotlightCard from './DailySpotlightCard';
import DailyDoodleTitle from './DailyDoodleTitle';
import DailyParadox from './DailyParadox';
import './HomeTodayTabs.css';

const TABS = [
  { id: 'play-next', label: 'Play Next', icon: Play },
  { id: 'spotlight', label: 'Spotlight', icon: Sparkles },
  { id: 'doodle', label: 'Doodle & Paradox', icon: Palette },
];

/**
 * The hero's "Today" panel: the startup decision (Play Next), the daily
 * discovery card (Spotlight) and the fun extras (doodle/paradox) share one
 * tabbed slot so the hero stays compact instead of stacking cards.
 * Play Next is the default tab — it is the action the page exists for.
 */
export default function HomeTodayTabs({ library = [], onLaunchGame, username, welcomeMessage, profilePic, themeId }) {
  const [activeTab, setActiveTab] = useState('play-next');
  const hasLibrary = Array.isArray(library) && library.length > 0;

  return (
    <div className="home-today-tabs">
      <div className="home-today-tab-bar" role="tablist" aria-label="Today in GamePilot">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`home-today-tab ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={15} aria-hidden="true" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className="home-today-panel" role="tabpanel">
        {activeTab === 'play-next' &&
          (hasLibrary ? (
            <PlayNextCard library={library} onLaunchGame={onLaunchGame} />
          ) : (
            <p className="home-today-empty">Scan your library and GamePilot will have tonight&apos;s pick ready.</p>
          ))}
        {activeTab === 'spotlight' &&
          (hasLibrary ? (
            <DailySpotlightCard library={library} />
          ) : (
            <p className="home-today-empty">Today&apos;s Spotlight unlocks once your library is scanned.</p>
          ))}
        {activeTab === 'doodle' && (
          <div className="home-today-doodle">
            <DailyDoodleTitle
              username={username}
              welcomeMessage={welcomeMessage}
              profilePic={profilePic}
              themeId={themeId}
            />
            <DailyParadox />
          </div>
        )}
      </div>
    </div>
  );
}
