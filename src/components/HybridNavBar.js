import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Search,
  MessageSquarePlus,
  Gift,
  Crown,
  Activity,
  CalendarDays,
  HardDrive,
  Flame,
} from 'lucide-react';

// Primary nav: Home · Library · Recs · Profile · Settings
// More menu: Your Gaming Life, Hall of Champions, Recent Activity, Wishlist, Storage Manager, Feedback

function HybridNavBar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

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
    <nav className="navbar" aria-label="Main navigation">
      <Link to="/" className="navbar-brand" aria-label="GamePilot home">
        <span className="navbar-brand-mark" aria-hidden="true">
          G
        </span>
        <span className="navbar-brand-name">
          Game<span>Pilot</span>
        </span>
      </Link>
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
        <NavLink to="/" end className="nav-link" title="Home — next pick and persona">
          Home
        </NavLink>
        <NavLink to="/library" className="nav-link" title="Browse and manage your game libraries">
          Library
        </NavLink>
        <NavLink to="/recommendations" className="nav-link" title="Playstyle recommendations">
          Recs
        </NavLink>
        <NavLink to="/profile" className="nav-link" title="Your gaming persona and story">
          Profile
        </NavLink>
        <NavLink to="/settings" className="nav-link" title="Preferences and configuration">
          Settings
        </NavLink>
      </div>

      <div className="navbar-dropdown" ref={dropdownRef}>
        <button
          className="dropdown-toggle"
          onClick={toggleDropdown}
          aria-label="More navigation options"
          aria-expanded={isDropdownOpen}
          aria-controls="gamepilot-more-navigation"
          aria-haspopup="true"
          title="Story and feedback"
        >
          {isDropdownOpen ? <X size={20} /> : <Menu size={20} />}
          <span>More</span>
        </button>

        {isDropdownOpen && (
          <div className="dropdown-menu" id="gamepilot-more-navigation" aria-label="More pages">
            <div className="dropdown-section">
              <div className="dropdown-section-title">Story</div>
              <Link
                to="/year-in-review"
                className="dropdown-item"
                onClick={closeDropdown}
                title="Your gaming life — eras, year recaps, and journal"
              >
                <CalendarDays size={16} className="dropdown-item-icon" /> Your Gaming Life
              </Link>
              <Link
                to="/timeline"
                className="dropdown-item"
                onClick={closeDropdown}
                title="Your most-played game each week, month, and year"
              >
                <Crown size={16} className="dropdown-item-icon" /> Hall of Champions
              </Link>
              <Link
                to="/recent-activity"
                className="dropdown-item"
                onClick={closeDropdown}
                title="Detailed breakdown of your last days of play"
              >
                <Activity size={16} className="dropdown-item-icon" /> Recent Activity
              </Link>
              <Link
                to="/wishlist"
                className="dropdown-item"
                onClick={closeDropdown}
                title="Track games you want and discover similar ones"
              >
                <Gift size={16} className="dropdown-item-icon" /> Wishlist
              </Link>
              <Link
                to="/trending"
                className="dropdown-item"
                onClick={closeDropdown}
                title="Steam's most-played games right now, crossed with your library"
              >
                <Flame size={16} className="dropdown-item-icon" /> Trending
              </Link>
            </div>
            <div className="dropdown-section">
              <div className="dropdown-section-title">Tools</div>
              <Link
                to="/storage-manager"
                className="dropdown-item"
                onClick={closeDropdown}
                title="Game install sizes and reclaimable space"
              >
                <HardDrive size={16} className="dropdown-item-icon" /> Storage Manager
              </Link>
            </div>
            <div className="dropdown-section">
              <div className="dropdown-section-title">Community</div>
              <Link
                to="/feedback"
                className="dropdown-item"
                onClick={closeDropdown}
                title="Suggest features and share feedback"
              >
                <MessageSquarePlus size={16} className="dropdown-item-icon" /> Feedback
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default HybridNavBar;
