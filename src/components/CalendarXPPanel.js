import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, 
  Flame, 
  Gift, 
  PartyPopper, 
  Sparkles,
  CheckCircle2,
  Clock,
  Trophy,
  TreePine
} from 'lucide-react';
import CalendarXPService from '../services/CalendarXPService';

const StreakFlame = ({ streak, size = 24 }) => {
  const getFlameColor = () => {
    if (streak >= 365) return '#f5b700'; // Gold for year
    if (streak >= 30) return '#ff6b35';  // Orange for month
    if (streak >= 7) return '#3dd9ff';   // Blue for week
    return '#ff8c42'; // Default orange
  };

  return (
    <div className="streak-flame" style={{ color: getFlameColor() }}>
      <Flame size={size} />
      {streak > 0 && <span className="streak-number">{streak}</span>}
    </div>
  );
};

const CalendarXPPanel = ({ onXPClaimed, compact = false }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showBirthdayInput, setShowBirthdayInput] = useState(false);
  const [birthdayMonth, setBirthdayMonth] = useState('');
  const [birthdayDay, setBirthdayDay] = useState('');
  const [showCompactExtras, setShowCompactExtras] = useState(false);

  const refreshStatus = useCallback(() => {
    setStatus(CalendarXPService.getFullCalendarStatus());
  }, []);

  const checkAutoRewards = useCallback(() => {
    const birthdayReward = CalendarXPService.processBirthdayReward();
    if (birthdayReward.success) {
      onXPClaimed?.(birthdayReward.xpEarned, birthdayReward.message);
      refreshStatus();
    }

    const anniversaryReward = CalendarXPService.checkAnniversaryReward();
    if (anniversaryReward.success) {
      onXPClaimed?.(anniversaryReward.xpEarned, anniversaryReward.message);
      refreshStatus();
    }

    const christmasReward = CalendarXPService.processChristmasReward();
    if (christmasReward.success) {
      onXPClaimed?.(christmasReward.xpEarned, christmasReward.message);
      refreshStatus();
    }
  }, [onXPClaimed, refreshStatus]);

  useEffect(() => {
    refreshStatus();
    checkAutoRewards();
  }, [checkAutoRewards, refreshStatus]);

  const handleCheckIn = () => {
    setLoading(true);
    const result = CalendarXPService.processDailyCheckin();
    setLoading(false);
    
    if (result.success) {
      onXPClaimed?.(result.xpEarned, result.message);
    }
    refreshStatus();
  };

  const handleClaimSeasonal = (eventId) => {
    const result = CalendarXPService.claimSeasonalReward(eventId);
    if (result.success) {
      onXPClaimed?.(result.xpEarned, result.message);
    }
    refreshStatus();
  };

  const handleSetBirthday = () => {
    const month = parseInt(birthdayMonth, 10) - 1; // Convert to 0-indexed
    const day = parseInt(birthdayDay, 10);
    
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      CalendarXPService.setBirthday(month, day);
      setShowBirthdayInput(false);
      refreshStatus();
    }
  };

  if (!status) return null;

  const { 
    streak, 
    canCheckIn, 
    isBirthdayToday, 
    birthday, 
    birthdayClaimed,
    isChristmasDay,
    christmasClaimed,
    christmasReward,
    monthsSinceJoin, 
    activeSeasonalEvents 
  } = status;

  const nextReward = CalendarXPService.getNextStreakReward(streak.currentStreak);

  if (compact) {
    return (
      <div className="calendar-xp-panel calendar-xp-panel--compact">
        <div className="calendar-header">
          <div className="streak-display">
            <StreakFlame streak={streak.currentStreak} size={34} />
            <div className="streak-info">
              <h3>{streak.currentStreak > 0 ? `${streak.currentStreak}-Day Streak` : 'Daily Check-In'}</h3>
              <p>{canCheckIn ? 'Ready to claim today\'s reward' : 'Already checked in today'}</p>
            </div>
          </div>

          {canCheckIn ? (
            <button
              className="checkin-button"
              onClick={handleCheckIn}
              disabled={loading}
            >
              <CheckCircle2 size={18} />
              {loading ? 'Claiming...' : 'Check In'}
            </button>
          ) : (
            <div className="checked-in-badge">
              <CheckCircle2 size={18} />
              Checked In
            </div>
          )}
        </div>

        {nextReward && (
          <div className="next-milestone-card">
            <div className="milestone-info">
              <Trophy size={16} />
              <span>{nextReward.days}-day milestone next</span>
            </div>
            <div className="milestone-reward">+{nextReward.bonus} XP</div>
          </div>
        )}

        <button
          type="button"
          className={`compact-extras-toggle ${showCompactExtras ? 'is-open' : ''}`}
          onClick={() => setShowCompactExtras((current) => !current)}
        >
          <span>More rewards</span>
          <span>{showCompactExtras ? 'Hide' : 'Show'}</span>
        </button>

        {showCompactExtras && (
          <div className="compact-extras-panel">
            <div className="compact-extra-card">
              <div className="compact-extra-heading">
                <PartyPopper size={15} />
                <span>Birthday Reward</span>
              </div>
              {isBirthdayToday ? (
                <p>{birthdayClaimed ? 'Birthday bonus already claimed this year.' : 'Birthday bonus is active today.'}</p>
              ) : birthday ? (
                <p>Birthday set for {new Date(2024, birthday.month, birthday.day).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.</p>
              ) : (
                <div className="compact-birthday-setup">
                  <p>Set your birthday for an annual XP bonus.</p>
                  {showBirthdayInput ? (
                    <div className="compact-birthday-inputs">
                      <select value={birthdayMonth} onChange={(e) => setBirthdayMonth(e.target.value)}>
                        <option value="">Month</option>
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i + 1}>{new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'long' })}</option>
                        ))}
                      </select>
                      <select value={birthdayDay} onChange={(e) => setBirthdayDay(e.target.value)}>
                        <option value="">Day</option>
                        {Array.from({ length: 31 }, (_, i) => (
                          <option key={i} value={i + 1}>{i + 1}</option>
                        ))}
                      </select>
                      <button type="button" onClick={handleSetBirthday} disabled={!birthdayMonth || !birthdayDay}>
                        Save
                      </button>
                    </div>
                  ) : (
                    <button type="button" className="set-birthday-btn" onClick={() => setShowBirthdayInput(true)}>
                      Set Birthday
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="compact-extra-card">
              <div className="compact-extra-heading">
                <TreePine size={15} />
                <span>Christmas Reward</span>
              </div>
              <p>
                {isChristmasDay
                  ? (christmasClaimed
                    ? 'Christmas reward already claimed this year.'
                    : `Today: +${christmasReward?.xp || 500} XP and ${christmasReward?.spins || 5} free spins.`)
                  : `Returns on Dec 25 with +${christmasReward?.xp || 500} XP and ${christmasReward?.spins || 5} spins.`}
              </p>
            </div>

            <div className="compact-extra-card">
              <div className="compact-extra-heading">
                <Calendar size={15} />
                <span>Membership</span>
              </div>
              <p>{monthsSinceJoin} month{monthsSinceJoin === 1 ? '' : 's'} in GamePilot. Anniversary XP triggers on your join date.</p>
            </div>

            {activeSeasonalEvents.length > 0 && (
              <div className="compact-extra-card compact-extra-card--seasonal">
                <div className="compact-extra-heading">
                  <Gift size={15} />
                  <span>Seasonal Events</span>
                </div>
                <div className="compact-seasonal-list">
                  {activeSeasonalEvents.map((event) => (
                    <div key={event.id} className={`compact-seasonal-item ${event.alreadyClaimed ? 'claimed' : ''}`}>
                      <div className="compact-seasonal-copy">
                        <strong>{event.name}</strong>
                        <span>+{event.xpBonus} XP</span>
                      </div>
                      {event.alreadyClaimed ? (
                        <div className="claimed-badge">Claimed</div>
                      ) : (
                        <button type="button" className="claim-event-btn" onClick={() => handleClaimSeasonal(event.id)}>
                          Claim
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="calendar-xp-panel">
      {/* Streak Header */}
      <div className="calendar-header">
        <div className="streak-display">
          <StreakFlame streak={streak.currentStreak} size={48} />
          <div className="streak-info">
            <h3>{streak.currentStreak > 0 ? `${streak.currentStreak}-Day Streak` : 'Start Your Streak!'}</h3>
            <p>Longest: {streak.longestStreak} days</p>
          </div>
        </div>
        
        {canCheckIn ? (
          <button 
            className="checkin-button"
            onClick={handleCheckIn}
            disabled={loading}
          >
            <CheckCircle2 size={20} />
            {loading ? 'Claiming...' : 'Daily Check-in'}
          </button>
        ) : (
          <div className="checked-in-badge">
            <CheckCircle2 size={20} />
            Checked In Today
          </div>
        )}
      </div>

      {/* Next Milestone */}
      {nextReward && (
        <div className="next-milestone-card">
          <div className="milestone-info">
            <Trophy size={20} />
            <span>Next milestone: {nextReward.days}-day streak</span>
          </div>
          <div className="milestone-reward">+{nextReward.bonus} XP bonus</div>
        </div>
      )}

      {/* Birthday Section */}
      <div className="calendar-section">
        <h4><PartyPopper size={18} /> Birthday Reward</h4>
        {isBirthdayToday ? (
          <div className="birthday-banner">
            <Sparkles size={32} />
            <div>
              <strong>Happy Birthday! 🎂</strong>
              <p>{birthdayClaimed ? 'Your birthday bonus has already been claimed this year.' : 'Your annual birthday bonus is ready today.'}</p>
            </div>
          </div>
        ) : birthday ? (
          <div className="birthday-set">
            <p>Birthday set: {new Date(2024, birthday.month, birthday.day).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</p>
          </div>
        ) : (
          <div className="birthday-setup">
            <p>Set your birthday for an annual XP bonus!</p>
            {showBirthdayInput ? (
              <div className="birthday-inputs">
                <select value={birthdayMonth} onChange={(e) => setBirthdayMonth(e.target.value)}>
                  <option value="">Month</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i + 1}>{new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'long' })}</option>
                  ))}
                </select>
                <select value={birthdayDay} onChange={(e) => setBirthdayDay(e.target.value)}>
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <button onClick={handleSetBirthday} disabled={!birthdayMonth || !birthdayDay}>
                  Save
                </button>
              </div>
            ) : (
              <button className="set-birthday-btn" onClick={() => setShowBirthdayInput(true)}>
                Set Birthday
              </button>
            )}
          </div>
        )}
      </div>

      <div className="calendar-section">
        <h4><TreePine size={18} /> Christmas Day Reward</h4>
        {isChristmasDay ? (
          <div className="birthday-banner">
            <Sparkles size={32} />
            <div>
              <strong>Christmas bonus live! 🎄</strong>
              <p>{christmasClaimed ? 'Your Christmas reward has already been claimed this year.' : `Claim ${christmasReward?.spins || 5} free spins and +${christmasReward?.xp || 500} XP today.`}</p>
            </div>
          </div>
        ) : (
          <div className="birthday-set">
            <p>Come back on December 25 for +{christmasReward?.xp || 500} XP and {christmasReward?.spins || 5} free spins.</p>
          </div>
        )}
      </div>

      {/* Anniversary Progress */}
      <div className="calendar-section">
        <h4><Calendar size={18} /> Membership</h4>
        <div className="anniversary-progress">
          <div className="membership-stats">
            <div className="stat">
              <strong>{monthsSinceJoin}</strong>
              <span>Months</span>
            </div>
            <div className="stat">
              <strong>{Math.floor(monthsSinceJoin / 12)}</strong>
              <span>Years</span>
            </div>
          </div>
          <p className="anniversary-hint">
            Anniversaries grant bonus XP on your join date each month!
          </p>
        </div>
      </div>

      {/* Seasonal Events */}
      {activeSeasonalEvents.length > 0 && (
        <div className="calendar-section seasonal">
          <h4><Gift size={18} /> Seasonal Events</h4>
          <div className="seasonal-events-grid">
            {activeSeasonalEvents.map(event => (
              <div key={event.id} className={`seasonal-event-card ${event.alreadyClaimed ? 'claimed' : ''}`}>
                <div className="event-icon">{event.id === 'halloween' ? '🎃' : event.id === 'winter' ? '❄️' : event.id === 'summer' ? '☀️' : event.id === 'spring' ? '🌸' : '🎉'}</div>
                <div className="event-info">
                  <strong>{event.name}</strong>
                  <p>{event.description}</p>
                  <span className="event-bonus">+{event.xpBonus} XP</span>
                </div>
                {event.alreadyClaimed ? (
                  <div className="claimed-badge">Claimed</div>
                ) : (
                  <button 
                    className="claim-event-btn"
                    onClick={() => handleClaimSeasonal(event.id)}
                  >
                    Claim
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Streak Calendar Grid */}
      {streak.currentStreak > 0 && (
        <div className="calendar-section">
          <h4><Clock size={18} /> Recent Activity</h4>
          <div className="streak-visual">
            {Array.from({ length: Math.min(streak.currentStreak, 14) }, (_, i) => (
              <div key={i} className="streak-day active" title={`Day ${streak.currentStreak - i}`}>
                <Flame size={16} />
              </div>
            ))}
            {Array.from({ length: Math.max(0, 7 - Math.min(streak.currentStreak, 7)) }, (_, i) => (
              <div key={`empty-${i}`} className="streak-day empty" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarXPPanel;
