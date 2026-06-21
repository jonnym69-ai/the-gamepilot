import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Flame, Target, TrendingUp, Calendar, Clock, Gamepad2, Award,
  ChevronLeft, ChevronRight, Plus, Trash2, Edit3, CheckCircle2,
  Lightbulb
} from 'lucide-react';
import { HabitTrackerService } from './services/HabitTrackerService';
import NavBar from './NavBar';
import './Habits.css';

const GOAL_TYPE_OPTIONS = [
  { value: 'days', label: 'Days Played' },
  { value: 'hours', label: 'Hours Played' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'completions', label: 'Games Completed' },
  { value: 'unique_games', label: 'Unique Games' },
  { value: 'new_genre', label: 'New Genres' },
  { value: 'streak', label: 'Day Streak' },
  { value: 'per_game_time', label: 'Hours in One Game' },
  { value: 'per_game_sessions', label: 'Sessions in One Game' },
  { value: 'genre_time', label: 'Hours in Genre' },
  { value: 'genre_sessions', label: 'Sessions in Genre' },
];

const ProgressRing = ({ percent, size = 48, stroke = 5, color = '#8ab4f8' }) => {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <svg width={size} height={size} className="habits-ring">
      <circle className="habits-ring-bg" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
      <circle
        className="habits-ring-fill"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        stroke={color}
      />
      <text x="50%" y="50%" dy="0.3em" textAnchor="middle" className="habits-ring-text">
        {percent}%
      </text>
    </svg>
  );
};

const Habits = ({ library = [] }) => {
  const [weeklyStats, setWeeklyStats] = useState(HabitTrackerService.getWeeklyStats(0));
  const [monthlyStats, setMonthlyStats] = useState(HabitTrackerService.getMonthlyStats(0));
  const [streaks] = useState(HabitTrackerService.getStreaks());
  const [goalProgress, setGoalProgress] = useState(HabitTrackerService.getGoalProgress());
  const [insights] = useState(HabitTrackerService.getInsights());
  const [moodLog] = useState(HabitTrackerService.getMoodLog(10));
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [editingGoals, setEditingGoals] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const labelInputRef = useRef(null);

  // Form state
  const [formLabel, setFormLabel] = useState('');
  const [formTarget, setFormTarget] = useState('');
  const [formType, setFormType] = useState('hours');
  const [formPeriod, setFormPeriod] = useState('week');
  const [formGameName, setFormGameName] = useState('');
  const [formGenre, setFormGenre] = useState('');

  useEffect(() => {
    setWeeklyStats(HabitTrackerService.getWeeklyStats(weekOffset));
  }, [weekOffset]);

  useEffect(() => {
    setMonthlyStats(HabitTrackerService.getMonthlyStats(monthOffset));
  }, [monthOffset]);

  useEffect(() => {
    setSuggestions(HabitTrackerService.getGoalSuggestions(library));
  }, [library]);

  useEffect(() => {
    if (showCreate && labelInputRef.current) {
      labelInputRef.current.focus();
    }
  }, [showCreate]);

  const refreshGoals = () => {
    setGoalProgress(HabitTrackerService.getGoalProgress());
    setSuggestions(HabitTrackerService.getGoalSuggestions(library));
  };

  const resetForm = () => {
    setFormLabel('');
    setFormTarget('');
    setFormType('hours');
    setFormPeriod('week');
    setFormGameName('');
    setFormGenre('');
    setShowCreate(false);
    setEditingGoalId(null);
  };

  const handleCreateGoal = () => {
    const targetVal = parseInt(formTarget, 10);
    if (!targetVal || targetVal < 1) return;
    HabitTrackerService.createGoal({
      label: formLabel,
      target: targetVal,
      type: formType,
      period: formPeriod,
      gameName: formGameName || null,
      genre: formGenre || null,
    });
    resetForm();
    refreshGoals();
  };

  const handleUpdateGoal = () => {
    const targetVal = parseInt(formTarget, 10);
    if (!targetVal || targetVal < 1) return;
    HabitTrackerService.updateGoal(editingGoalId, {
      label: formLabel,
      target: targetVal,
      type: formType,
      period: formPeriod,
      gameName: formGameName || null,
      genre: formGenre || null,
    });
    resetForm();
    refreshGoals();
  };

  const handleDeleteGoal = (id) => {
    if (window.confirm('Delete this goal?')) {
      HabitTrackerService.deleteGoal(id);
      refreshGoals();
    }
  };

  const startEdit = (goal) => {
    setEditingGoalId(goal.id);
    setFormLabel(goal.label);
    setFormTarget(String(goal.target));
    setFormType(goal.type);
    setFormPeriod(goal.period);
    setFormGameName(goal.gameName || '');
    setFormGenre(goal.genre || '');
    setShowCreate(true);
  };

  const toggleGoalActive = (period, id) => {
    HabitTrackerService.toggleGoalActive(period, id);
    refreshGoals();
  };

  const acceptSuggestion = (suggestion) => {
    HabitTrackerService.createGoal(suggestion);
    refreshGoals();
  };

  const weekLabel = useMemo(() => {
    if (weekOffset === 0) return 'This Week';
    if (weekOffset === 1) return 'Last Week';
    return `${weekOffset} Weeks Ago`;
  }, [weekOffset]);

  const monthLabel = useMemo(() => {
    if (monthOffset === 0) return 'This Month';
    if (monthOffset === 1) return 'Last Month';
    return `${monthOffset} Months Ago`;
  }, [monthOffset]);

  const allActiveGoals = [...goalProgress.weekly, ...goalProgress.monthly];
  const completedGoals = allActiveGoals.filter((g) => g.completed);
  const incompleteGoals = allActiveGoals.filter((g) => !g.completed);

  const needsGameInput = formType === 'per_game_time' || formType === 'per_game_sessions';
  const needsGenreInput = formType === 'genre_time' || formType === 'genre_sessions';

  // Extract all genres from library for dropdown
  const allGenres = useMemo(() => {
    const set = new Set();
    library.forEach((g) => g.genres?.forEach((genre) => set.add(genre)));
    return [...set].sort();
  }, [library]);

  return (
    <div className="habits-page">
      <NavBar />
      <div className="habits-content">
        <h1 className="habits-title">Gaming Habits</h1>
        <p className="habits-subtitle">Track your play patterns, set goals, and build better gaming habits.</p>

        {/* Streak Card */}
        <div className="habits-streak-card">
          <Flame size={32} className="habits-streak-icon" />
          <div>
            <div className="habits-streak-number">{streaks.current}</div>
            <div className="habits-streak-label">Current Streak (days)</div>
          </div>
          <div className="habits-streak-divider" />
          <div>
            <div className="habits-streak-number">{streaks.longest}</div>
            <div className="habits-streak-label">Longest Streak</div>
          </div>
          {streaks.lastPlayed && (
            <div className="habits-streak-last">Last played: {streaks.lastPlayed}</div>
          )}
        </div>

        {/* Weekly Stats */}
        <div className="habits-section">
          <div className="habits-section-header">
            <h2><Calendar size={18} /> Weekly Stats</h2>
            <div className="habits-nav">
              <button onClick={() => setWeekOffset((o) => o + 1)} title="Previous week"><ChevronLeft size={16} /></button>
              <span>{weekLabel}</span>
              <button onClick={() => setWeekOffset((o) => Math.max(0, o - 1))} title="Next week" disabled={weekOffset === 0}><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="habits-stats-grid">
            <div className="habits-stat">
              <Clock size={20} />
              <div className="habits-stat-value">{weeklyStats.totalHours}h</div>
              <div className="habits-stat-label">Total Played</div>
            </div>
            <div className="habits-stat">
              <Calendar size={20} />
              <div className="habits-stat-value">{weeklyStats.daysPlayed}</div>
              <div className="habits-stat-label">Days Active</div>
            </div>
            <div className="habits-stat">
              <Gamepad2 size={20} />
              <div className="habits-stat-value">{weeklyStats.uniqueGames}</div>
              <div className="habits-stat-label">Unique Games</div>
            </div>
            <div className="habits-stat">
              <TrendingUp size={20} />
              <div className="habits-stat-value">{weeklyStats.sessions}</div>
              <div className="habits-stat-label">Sessions</div>
            </div>
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="habits-section">
          <div className="habits-section-header">
            <h2><Calendar size={18} /> Monthly Stats</h2>
            <div className="habits-nav">
              <button onClick={() => setMonthOffset((o) => o + 1)} title="Previous month"><ChevronLeft size={16} /></button>
              <span>{monthLabel}</span>
              <button onClick={() => setMonthOffset((o) => Math.max(0, o - 1))} title="Next month" disabled={monthOffset === 0}><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="habits-stats-grid">
            <div className="habits-stat">
              <Clock size={20} />
              <div className="habits-stat-value">{monthlyStats.totalHours}h</div>
              <div className="habits-stat-label">Total Played</div>
            </div>
            <div className="habits-stat">
              <Calendar size={20} />
              <div className="habits-stat-value">{monthlyStats.daysPlayed}</div>
              <div className="habits-stat-label">Days Active</div>
            </div>
            <div className="habits-stat">
              <Gamepad2 size={20} />
              <div className="habits-stat-value">{monthlyStats.uniqueGames}</div>
              <div className="habits-stat-label">Unique Games</div>
            </div>
            <div className="habits-stat">
              <TrendingUp size={20} />
              <div className="habits-stat-value">{monthlyStats.sessions}</div>
              <div className="habits-stat-label">Sessions</div>
            </div>
          </div>
        </div>

        {/* Smart Suggestions */}
        {suggestions.length > 0 && (
          <div className="habits-section">
            <div className="habits-section-header">
              <h2><Lightbulb size={18} /> Suggested Goals</h2>
            </div>
            <div className="habits-suggestions">
              {suggestions.map((s, i) => (
                <div key={i} className="habits-suggestion">
                  <div className="habits-suggestion-text">
                    <strong>{s.label}</strong>
                    <span className="habits-suggestion-reason">{s.reason}</span>
                  </div>
                  <button className="habits-suggestion-btn" onClick={() => acceptSuggestion(s)}>
                    <Plus size={14} /> Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goals */}
        <div className="habits-section">
          <div className="habits-section-header">
            <h2><Target size={18} /> Habit Goals</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="habits-edit-btn" onClick={() => { setShowCreate(true); setEditingGoalId(null); }}>
                <Plus size={14} /> New Goal
              </button>
              <button className="habits-edit-btn" onClick={() => setEditingGoals((e) => !e)}>
                {editingGoals ? 'Done' : 'Edit'}
              </button>
            </div>
          </div>

          {/* Create/Edit Form */}
          {showCreate && (
            <div className="habits-goal-form">
              <div className="habits-goal-form-row">
                <input
                  type="text"
                  ref={labelInputRef}
                  placeholder="Goal label (optional)"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  className="habits-form-input"
                />
                <input
                  type="number"
                  placeholder="Target"
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  min={1}
                  className="habits-form-input habits-form-number"
                />
              </div>
              <div className="habits-goal-form-row">
                <select value={formType} onChange={(e) => setFormType(e.target.value)} className="habits-form-select">
                  {GOAL_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select value={formPeriod} onChange={(e) => setFormPeriod(e.target.value)} className="habits-form-select">
                  <option value="week">Weekly</option>
                  <option value="month">Monthly</option>
                </select>
              </div>
              {needsGameInput && (
                <select value={formGameName} onChange={(e) => setFormGameName(e.target.value)} className="habits-form-select">
                  <option value="">Select a game...</option>
                  {library.map((g) => (
                    <option key={g.name} value={g.name}>{g.name}</option>
                  ))}
                </select>
              )}
              {needsGenreInput && (
                <select value={formGenre} onChange={(e) => setFormGenre(e.target.value)} className="habits-form-select">
                  <option value="">Select a genre...</option>
                  {allGenres.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              )}
              <div className="habits-goal-form-actions">
                <button className="habits-form-btn primary" onClick={editingGoalId ? handleUpdateGoal : handleCreateGoal}>
                  {editingGoalId ? 'Update Goal' : 'Create Goal'}
                </button>
                <button className="habits-form-btn secondary" onClick={resetForm}>Cancel</button>
              </div>
            </div>
          )}

          {/* Active Goals */}
          <div className="habits-goals">
            {incompleteGoals.map((goal) => (
              <div key={goal.id} className={`habits-goal ${goal.completed ? 'habits-goal-completed' : ''}`}>
                <div className="habits-goal-header">
                  <div className="habits-goal-info">
                    <span className="habits-goal-label">{goal.label}</span>
                    <span className="habits-goal-period">{goal.period}</span>
                  </div>
                  {editingGoals && (
                    <div className="habits-goal-actions">
                      <button onClick={() => startEdit(goal)} className="habits-goal-action-btn" title="Edit"><Edit3 size={14} /></button>
                      <button onClick={() => handleDeleteGoal(goal.id)} className="habits-goal-action-btn" title="Delete"><Trash2 size={14} /></button>
                      <label className="habits-toggle">
                        <input type="checkbox" checked={goal.active} onChange={() => toggleGoalActive(goal.period, goal.id)} />
                        <span>Active</span>
                      </label>
                    </div>
                  )}
                </div>
                <div className="habits-goal-body">
                  <div className="habits-goal-bar-wrap">
                    <div className="habits-goal-bar">
                      <div className="habits-goal-fill" style={{ width: `${goal.percent}%` }} />
                    </div>
                    <div className="habits-goal-meta">{goal.current} / {goal.target}</div>
                  </div>
                  <ProgressRing percent={goal.percent} size={44} stroke={4} />
                </div>
              </div>
            ))}

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <>
                <div className="habits-completed-header">
                  <CheckCircle2 size={16} /> Completed ({completedGoals.length})
                </div>
                {completedGoals.map((goal) => (
                  <div key={goal.id} className="habits-goal habits-goal-completed">
                    <div className="habits-goal-header">
                      <div className="habits-goal-info">
                        <span className="habits-goal-label">{goal.label}</span>
                        <span className="habits-goal-period">{goal.period}</span>
                      </div>
                      {editingGoals && (
                        <div className="habits-goal-actions">
                          <button onClick={() => handleDeleteGoal(goal.id)} className="habits-goal-action-btn" title="Delete"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </div>
                    <div className="habits-goal-body">
                      <div className="habits-goal-bar-wrap">
                        <div className="habits-goal-bar">
                          <div className="habits-goal-fill" style={{ width: '100%' }} />
                        </div>
                        <div className="habits-goal-meta">{goal.current} / {goal.target}</div>
                      </div>
                      <ProgressRing percent={100} size={44} stroke={4} color="#34a853" />
                    </div>
                  </div>
                ))}
              </>
            )}

            {!allActiveGoals.length && (
              <p className="habits-empty">No active goals. Create one above or accept a suggestion.</p>
            )}
          </div>
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="habits-section">
            <h2><Award size={18} /> Insights</h2>
            <div className="habits-insights">
              {insights.map((insight, i) => (
                <div key={i} className={`habits-insight habits-insight-${insight.type}`}>
                  {insight.type === 'streak' && <Flame size={16} />}
                  {insight.type === 'pattern' && <Calendar size={16} />}
                  {insight.type === 'preference' && <Gamepad2 size={16} />}
                  {insight.type === 'average' && <TrendingUp size={16} />}
                  <span>{insight.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mood Log */}
        {moodLog.length > 0 && (
          <div className="habits-section">
            <h2>Recent Sessions</h2>
            <div className="habits-mood-log">
              {moodLog.slice().reverse().map((entry, i) => (
                <div key={i} className="habits-mood-entry">
                  <div className="habits-mood-date">{entry.date}</div>
                  <div className="habits-mood-game">{entry.gameName}</div>
                  <div className="habits-mood-duration">{Math.round(entry.durationMinutes)}m</div>
                  {entry.mood && <span className="habits-mood-tag">{entry.mood}</span>}
                  {entry.intention && <span className="habits-mood-tag">{entry.intention}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Habits;
