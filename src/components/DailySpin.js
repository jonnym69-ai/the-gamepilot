import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DailyEngagementService, DAILY_REWARDS } from '../services/DailyEngagementService';
import {
  X, Gift, Zap, Star, Trophy, Sparkles,
  RotateCcw, Palette, Award, Image, Frame
} from 'lucide-react';
import './DailySpin.css';

const REWARD_COLORS = {
  xp: { bg: 'linear-gradient(145deg, #4ade80, #22c55e)', text: '#fff', glow: 'rgba(74,222,128,0.6)' },
  booster: { bg: 'linear-gradient(145deg, #67e8f9, #22d3ee)', text: '#0f172a', glow: 'rgba(103,232,249,0.6)' },
  spin: { bg: 'linear-gradient(145deg, #fbbf24, #f59e0b)', text: '#1e1b4b', glow: 'rgba(251,191,36,0.6)' },
  reroll: { bg: 'linear-gradient(145deg, #fb923c, #f97316)', text: '#fff', glow: 'rgba(251,146,60,0.6)' },
  frame: { bg: 'linear-gradient(145deg, #f472b6, #ec4899)', text: '#fff', glow: 'rgba(244,114,182,0.6)' },
  banner: { bg: 'linear-gradient(145deg, #a78bfa, #8b5cf6)', text: '#fff', glow: 'rgba(167,139,250,0.6)' },
  title: { bg: 'linear-gradient(145deg, #fde047, #eab308)', text: '#1e1b4b', glow: 'rgba(253,224,71,0.6)' },
  theme: { bg: 'linear-gradient(145deg, #c084fc, #a855f7)', text: '#fff', glow: 'rgba(192,132,252,0.6)' },
};

const REWARD_ICONS = {
  xp: Zap,
  booster: Sparkles,
  spin: Gift,
  reroll: RotateCcw,
  frame: Frame,
  banner: Image,
  title: Award,
  theme: Palette,
};

const getRewardStyle = (reward) => REWARD_COLORS[reward.type] || REWARD_COLORS.xp;
const getRewardIcon = (reward) => REWARD_ICONS[reward.type] || Star;

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
    if (!spinResult.success || !spinResult.reward) {
      setSpinning(false);
      setResult(spinResult);
      setStatus(DailyEngagementService.getStatus());
      return;
    }

    const segmentAngle = 360 / DAILY_REWARDS.length;
    const targetIndex = DAILY_REWARDS.findIndex(r => r.id === spinResult.reward.id);
    const targetOffset = (targetIndex * segmentAngle) + (Math.random() * segmentAngle * 0.65) + (segmentAngle * 0.175);
    const targetRotation = 360 * 5 + targetOffset;

    setRotation((currentRotation) => currentRotation + targetRotation);

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
          <div className="spin-balance">
            {status.spinsRemaining} {status.spinsRemaining === 1 ? 'spin' : 'spins'} available
          </div>
        </div>

        <div className="spin-wheel-container">
          <div className="spin-pointer"></div>
          <div
            className={`spin-wheel ${spinning ? 'spinning' : ''}`}
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {rewards.map((reward, index) => {
              const style = getRewardStyle(reward);
              const Icon = getRewardIcon(reward);
              return (
                <div
                  key={reward.id}
                  className="spin-segment"
                  style={{
                    transform: `rotate(${index * segmentAngle}deg) skewY(${90 - segmentAngle}deg)`,
                    background: style.bg,
                  }}
                >
                  <span
                    className="segment-label"
                    style={{
                      transform: `skewY(${-90 + segmentAngle}deg) rotate(${segmentAngle / 2}deg)`,
                      color: style.text,
                    }}
                  >
                    <Icon size={14} className="segment-icon" />
                    {reward.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="spin-center">
            {spinning ? <Sparkles className="spin-burst" /> : <Gift size={32} />}
          </div>
        </div>

        {result && result.reward && (
          <div className={`spin-result ${result.reward.type === 'spin' ? 'bonus-spin-result' : ''}`}>
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
            <>{status.spinsRemaining > 1 ? `Spin Again (${status.spinsRemaining} left)` : 'Spin Now!'}</>
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
