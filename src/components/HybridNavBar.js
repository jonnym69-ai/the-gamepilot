import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X, Search, BookOpen, MessageSquarePlus, Monitor, Palette } from 'lucide-react';
import { useTheme } from '../ThemeContext';

// Phase 0.5 product IA — only these destinations are linked in the UI:
// Home · Library · Recommendations · Stats · Profile · Settings · Year in Review · Feedback
// Everything else stays mounted by URL if needed, but is not advertised.

function HybridNavBar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef(null);
  const { bigScreenMode, toggleBigScreenMode } = useTheme();

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
    <nav className="navbar">
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
        <NavLink to="/" end className="nav-link" title="Home — next pick and persona">Home</NavLink>
        <NavLink to="/library" className="nav-link" title="Browse and manage your game libraries">Library</NavLink>
        <NavLink to="/recommendations" className="nav-link" title="Playstyle recommendations">Recs</NavLink>
        <NavLink to="/stats" className="nav-link" title="Light local stats that feed your story">Stats</NavLink>
        <NavLink to="/profile" className="nav-link" title="Your gaming persona and roasts">Profile</NavLink>
        <NavLink to="/settings" className="nav-link" title="Preferences and configuration">Settings</NavLink>
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
              <Link to="/year-in-review" className="dropdown-item" onClick={closeDropdown} title="Your yearly gaming story arc">
                <BookOpen size={16} className="dropdown-item-icon" /> Year in Review
              </Link>
            </div>
            <div className="dropdown-section">
              <div className="dropdown-section-title">Community</div>
              <Link to="/feedback" className="dropdown-item" onClick={closeDropdown} title="Suggest features and share feedback">
                <MessageSquarePlus size={16} className="dropdown-item-icon" /> Feedback
              </Link>
            </div>
            <div className="dropdown-section">
              <div className="dropdown-section-title">View</div>
              <Link to="/themes" className="dropdown-item" onClick={closeDropdown} title="Change mood themes and seasonal looks">
                <Palette size={16} className="dropdown-item-icon" /> Themes
              </Link>
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
