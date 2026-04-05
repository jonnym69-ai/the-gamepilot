import React from 'react';
import { Link } from 'react-router-dom';

function HybridNavBarTest() {
  return (
    <nav className="navbar">
      <div className="navbar-primary">
        <Link to="/" className="nav-link">Home</Link>
        <Link to="/library" className="nav-link">Library</Link>
        <Link to="/stats" className="nav-link">Stats</Link>
        <Link to="/profile" className="nav-link">Profile</Link>
        <Link to="/settings" className="nav-link">Settings</Link>
      </div>
      <div className="navbar-dropdown">
        <button className="dropdown-toggle">
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}

export default HybridNavBarTest;
