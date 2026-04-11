import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Gift } from 'lucide-react';
import DailySpin from './DailySpin';
import { DailyEngagementService } from '../services/DailyEngagementService';

function HybridNavBar() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showSpin, setShowSpin] = useState(false);
  const [engagementStatus, setEngagementStatus] = useState(null);
  const location = useLocation();
  const dropdownRef = useRef(null);

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
        <Link to="/" className="nav-link" title="Home mission control and recommendations">Home</Link>
        <Link to="/library" className="nav-link" title="Browse and manage your launcher libraries">Library</Link>
        <Link to="/stats" className="nav-link" title="View local-first playtime, quest, and achievement stats">Stats</Link>
        <Link to="/profile" className="nav-link" title="See your progression, identity, and reward roadmap">Profile</Link>
        <Link to="/settings" className="nav-link" title="Customize themes, shortcuts, controller mode, and preferences">Settings</Link>
        <button 
          className={`nav-link spin-nav-button ${engagementStatus?.canSpin ? 'has-spin' : ''}`}
          onClick={() => setShowSpin(true)}
          title="Daily reward spin - come back every day!"
        >
          <Gift size={18} />
          <span>Daily</span>
          {engagementStatus?.currentStreak > 0 && (
            <span className="streak-badge">{engagementStatus.currentStreak}</span>
          )}
        </button>
      </div>

      <DailySpin isOpen={showSpin} onClose={() => {
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
                🎨 Themes
              </Link>
              <Link to="/rewards" className="dropdown-item" onClick={closeDropdown} title="Browse progression rewards and unlocks">
                🎁 Rewards
              </Link>
            </div>

            <div className="dropdown-section">
              <div className="dropdown-section-title">Stats & Achievements</div>
              <Link to="/achievements" className="dropdown-item" onClick={closeDropdown} title="See achievement chains, rarity, and XP rewards">
                🏆 Achievements
              </Link>
            </div>

            <div className="dropdown-section">
              <div className="dropdown-section-title">Progress & Challenges</div>
              <Link to="/year-in-review" className="dropdown-item" onClick={closeDropdown} title="Revisit your yearly recap and exportable review">
                📊 Year in Review
              </Link>
              <Link to="/exports" className="dropdown-item" onClick={closeDropdown} title="Central hub for backup, export, import, and sharing">
                📦 Export & Share
              </Link>
              <Link to="/challenge-board" className="dropdown-item" onClick={closeDropdown} title="Track rotating goals, quests, and challenge progress">
                🎯 Challenge Board
              </Link>
            </div>

            <div className="dropdown-section">
              <div className="dropdown-section-title">Tools & Links</div>
              <Link to="/performance" className="dropdown-item" onClick={closeDropdown} title="Inspect play patterns and recommendation performance">
                ⚡ Performance
              </Link>
              <Link to="/gaming-links" className="dropdown-item" onClick={closeDropdown} title="Open curated gaming links and companion resources">
                🔗 Gaming Links
              </Link>
            </div>

            <div className="dropdown-section">
              <div className="dropdown-section-title">Support</div>
              <Link to="/donate" className="dropdown-item" onClick={closeDropdown} title="Founder support and optional XP boost information">
                💝 Founders
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default HybridNavBar;
