import React, { useState, useEffect } from 'react';
import { QuickChallengeService } from '../services/QuickChallengeService';
import { Play, Star, Clock, Trophy, Compass, Check, Zap } from 'lucide-react';
import './QuickChallenges.css';

const iconMap = {
  play: Play,
  star: Star,
  clock: Clock,
  trophy: Trophy,
  compass: Compass
};

const QuickChallenges = ({ onComplete }) => {
  const [challenges, setChallenges] = useState(null);
  const [completing, setCompleting] = useState(null);

  useEffect(() => {
    setChallenges(QuickChallengeService.getChallenges());
  }, []);

  const handleComplete = (challengeId) => {
    setCompleting(challengeId);
    setTimeout(() => {
      const result = QuickChallengeService.completeChallenge(challengeId);
      setChallenges(QuickChallengeService.getChallenges());
      setCompleting(null);
      if (onComplete && result) {
        onComplete(result);
      }
    }, 500);
  };

  if (!challenges) return null;

  const dailyProgress = QuickChallengeService.getDailyProgress();
  const weeklyProgress = QuickChallengeService.getWeeklyProgress();

  return (
    <div className="quick-challenges">
      <div className="challenges-header">
        <h3>Quick Challenges</h3>
        <div className="challenges-progress">
          <span className="progress-daily">Daily: {dailyProgress.completed}/{dailyProgress.total}</span>
          <span className="progress-weekly">Weekly: {weeklyProgress.completed}/{weeklyProgress.total}</span>
        </div>
      </div>

      <div className="challenges-section">
        <h4>Today</h4>
        <div className="challenges-list">
          {challenges.daily.map(challenge => {
            const Icon = iconMap[challenge.icon] || Play;
            const progressPercent = Math.min((challenge.progress / challenge.target) * 100, 100);

            return (
              <div key={challenge.id} className={`challenge-card ${challenge.completed ? 'completed' : ''}`}>
                <div className="challenge-icon">
                  <Icon size={20} />
                </div>
                <div className="challenge-info">
                  <h5>{challenge.title}</h5>
                  <p>{challenge.description}</p>
                  <div className="challenge-progress-bar">
                    <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                  <span className="progress-text">{challenge.progress}/{challenge.target}</span>
                </div>
                <div className="challenge-reward">
                  <Zap size={14} className="xp-icon" />
                  <span>+{challenge.xpReward} XP</span>
                </div>
                {!challenge.completed && (
                  <button
                    className={`complete-btn ${completing === challenge.id ? 'completing' : ''}`}
                    onClick={() => handleComplete(challenge.id)}
                    disabled={completing === challenge.id}
                  >
                    {completing === challenge.id ? <Check size={18} /> : 'Complete'}
                  </button>
                )}
                {challenge.completed && (
                  <div className="completed-badge">
                    <Check size={18} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="challenges-section">
        <h4>This Week</h4>
        <div className="challenges-list">
          {challenges.weekly.map(challenge => {
            const Icon = iconMap[challenge.icon] || Trophy;
            const progressPercent = Math.min((challenge.progress / challenge.target) * 100, 100);

            return (
              <div key={challenge.id} className={`challenge-card ${challenge.completed ? 'completed' : ''}`}>
                <div className="challenge-icon weekly">
                  <Icon size={20} />
                </div>
                <div className="challenge-info">
                  <h5>{challenge.title}</h5>
                  <p>{challenge.description}</p>
                  <div className="challenge-progress-bar">
                    <div className="progress-fill weekly" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                  <span className="progress-text">{challenge.progress}/{challenge.target}</span>
                </div>
                <div className="challenge-reward">
                  <Zap size={14} className="xp-icon" />
                  <span>+{challenge.xpReward} XP</span>
                </div>
                {!challenge.completed && (
                  <button
                    className={`complete-btn ${completing === challenge.id ? 'completing' : ''}`}
                    onClick={() => handleComplete(challenge.id)}
                    disabled={completing === challenge.id}
                  >
                    {completing === challenge.id ? <Check size={18} /> : 'Complete'}
                  </button>
                )}
                {challenge.completed && (
                  <div className="completed-badge">
                    <Check size={18} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuickChallenges;
