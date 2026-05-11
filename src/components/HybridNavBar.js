import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu, X, Gift, Search,
  Palette, Trophy, BarChart3, Package, Target, Zap, Link2, Heart, HardDrive, Scale
} from 'lucide-react';
import DailyCheckIn from './DailyCheckIn';
import { DailyEngagementService } from '../services/DailyEngagementService';
import useInterfacePreferences from '../hooks/useInterfacePreferences';

function HybridNavBar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showSpin, setShowSpin] = useState(false);
  const [engagementStatus, setEngagementStatus] = useState(null);
  const location = useLocation();
  const dropdownRef = useRef(null);
  const prefs = useInterfacePreferences();

  useEffect(() => {
    setEngagementStatus(DailyEngagementService.getStatus());
  }, []);

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
        <Link to="/" className="nav-link" title="Home mission control and recommendations">Home</Link>
        <Link to="/library" className="nav-link" title="Browse and manage your launcher libraries">Library</Link>
        <Link to="/stats" className="nav-link" title="View local-first playtime, quest, and achievement stats">Stats</Link>
        <Link to="/profile" className="nav-link" title="See your progression, identity, and reward roadmap">Profile</Link>
        <Link to="/settings" className="nav-link" title="Customize themes, shortcuts, controller mode, and preferences">Settings</Link>
        {prefs.showDailyButton && (
          <button
            className={`nav-link spin-nav-button ${engagementStatus?.canSpin ? 'has-spin' : ''}`}
            onClick={() => setShowSpin(true)}
            title="Daily reward spin - come back every day!"
          >
            <Gift size={18} />
            <span>Daily</span>
            {prefs.showStreakBadge && engagementStatus?.currentStreak > 0 && (
              <span className="streak-badge">{engagementStatus.currentStreak}</span>
            )}
          </button>
        )}
      </div>

      <DailyCheckIn isOpen={showSpin} onClose={() => {
        setShowSpin(false);
        setEngagementStatus(DailyEngagementService.getStatus());
      }} />

      {/* Dropdown Menu for Less Frequent Items */}
      <div className="navbar-dropdown" ref={dropdownRef}>
        <button 
          className="dropdown-toggle"
          onClick={toggleDropdown}
          aria-label="More navigation options"
          aria-expanded={isDropdownOpen}
          title="Open more pages, tools, and export options"
        >
          {isDropdownOpen ? <X size={20} /> : <Menu size={20} />}
          <span>More</span>
        </button>

        {isDropdownOpen && (
          <div className="dropdown-menu">
            <div className="dropdown-section">
              <div className="dropdown-section-title">Customization & Rewards</div>
              <Link to="/themes" className="dropdown-item" onClick={closeDropdown} title="Switch and preview your unlocked themes">
                <Palette size={16} className="dropdown-item-icon" /> Themes
              </Link>
              <Link to="/rewards" className="dropdown-item" onClick={closeDropdown} title="Browse progression rewards and unlocks">
                <Gift size={16} className="dropdown-item-icon" /> Rewards
              </Link>
            </div>

            <div className="dropdown-section">
              <div className="dropdown-section-title">Stats & Achievements</div>
              <Link to="/library-intelligence" className="dropdown-item" onClick={closeDropdown} title="Compare owned games and surface backlog priorities">
                <Scale size={16} className="dropdown-item-icon" /> Library Intelligence
              </Link>
              <Link to="/achievements" className="dropdown-item" onClick={closeDropdown} title="See achievement chains, rarity, and XP rewards">
                <Trophy size={16} className="dropdown-item-icon" /> Achievements
              </Link>
            </div>

            <div className="dropdown-section">
              <div className="dropdown-section-title">Progress & Challenges</div>
              <Link to="/dashboard" className="dropdown-item" onClick={closeDropdown} title="Open the full dashboard with goals, wishlist, buy picks, collections, and session tools">
                <BarChart3 size={16} className="dropdown-item-icon" /> Dashboard
              </Link>
              <Link to="/year-in-review" className="dropdown-item" onClick={closeDropdown} title="Revisit your yearly recap and exportable review">
                <BarChart3 size={16} className="dropdown-item-icon" /> Year in Review
              </Link>
              <Link to="/exports" className="dropdown-item" onClick={closeDropdown} title="Central hub for backup, export, import, and sharing">
                <Package size={16} className="dropdown-item-icon" /> Export & Share
              </Link>
              <Link to="/challenge-board" className="dropdown-item" onClick={closeDropdown} title="Track rotating goals, quests, and challenge progress">
                <Target size={16} className="dropdown-item-icon" /> Challenge Board
              </Link>
            </div>

            <div className="dropdown-section">
              <div className="dropdown-section-title">Tools & Links</div>
              <Link to="/performance" className="dropdown-item" onClick={closeDropdown} title="Inspect play patterns and recommendation performance">
                <Zap size={16} className="dropdown-item-icon" /> Performance
              </Link>
              <Link to="/gaming-links" className="dropdown-item" onClick={closeDropdown} title="Open curated gaming links and companion resources">
                <Link2 size={16} className="dropdown-item-icon" /> Gaming Links
              </Link>
              <Link to="/storage" className="dropdown-item" onClick={closeDropdown} title="See disk usage per game and start safe uninstalls">
                <HardDrive size={16} className="dropdown-item-icon" /> Storage Manager
              </Link>
            </div>

            <div className="dropdown-section">
              <div className="dropdown-section-title">Support</div>
              <Link to="/donate" className="dropdown-item" onClick={closeDropdown} title="Founder support and optional XP boost information">
                <Heart size={16} className="dropdown-item-icon" /> Founders
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default HybridNavBar;
