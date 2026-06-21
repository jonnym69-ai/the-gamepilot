import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Search, Palette, Calendar, Scale, BarChart3, Gift, Wand2, Heart, Link2, Trophy, Download, Target, HardDrive, Gauge, Monitor, Sparkles, Compass } from 'lucide-react';
import { useTheme } from '../ThemeContext';

function HybridNavBar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef(null);
  const { bigScreenMode, toggleBigScreenMode } = useTheme();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdown when navigating to a new page
  useEffect(() => {
    setIsDropdownOpen(false);
  }, [location]);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  return (
    <nav className="navbar">
      {/* Primary Navigation - Always Visible */}
      <div className="navbar-primary">
        <button
          type="button"
          className="nav-search-pill"
          onClick={() => window.dispatchEvent(new CustomEvent('gamepilot:open-command-palette'))}
          title="Search games and pages — press / anywhere"
          aria-label="Open command palette (shortcut: forward slash)"
        >
          <Search size={15} aria-hidden="true" />
          <span className="nav-search-pill-label">Search</span>
          <kbd className="nav-search-pill-kbd">/</kbd>
        </button>
        <Link to="/" className="nav-link" title="Home — recommendations and dashboard">Home</Link>
        <Link to="/library" className="nav-link" title="Browse and manage your game libraries">Library</Link>
        <Link to="/stats" className="nav-link" title="Playtime stats and session history">Stats</Link>
        <Link to="/profile" className="nav-link" title="Your gaming identity and profile">Profile</Link>
        <Link to="/settings" className="nav-link" title="Preferences, themes, and configuration">Settings</Link>
      </div>

      {/* Dropdown Menu for Secondary Items */}
      <div className="navbar-dropdown" ref={dropdownRef}>
        <button 
          className="dropdown-toggle"
          onClick={toggleDropdown}
          aria-label="More navigation options"
          aria-expanded={isDropdownOpen}
          title="More pages and tools"
        >
          {isDropdownOpen ? <X size={20} /> : <Menu size={20} />}
          <span>More</span>
        </button>

        {isDropdownOpen && (
          <div className="dropdown-menu">
            <div className="dropdown-section">
              <div className="dropdown-section-title">Tools</div>
              <Link to="/recommendations" className="dropdown-item" onClick={closeDropdown} title="Discover games with different recommendation styles">
                <Compass size={16} className="dropdown-item-icon" /> Recommendations
              </Link>
              <Link to="/free-games" className="dropdown-item" onClick={closeDropdown} title="Browse free-to-keep game giveaways">
                <Gift size={16} className="dropdown-item-icon" /> Free Games
              </Link>
              <Link to="/swipe-deck" className="dropdown-item" onClick={closeDropdown} title="Swipe through your library to build a shortlist">
                <Sparkles size={16} className="dropdown-item-icon" /> Swipe Deck
              </Link>
              <Link to="/library-intelligence" className="dropdown-item" onClick={closeDropdown} title="Compare games and surface backlog priorities">
                <Scale size={16} className="dropdown-item-icon" /> Library Intelligence
              </Link>
              <Link to="/habits" className="dropdown-item" onClick={closeDropdown} title="Track gaming habits and goals">
                <Calendar size={16} className="dropdown-item-icon" /> Habits
              </Link>
              <Link to="/achievements" className="dropdown-item" onClick={closeDropdown} title="View your achievements and rolling assignments">
                <Trophy size={16} className="dropdown-item-icon" /> Achievements
              </Link>
              <Link to="/challenge-board" className="dropdown-item" onClick={closeDropdown} title="Gaming challenges and quests">
                <Target size={16} className="dropdown-item-icon" /> Challenge Board
              </Link>
              <Link to="/year-in-review" className="dropdown-item" onClick={closeDropdown} title="Your yearly gaming recap">
                <BarChart3 size={16} className="dropdown-item-icon" /> Year in Review
              </Link>
              <Link to="/rewards" className="dropdown-item" onClick={closeDropdown} title="Unlockable customization earned through your habits">
                <Gift size={16} className="dropdown-item-icon" /> Rewards
              </Link>
              <Link to="/gaming-links" className="dropdown-item" onClick={closeDropdown} title="Your personal collection of gaming sites and resources">
                <Link2 size={16} className="dropdown-item-icon" /> Gaming Links
              </Link>
              <Link to="/export-hub" className="dropdown-item" onClick={closeDropdown} title="Export and backup your GamePilot data">
                <Download size={16} className="dropdown-item-icon" /> Export Hub
              </Link>
              <Link to="/storage-manager" className="dropdown-item" onClick={closeDropdown} title="Find cold games and reclaim disk space">
                <HardDrive size={16} className="dropdown-item-icon" /> Library Reclaimer
              </Link>
              <Link to="/performance-cockpit" className="dropdown-item" onClick={closeDropdown} title="Hardware analysis and game compatibility">
                <Gauge size={16} className="dropdown-item-icon" /> Performance Cockpit
              </Link>
              <Link to="/donate" className="dropdown-item" onClick={closeDropdown} title="Founder Lounge, Patreon support, and unlock codes">
                <Heart size={16} className="dropdown-item-icon" /> Founder Lounge
              </Link>
              <Link to="/themes" className="dropdown-item" onClick={closeDropdown} title="Switch mood themes">
                <Palette size={16} className="dropdown-item-icon" /> Themes
              </Link>
              <Link to="/theme-builder" className="dropdown-item" onClick={closeDropdown} title="Build custom themes with colors and effects">
                <Wand2 size={16} className="dropdown-item-icon" /> Theme Builder
              </Link>
            </div>
            <div className="dropdown-section">
              <div className="dropdown-section-title">View</div>
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  toggleBigScreenMode();
                  closeDropdown();
                }}
                title={bigScreenMode ? 'Switch to normal desktop view' : 'Switch to TV / controller-friendly view'}
              >
                <Monitor size={16} className="dropdown-item-icon" />
                {bigScreenMode ? 'Exit TV Mode' : 'TV Mode'}
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default HybridNavBar;
