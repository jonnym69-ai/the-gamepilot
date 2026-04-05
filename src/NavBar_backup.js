import React from 'react';
import { Link } from 'react-router-dom';

function NavBar() {
  return (
    <nav className="navbar">
      <Link to="/">Home</Link>
      <Link to="/library">Library</Link>
      <Link to="/stats">Stats</Link>
      <Link to="/achievements">🏆 Achievements</Link>
      <Link to="/year-in-review">📊 Year in Review</Link>
      <Link to="/challenge-board">🎯 Challenge Board</Link>
      <Link to="/performance">⚡ Performance</Link>
      <Link to="/gaming-links">Gaming Links</Link>
      <Link to="/donate">Founders</Link>
      <Link to="/profile">Profile</Link>
      <Link to="/settings">Settings</Link>
    </nav>
  );
}

export default NavBar;
