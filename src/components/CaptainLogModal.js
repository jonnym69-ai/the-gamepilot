import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, X, Star, Tag, Save, Edit3, Trash2 } from 'lucide-react';
import { CaptainLogService } from '../services/CaptainLogService';
import './CaptainLogModal.css';

const QUICK_TAGS = [
  'Great session',
  'Story moment',
  'Frustrating',
  'Comfort play',
  'Learned something',
  'Multiplayer fun',
  'Solo grind',
  'Worth replaying'
];

const MOOD_OPTIONS = [
  'Relaxed',
  'Competitive',
  'Creative',
  'Nostalgic',
  'Excited',
  'Focused'
];

export default function CaptainLogModal({
  isOpen,
  onClose,
  gameName,
  gameId,
  sessionTimestamp,
  sessionMood,
  sessionMinutes
}) {
  const [notes, setNotes] = useState('');
  const [mood, setMood] = useState(sessionMood || '');
  const [selectedTags, setSelectedTags] = useState([]);
  const [rating, setRating] = useState(0);
  const [existingEntries, setExistingEntries] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen && gameName) {
      const entries = CaptainLogService.getEntriesForGame(gameName);
      setExistingEntries(entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

      // Check if there's already an entry for this session
      const sessionEntries = sessionTimestamp
        ? CaptainLogService.getEntriesForSession(sessionTimestamp)
        : [];
      if (sessionEntries.length > 0) {
        const latest = sessionEntries[0];
        setNotes(latest.notes || '');
        setMood(latest.mood || sessionMood || '');
        setSelectedTags(latest.tags || []);
        setRating(latest.rating || 0);
        setEditingId(latest.id);
      } else {
        setNotes('');
        setMood(sessionMood || '');
        setSelectedTags([]);
        setRating(0);
        setEditingId(null);
      }
      setSaved(false);
    }
  }, [isOpen, gameName, sessionTimestamp, sessionMood]);

  const toggleTag = useCallback((tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleSave = useCallback(() => {
    const payload = {
      gameName,
      gameId,
      sessionTimestamp: sessionTimestamp || new Date().toISOString(),
      notes: notes.trim(),
      mood: mood || null,
      tags: selectedTags,
      rating: rating > 0 ? rating : null
    };

    if (editingId) {
      CaptainLogService.updateEntry(editingId, payload);
    } else {
      CaptainLogService.addEntry(payload);
    }

    setSaved(true);
    const entries = CaptainLogService.getEntriesForGame(gameName);
    setExistingEntries(entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    setEditingId(null);
    setTimeout(() => setSaved(false), 2000);
  }, [editingId, gameName, gameId, sessionTimestamp, notes, mood, selectedTags, rating]);

  const handleDelete = useCallback((id) => {
    CaptainLogService.deleteEntry(id);
    const entries = CaptainLogService.getEntriesForGame(gameName);
    setExistingEntries(entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  }, [gameName]);

  const handleEditExisting = useCallback((entry) => {
    setEditingId(entry.id);
    setNotes(entry.notes || '');
    setMood(entry.mood || '');
    setSelectedTags(entry.tags || []);
    setRating(entry.rating || 0);
  }, []);

  if (!isOpen) return null;

  const timeLabel = sessionMinutes
    ? `${sessionMinutes}m session`
    : 'Session log';

  return (
    <div className="captain-log-overlay" onClick={onClose}>
      <div className="captain-log-modal" onClick={(e) => e.stopPropagation()}>
        <div className="captain-log-header">
          <div className="captain-log-title">
            <BookOpen size={20} />
            <div>
              <h3>Captain's Log</h3>
              <span>{gameName} &middot; {timeLabel}</span>
            </div>
          </div>
          <button type="button" className="captain-log-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="captain-log-body">
          <div className="captain-log-section">
            <label>Session Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened this session? Boss defeated? Great multiplayer match? Story twist?"
              rows={4}
            />
          </div>

          <div className="captain-log-section">
            <label>How did it feel?</label>
            <div className="captain-log-moods">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`captain-log-mood ${mood === m ? 'active' : ''}`}
                  onClick={() => setMood(mood === m ? '' : m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="captain-log-section">
            <label>Quick Tags</label>
            <div className="captain-log-tags">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`captain-log-tag ${selectedTags.includes(tag) ? 'active' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  <Tag size={12} />
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="captain-log-section">
            <label>Session Rating</label>
            <div className="captain-log-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`captain-log-star ${star <= rating ? 'filled' : ''}`}
                  onClick={() => setRating(star === rating ? 0 : star)}
                >
                  <Star size={22} />
                </button>
              ))}
            </div>
          </div>

          <div className="captain-log-actions">
            <button
              type="button"
              className={`captain-log-save ${saved ? 'saved' : ''}`}
              onClick={handleSave}
            >
              <Save size={16} />
              {saved ? 'Saved!' : editingId ? 'Update Log' : 'Save Log'}
            </button>
          </div>

          {existingEntries.length > 0 && (
            <div className="captain-log-history">
              <h4>Previous logs for {gameName}</h4>
              <div className="captain-log-entries">
                {existingEntries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="captain-log-entry">
                    <div className="captain-log-entry-meta">
                      <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                      {entry.rating && (
                        <span className="captain-log-entry-rating">
                          {Array.from({ length: entry.rating }).map((_, i) => (
                            <Star key={i} size={10} />
                          ))}
                        </span>
                      )}
                    </div>
                    <p>{entry.notes || 'No notes'}</p>
                    <div className="captain-log-entry-tags">
                      {entry.mood && <span className="captain-log-entry-mood">{entry.mood}</span>}
                      {entry.tags.map((t) => (
                        <span key={t} className="captain-log-entry-tag">{t}</span>
                      ))}
                    </div>
                    <div className="captain-log-entry-actions">
                      <button type="button" onClick={() => handleEditExisting(entry)} title="Edit">
                        <Edit3 size={14} />
                      </button>
                      <button type="button" onClick={() => handleDelete(entry.id)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
