import React, { useState } from 'react';
import { User, Brain, LayoutGrid } from 'lucide-react';
import GamerIdentityCard from './GamerIdentityCard';
import HabitInsightsPanel from './HabitInsightsPanel';
import SmartCollectionsShelf from './SmartCollectionsShelf';
import './LibrarianHubCarousel.css';

const TABS = [
  { id: 'identity', label: 'Identity', icon: User },
  { id: 'insights', label: 'Insights', icon: Brain },
  { id: 'shelves', label: 'Smart Shelves', icon: LayoutGrid }
];

const LibrarianHubCarousel = ({ library = [], onLaunchGame }) => {
  const [activeTab, setActiveTab] = useState('identity');

  return (
    <div className="librarian-hub-carousel">
      <div className="librarian-hub-tabs">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`librarian-hub-tab ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={isActive}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="librarian-hub-panel">
        {activeTab === 'identity' && (
          <GamerIdentityCard library={library} />
        )}
        {activeTab === 'insights' && (
          <HabitInsightsPanel library={library} />
        )}
        {activeTab === 'shelves' && (
          <SmartCollectionsShelf library={library} onLaunchGame={onLaunchGame} />
        )}
      </div>
    </div>
  );
};

export default LibrarianHubCarousel;
