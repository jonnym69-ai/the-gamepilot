import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DailyEngagementService, DAILY_REWARDS } from '../services/DailyEngagementService';
import { X, Gift, Zap, Star, Trophy, Sparkles } from 'lucide-react';
import './DailySpin.css';

const DailySpin = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setStatus(DailyEngagementService.getStatus());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSpin = () => {
    if (!status?.canSpin || spinning) return;

    setSpinning(true);
    setResult(null);

    const spinResult = DailyEngagementService.spinWheel();

    const segmentAngle = 360 / 11;
    const targetIndex = DAILY_REWARDS.findIndex(r => r.id === spinResult.reward.id);
    const targetRotation = 360 * 5 + (targetIndex * segmentAngle) + (Math.random() * segmentAngle * 0.8);

    setRotation(targetRotation);

    setTimeout(() => {
      setSpinning(false);
      setResult(spinResult);
      setStatus(DailyEngagementService.getStatus());
    }, 3000);
  };

  if (!isOpen || !status) return null;

  const rewards = DailyEngagementService.getAvailableRewards();
  const segmentAngle = 360 / rewards.length;

  return createPortal((
    <div className="spin-overlay" onClick={onClose}>
      <div className="spin-modal" onClick={(event) => event.stopPropagation()}>
        <button className="spin-close" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="spin-header">
          <h2>Daily Spin</h2>
          <div className="spin-streak">
            <Star size={18} className="streak-icon" />
            <span>{status.currentStreak} Day Streak</span>
          </div>
        </div>

        <div className="spin-wheel-container">
          <div className="spin-pointer"></div>
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
                <span className="segment-label" style={{ transform: `skewY(${-90 + segmentAngle}deg) rotate(${segmentAngle / 2}deg)` }}>
                  {reward.label}
                </span>
              </div>
            ))}
          </div>
          <div className="spin-center">
            {spinning ? <Sparkles className="spin-burst" /> : <Gift size={32} />}
          </div>
        </div>

        {result && (
          <div className="spin-result">
            <Trophy size={24} className="result-icon" />
            <span>You won: {result.reward.label} - {result.rewardMessage}</span>
          </div>
        )}

        <button
          className="spin-button"
          onClick={handleSpin}
          disabled={!status.canSpin || spinning}
        >
          {spinning ? (
            <>Spinning...</>
          ) : status.canSpin ? (
            <>Spin Now!</>
          ) : (
            <>Come back tomorrow!</>
          )}
        </button>

        {status.longestStreak > 0 && (
          <div className="spin-stats">
            <div className="stat">
              <Zap size={16} />
              <span>Best: {status.longestStreak} days</span>
            </div>
            <div className="stat">
              <Star size={16} />
              <span>Total: {status.totalLogins} logins</span>
            </div>
          </div>
        )}
      </div>
    </div>
  ), document.body);
};

export default DailySpin;
