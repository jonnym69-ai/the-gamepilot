import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DailyEngagementService } from '../services/DailyEngagementService';
import StorageService from '../services/StorageService';
import { X, Gift, Zap, Trophy, Sparkles, Flame, Target, Clock, Calendar, ChevronRight } from 'lucide-react';
import './DailyCheckIn.css';

const TIME_GREETINGS = {
  morning: ['Good morning, {name}', 'Rise and grind', 'Morning session ready'],
  afternoon: ['Good afternoon', 'Mid-day check-in', 'Back to the cockpit'],
  evening: ['Good evening', 'Night shift activated', 'Evening missions await'],
  night: ['Burning the midnight oil', 'Late night grinding', 'Night owl mode']
};

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'night';
};

const getGreeting = (streak, username) => {
  const timeOfDay = getTimeOfDay();
  const greetings = TIME_GREETINGS[timeOfDay];
  const fallbackName = 'Pilot';
  const resolvedName = typeof username === 'string' && username.trim() ? username.trim() : fallbackName;
  const baseTemplate = greetings[Math.floor(Math.random() * greetings.length)];
  const base = baseTemplate.replace('{name}', resolvedName);
  
  if (streak >= 30) return `${base} — ${streak} day legend!`;
  if (streak >= 7) return `${base} — ${streak} day streak!`;
  if (streak > 1) return `${base} — ${streak} days strong`;
  return base;
};

const StreakVisualizer = ({ streak, longestStreak }) => {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const today = new Date().getDay();
  const adjustedToday = today === 0 ? 6 : today - 1; // Convert to 0-6 (Mon-Sun)
  
  return (
    <div className="streak-visualizer">
      <div className="streak-flames">
        {streak >= 3 && <Flame className="flame-icon flame-1" size={20} />}
        {streak >= 7 && <Flame className="flame-icon flame-2" size={24} />}
        {streak >= 14 && <Flame className="flame-icon flame-3" size={28} />}
      </div>
      <div className="week-tracker">
        {days.map((day, idx) => {
          const isToday = idx === adjustedToday;
          const isPast = idx < adjustedToday;
          let status = 'future';
          if (isToday) status = streak > 0 ? 'today-active' : 'today-pending';
          else if (isPast) status = streak > (adjustedToday - idx) ? 'completed' : 'missed';
          
          return (
            <div key={idx} className={`week-day ${status}`}>
              <span className="day-label">{day}</span>
              <div className="day-dot" />
            </div>
          );
        })}
      </div>
      <div className="streak-numbers">
        <div className="streak-current">
          <Flame size={16} className="current-flame" />
          <span className="number">{streak}</span>
          <span className="label">current</span>
        </div>
        <div className="streak-divider" />
        <div className="streak-best">
          <Trophy size={14} />
          <span className="number">{longestStreak}</span>
          <span className="label">best</span>
        </div>
      </div>
    </div>
  );
};

const SpinWheel = ({ canSpin, onSpin, spinning, result, rotation }) => {
  const rewards = DailyEngagementService.getAvailableRewards();
  const segmentAngle = 360 / rewards.length;
  
  return (
    <div className="checkin-wheel-section">
      <div className="wheel-header">
        <Gift size={20} />
        <span>Daily Spin</span>
      </div>
      
      <div className="wheel-container">
        <div className="spin-pointer" />
        <div
          className={`spin-wheel ${spinning ? 'spinning' : ''}`}
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {rewards.map((reward, index) => (
            <div
              key={reward.id}
              className="spin-segment"
              style={{
                transform: `rotate(${index * segmentAngle}deg) skewY(${90 - segmentAngle}deg)`
              }}
            >
              <span 
                className="segment-label" 
                style={{ transform: `skewY(${-90 + segmentAngle}deg) rotate(${segmentAngle / 2}deg)` }}
              >
                {reward.label}
              </span>
            </div>
          ))}
        </div>
        <div className="spin-center">
          {spinning ? <Sparkles className="spin-burst" /> : <Gift size={28} />}
        </div>
      </div>
      
      {result && (
        <div className="spin-result-banner">
          <Trophy size={20} className="result-icon" />
          <div className="result-text">
            <span className="result-label">You won!</span>
            <span className="result-value">{result.reward.label} — {result.rewardMessage}</span>
          </div>
        </div>
      )}
      
      <button
        className={`spin-action-button ${canSpin ? 'active' : 'disabled'}`}
        onClick={onSpin}
        disabled={!canSpin || spinning}
      >
        {spinning ? (
          <><Sparkles size={18} /> Spinning...</>
        ) : canSpin ? (
          <><Zap size={18} /> Spin Now!</>
        ) : (
          <><Clock size={18} /> Come back tomorrow</>
        )}
      </button>
    </div>
  );
};

const DailyStats = ({ totalLogins, streak }) => {
  const getMotivation = () => {
    if (streak >= 30) return "You're a GamePilot legend!";
    if (streak >= 14) return "Two weeks strong — incredible!";
    if (streak >= 7) return "Week complete! Keep the fire going.";
    if (streak >= 3) return "Building momentum!";
    return "Every day counts. Start your streak!";
  };
  
  return (
    <div className="daily-stats">
      <div className="stat-row">
        <div className="stat-item">
          <Calendar size={16} />
          <span className="stat-value">{totalLogins}</span>
          <span className="stat-label">total visits</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <Target size={16} />
          <span className="stat-value">{streak > 0 ? streak : '-'}</span>
          <span className="stat-label">day streak</span>
        </div>
      </div>
      <p className="motivation-text">{getMotivation()}</p>
    </div>
  );
};

const DailyCheckIn = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [profileName, setProfileName] = useState(() => StorageService.getString('profileUsername', ''));
  const [showHistory, setShowHistory] = useState(false);
  const [rewardHistory, setRewardHistory] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setStatus(DailyEngagementService.getStatus());
      setProfileName(StorageService.getString('profileUsername', ''));
      setRewardHistory(DailyEngagementService.getRewardHistory());
      setShowHistory(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const syncProfileName = () => {
      setProfileName(StorageService.getString('profileUsername', ''));
    };

    window.addEventListener('gamepilot:profile-updated', syncProfileName);
    return () => window.removeEventListener('gamepilot:profile-updated', syncProfileName);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSpin = () => {
    if (!status?.canSpin || spinning) return;

    setSpinning(true);
    setResult(null);

    const spinResult = DailyEngagementService.spinWheel();
    const rewards = DailyEngagementService.getAvailableRewards();
    const segmentAngle = 360 / rewards.length;
    const targetIndex = rewards.findIndex(r => r.id === spinResult.reward.id);
    const targetRotation = 360 * 5 + (targetIndex * segmentAngle) + (Math.random() * segmentAngle * 0.8);

    setRotation(targetRotation);

    setTimeout(() => {
      setSpinning(false);
      setResult(spinResult);
      setStatus(DailyEngagementService.getStatus());
    }, 3000);
  };

  const greeting = useMemo(() => {
    if (!status) return 'Welcome back, Pilot';
    return getGreeting(status.currentStreak, profileName);
  }, [profileName, status]);

  if (!isOpen || !status) return null;

  return createPortal((
    <div className="checkin-overlay" onClick={onClose}>
      <div className="checkin-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="checkin-header">
          <button className="checkin-close" onClick={onClose}>
            <X size={22} />
          </button>
          <div className="greeting-section">
            <h1 className="greeting-text">{greeting}</h1>
            <p className="greeting-sub">
              {status.canSpin 
                ? "Your daily spin is ready!" 
                : "Check back tomorrow for more rewards."}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="checkin-content">
          {/* Left: Streak & Stats */}
          <div className="checkin-left">
            <StreakVisualizer 
              streak={status.currentStreak} 
              longestStreak={status.longestStreak}
            />
            <DailyStats 
              totalLogins={status.totalLogins} 
              streak={status.currentStreak}
            />
          </div>

          {/* Right: Wheel */}
          <div className="checkin-right">
            <SpinWheel
              canSpin={status.canSpin}
              onSpin={handleSpin}
              spinning={spinning}
              result={result}
              rotation={rotation}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="checkin-footer">
          <div className="reward-preview">
            <span className="preview-label">Possible rewards:</span>
            <div className="reward-chips">
              <span className="chip xp">+125-275 XP</span>
              <span className="chip boost">XP Boosters</span>
              <span className="chip bonus">Bonus Spins</span>
              <span className="chip cosmetic">Profile Items</span>
            </div>
          </div>
          <button className="view-history-btn" onClick={() => setShowHistory((s) => !s)}>
            <span>{showHistory ? 'Hide History' : 'Reward History'}</span>
            <ChevronRight size={16} style={{ transform: showHistory ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        </div>

        {/* Reward History Panel */}
        {showHistory && (
          <div className="reward-history-panel" style={{ marginTop: 12, padding: 12, background: 'rgba(0,0,0,0.25)', borderRadius: 8, maxHeight: 200, overflowY: 'auto' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#a78bfa' }}>Recent Rewards</h4>
            {rewardHistory.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af' }}>No rewards claimed yet. Spin the wheel to earn rewards!</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {rewardHistory.slice(0, 20).map((entry, idx) => (
                  <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: idx < rewardHistory.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', fontSize: '0.78rem' }}>
                    <span style={{ color: '#e5e7eb' }}>{entry.label}</span>
                    <span style={{ color: '#9ca3af', fontSize: '0.72rem' }}>{entry.date}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  ), document.body);
};

export default DailyCheckIn;
