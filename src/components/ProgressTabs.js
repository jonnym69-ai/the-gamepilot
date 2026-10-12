import React from 'react';
import { NavLink } from 'react-router-dom';
import { Target, Trophy, Gift } from 'lucide-react';
import './ProgressTabs.css';

const PROGRESS_TABS = [
  { to: '/habits', label: 'Goals & Habits', icon: Target },
  { to: '/achievements', label: 'Achievements', icon: Trophy },
  { to: '/rewards', label: 'Rewards', icon: Gift },
];

// Shared tab strip that makes Habits, Achievements and Rewards read as one
// "Progress" area instead of three unrelated destinations.
export default function ProgressTabs() {
  return (
    <nav className="progress-tabs" aria-label="Progress sections">
      {PROGRESS_TABS.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `progress-tab${isActive ? ' progress-tab-active' : ''}`}>
          <Icon size={15} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
