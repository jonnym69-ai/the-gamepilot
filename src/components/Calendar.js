import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Gamepad2, Target, PartyPopper, StickyNote, X, Edit2, Trash2 } from 'lucide-react';
import { getDateKey } from '../services/DateKeyService';
import StorageService from '../services/StorageService';
import './Calendar.css';

const Calendar = ({ theme }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [notes, setNotes] = useState('');
  const [editingEvent, setEditingEvent] = useState(null);

  // Load events and notes from localStorage on mount
  useEffect(() => {
    const savedEvents = StorageService.get('gamingCalendarEvents', []);
    const savedNotes = StorageService.getString('gamingCalendarNotes', '');
    
    if (savedEvents) {
      setEvents(savedEvents);
    }
    
    if (savedNotes) {
      setNotes(savedNotes);
    }
  }, []);

  // Save events to localStorage whenever they change
  useEffect(() => {
    if (events.length > 0) {
      StorageService.set('gamingCalendarEvents', events);
    }
  }, [events]);

  // Save notes to localStorage whenever they change
  useEffect(() => {
    StorageService.setString('gamingCalendarNotes', notes);
  }, [notes]);

  // Event types with colors and icons
  const eventTypes = {
    'release': {
      label: 'Game Release',
      color: '#4CAF50',
      icon: <Gamepad2 size={16} />,
      bgColor: 'rgba(76, 175, 80, 0.1)'
    },
    'goal': {
      label: 'Gaming Goal',
      color: '#2196F3',
      icon: <Target size={16} />,
      bgColor: 'rgba(33, 150, 243, 0.1)'
    },
    'event': {
      label: 'Gaming Event',
      color: '#FF9800',
      icon: <PartyPopper size={16} />,
      bgColor: 'rgba(255, 152, 0, 0.1)'
    },
    'note': {
      label: 'Note',
      color: '#9C27B0',
      icon: <StickyNote size={16} />,
      bgColor: 'rgba(156, 39, 176, 0.1)'
    }
  };

  // Get days in month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  // Navigate months
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // Get events for a specific date
  const getEventsForDate = (date) => {
    if (!date) return [];
    const dateStr = getDateKey(date);
    return events.filter(event => event.date === dateStr);
  };

  // Add or update event
  const saveEvent = (eventData) => {
    if (editingEvent) {
      // Update existing event
      setEvents(events.map(event => 
        event.id === editingEvent.id 
          ? { ...eventData, id: editingEvent.id }
          : event
      ));
    } else {
      // Add new event
      const newEvent = {
        ...eventData,
        id: Date.now().toString()
      };
      setEvents([...events, newEvent]);
    }
    
    setShowEventModal(false);
    setEditingEvent(null);
  };

  // Delete event
  const deleteEvent = (eventId) => {
    setEvents(events.filter(event => event.id !== eventId));
  };

  // Format month name
  const formatMonth = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const days = getDaysInMonth(currentDate);
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className={`calendar-container ${theme}`}>
      <div className="calendar-header">
        <div className="calendar-nav">
          <button onClick={previousMonth} className="nav-button">
            <ChevronLeft size={20} />
          </button>
          <h3 className="calendar-title">
            <CalendarIcon size={20} />
            {formatMonth(currentDate)}
          </h3>
          <button onClick={nextMonth} className="nav-button">
            <ChevronRight size={20} />
          </button>
        </div>
        <button 
          onClick={() => setShowEventModal(true)}
          className="add-event-button"
        >
          <Plus size={20} />
          Add Event
        </button>
      </div>

      <div className="calendar-grid">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="day-header">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((day, index) => {
          const dayEvents = day ? getEventsForDate(day) : [];
          const isToday = day && day.toDateString() === new Date().toDateString();
          const isSelected = day && selectedDate && day.toDateString() === selectedDate.toDateString();

          return (
            <div
              key={index}
              className={`calendar-day ${!day ? 'empty' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => day && setSelectedDate(day)}
            >
              {day && (
                <>
                  <div className="day-number">{day.getDate()}</div>
                  {dayEvents.length > 0 && (
                    <div className="event-dots">
                      {dayEvents.slice(0, 3).map((event, i) => (
                        <div
                          key={i}
                          className="event-dot"
                          style={{ backgroundColor: eventTypes[event.type]?.color }}
                          title={event.title}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="event-dot more" title={`${dayEvents.length - 3} more events`}>
                          +{dayEvents.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Date Events */}
      {selectedDate && (
        <div className="selected-date-events">
          <div className="selected-date-header">
            <h4>
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h4>
            <button 
              onClick={() => setSelectedDate(null)}
              className="close-button"
            >
              <X size={16} />
            </button>
          </div>
          
          {selectedDateEvents.length > 0 ? (
            <div className="events-list">
              {selectedDateEvents.map(event => (
                <div key={event.id} className="event-item" style={{ backgroundColor: eventTypes[event.type]?.bgColor }}>
                  <div className="event-header">
                    <div className="event-type" style={{ color: eventTypes[event.type]?.color }}>
                      {eventTypes[event.type]?.icon}
                      {eventTypes[event.type]?.label}
                    </div>
                    <div className="event-actions">
                      <button 
                        onClick={() => setEditingEvent(event)}
                        className="event-action-button"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => deleteEvent(event.id)}
                        className="event-action-button delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <h5 className="event-title">{event.title}</h5>
                  {event.description && (
                    <p className="event-description">{event.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="no-events">No events scheduled for this date</p>
          )}
        </div>
      )}

      {/* Quick Notes Section */}
      <div className="notes-section">
        <h4>
          <StickyNote size={20} />
          Quick Notes
        </h4>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add your gaming notes, ideas, or reminders here..."
          className="notes-textarea"
        />
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          theme={theme}
          onClose={() => {
            setShowEventModal(false);
            setEditingEvent(null);
          }}
          onSave={saveEvent}
          eventTypes={eventTypes}
          editingEvent={editingEvent}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
};

// Event Modal Component
const EventModal = ({ theme, onClose, onSave, eventTypes, editingEvent, selectedDate }) => {
  const [formData, setFormData] = useState({
    title: editingEvent?.title || '',
    type: editingEvent?.type || 'release',
    date: editingEvent?.date || (selectedDate ? getDateKey(selectedDate) : ''),
    description: editingEvent?.description || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.date) return;
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className={`event-modal ${theme}`}>
        <div className="modal-header">
          <h3>{editingEvent ? 'Edit Event' : 'Add New Event'}</h3>
          <button onClick={onClose} className="close-button">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-group">
            <label>Event Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Elden Ring Release"
              required
            />
          </div>

          <div className="form-group">
            <label>Event Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="event-type-select"
            >
              {Object.entries(eventTypes).map(([key, type]) => (
                <option key={key} value={key}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Date *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add any additional details..."
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="save-button">
              {editingEvent ? 'Update Event' : 'Add Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Calendar;
