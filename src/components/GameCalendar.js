import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Calendar, Trash2, Clock, Gamepad2, Trophy } from 'lucide-react';
import { PlaytimeAutoLogger } from '../services/PlaytimeAutoLogger';
import './GameCalendar.css';

const GameCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'release',
    description: '',
    time: ''
  });
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedDateStats, setSelectedDateStats] = useState(null);

  useEffect(() => {
    try {
      const savedEvents = localStorage.getItem('gameCalendarEvents');
      if (savedEvents) {
        const parsed = JSON.parse(savedEvents);
        if (Array.isArray(parsed)) {
          setEvents(parsed);
        } else {
          setEvents([]);
        }
      }
    } catch (error) {
      console.error('Error loading calendar events:', error);
      setEvents([]);
    }
  }, []);

  const saveEvents = (updatedEvents) => {
    try {
      const safeEvents = Array.isArray(updatedEvents) ? updatedEvents : [];
      setEvents(safeEvents);
      localStorage.setItem('gameCalendarEvents', JSON.stringify(safeEvents));
    } catch (error) {
      console.error('Error saving calendar events:', error);
    }
  };

  const getDaysInMonth = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return { daysInMonth: 30, startingDayOfWeek: 0 }; // Safe defaults
    }
    
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getEventsForDate = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return [];
    }
    
    try {
      const dateString = date.toISOString().split('T')[0];
      return events.filter(event => event && event.date === dateString);
    } catch (error) {
      console.error('Error getting events for date:', error);
      return [];
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDateClick = (day) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(clickedDate);
    
    // Get stats for this date
    const dateStr = clickedDate.toISOString().split('T')[0];
    const history = PlaytimeAutoLogger.getSessionHistory();
    const daySessions = history.filter(s => s.timestamp && s.timestamp.startsWith(dateStr));
    
    const totalPlaytime = daySessions.reduce((sum, s) => sum + (s.playtimeMinutes || 0), 0);
    const uniqueGames = [...new Set(daySessions.map(s => s.gameName))];
    
    setSelectedDateStats({
      date: clickedDate,
      playtimeMinutes: totalPlaytime,
      gamesPlayed: uniqueGames.length,
      sessions: daySessions.length,
      games: uniqueGames
    });
    setShowStatsModal(true);
  };

  const handleAddEvent = () => {
    if (!newEvent.title.trim()) return;

    const event = {
      id: Date.now().toString(),
      date: selectedDate.toISOString().split('T')[0],
      ...newEvent
    };

    saveEvents([...events, event]);
    setShowAddModal(false);
    setNewEvent({ title: '', type: 'release', description: '', time: '' });
  };

  const handleDeleteEvent = (eventId) => {
    saveEvents(events.filter(e => e.id !== eventId));
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
    const days = [];
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentDate.getMonth() && 
                          today.getFullYear() === currentDate.getFullYear();

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = isCurrentMonth && day === today.getDate();

      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday ? 'today' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
          onClick={() => handleDateClick(day)}
        >
          <div className="day-number">{day}</div>
          {dayEvents.length > 0 && (
            <div className="event-indicators">
              {dayEvents.slice(0, 3).map((event, idx) => (
                <div
                  key={idx}
                  className={`event-dot ${event.type}`}
                  title={event.title}
                ></div>
              ))}
              {dayEvents.length > 3 && <span className="more-events">+{dayEvents.length - 3}</span>}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const getUpcomingEvents = () => {
    const today = new Date().toISOString().split('T')[0];
    return events
      .filter(event => event.date >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  };

  const eventTypeIcons = {
    release: '🎮',
    dlc: '📦',
    update: '🔄',
    event: '🎉',
    tournament: '🏆',
    sale: '💰',
    other: '📅'
  };

  return (
    <div className="game-calendar">
      <div className="calendar-header">
        <h3>
          <Calendar size={24} />
          Game Release Calendar
        </h3>
        <div className="calendar-controls">
          <button onClick={handlePrevMonth} className="month-nav">
            <ChevronLeft size={20} />
          </button>
          <span className="current-month">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={handleNextMonth} className="month-nav">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        <div className="calendar-weekdays">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="weekday">{day}</div>
          ))}
        </div>
        <div className="calendar-days">
          {renderCalendar()}
        </div>
      </div>

      <div className="upcoming-events">
        <h4>Upcoming Events</h4>
        {getUpcomingEvents().length > 0 ? (
          <div className="events-list">
            {getUpcomingEvents().map(event => (
              <div key={event.id} className="event-item">
                <div className="event-icon">{eventTypeIcons[event.type]}</div>
                <div className="event-details">
                  <div className="event-title">{event.title}</div>
                  <div className="event-date">
                    {new Date(event.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                    {event.time && ` at ${event.time}`}
                  </div>
                  {event.description && <div className="event-description">{event.description}</div>}
                </div>
                <button 
                  className="delete-event"
                  onClick={() => handleDeleteEvent(event.id)}
                  title="Delete event"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-events">No upcoming events. Click a date to add one!</p>
        )}
      </div>

      {showStatsModal && selectedDateStats && (
        <div className="modal-overlay" onClick={() => setShowStatsModal(false)}>
          <div className="modal-content stats-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Trophy size={20} />
                Daily Stats - {selectedDateStats.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              <button onClick={() => setShowStatsModal(false)} className="close-modal">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="stats-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '20px' }}>
                <div className="stat-box" style={{ textAlign: 'center', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <Clock size={24} style={{ marginBottom: '8px', opacity: 0.8 }} />
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {Math.floor(selectedDateStats.playtimeMinutes / 60)}h {selectedDateStats.playtimeMinutes % 60}m
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Playtime</div>
                </div>
                <div className="stat-box" style={{ textAlign: 'center', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <Gamepad2 size={24} style={{ marginBottom: '8px', opacity: 0.8 }} />
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedDateStats.gamesPlayed}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Games Played</div>
                </div>
                <div className="stat-box" style={{ textAlign: 'center', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <Trophy size={24} style={{ marginBottom: '8px', opacity: 0.8 }} />
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedDateStats.sessions}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Sessions</div>
                </div>
              </div>
              
              {selectedDateStats.games.length > 0 ? (
                <div className="games-list">
                  <h4 style={{ marginBottom: '10px' }}>Games Played</h4>
                  {selectedDateStats.games.map((game, idx) => (
                    <div key={idx} className="game-item" style={{ 
                      padding: '8px 12px', 
                      background: 'rgba(255,255,255,0.03)', 
                      borderRadius: '6px',
                      marginBottom: '6px',
                      fontSize: '0.9rem'
                    }}>
                      {game}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign: 'center', opacity: 0.6, padding: '20px' }}>
                  No gaming activity recorded for this date.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => { setShowStatsModal(false); setShowAddModal(true); }} className="btn-add" style={{ marginRight: '10px' }}>
                <Plus size={16} />
                Add Event
              </button>
              <button onClick={() => setShowStatsModal(false)} className="btn-cancel">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <Plus size={20} />
                Add Event - {selectedDate?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="close-modal">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Event Title *</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="e.g., GTA VI Release"
                  maxLength={50}
                />
              </div>
              <div className="form-group">
                <label>Event Type</label>
                <select
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                >
                  <option value="release">Game Release</option>
                  <option value="dlc">DLC/Expansion</option>
                  <option value="update">Update/Patch</option>
                  <option value="event">In-Game Event</option>
                  <option value="tournament">Tournament</option>
                  <option value="sale">Sale/Discount</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Time (Optional)</label>
                <input
                  type="time"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Additional details..."
                  maxLength={200}
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowAddModal(false)} className="btn-cancel">
                Cancel
              </button>
              <button onClick={handleAddEvent} className="btn-add" disabled={!newEvent.title.trim()}>
                <Plus size={16} />
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCalendar;
