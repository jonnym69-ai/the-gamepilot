import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lightbulb, MessageSquarePlus, Check, Trash2, Copy, Twitter, MessageCircle } from 'lucide-react';
import NavBar from './NavBar';
import StorageService from './services/StorageService';
import './Feedback.css';

const FEEDBACK_STORAGE_KEY = 'feedbackSuggestions';

const CATEGORIES = [
  { id: 'feature', label: 'Feature request' },
  { id: 'bug', label: 'Bug report' },
  { id: 'ui', label: 'UI / UX polish' },
  { id: 'launcher', label: 'New launcher / platform' },
  { id: 'other', label: 'Other idea' }
];

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

function Feedback() {
  const navigate = useNavigate();
  const [category, setCategory] = useState('feature');
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState(() => StorageService.get(FEEDBACK_STORAGE_KEY, []));
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const canSave = text.trim().length > 0;

  const saveSuggestion = useCallback(() => {
    if (!canSave) return;
    const entry = {
      id: makeId(),
      category,
      text: text.trim(),
      createdAt: Date.now()
    };
    const next = [entry, ...suggestions];
    StorageService.set(FEEDBACK_STORAGE_KEY, next);
    setSuggestions(next);
    setText('');
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }, [canSave, category, suggestions, text]);

  const deleteSuggestion = useCallback((id) => {
    const next = suggestions.filter((entry) => entry.id !== id);
    StorageService.set(FEEDBACK_STORAGE_KEY, next);
    setSuggestions(next);
  }, [suggestions]);

  const clearAll = useCallback(() => {
    StorageService.set(FEEDBACK_STORAGE_KEY, []);
    setSuggestions([]);
  }, []);

  const shareText = useMemo(() => {
    const lines = [
      'What I would like to see in GamePilot:',
      '',
      ...suggestions.map((entry) => {
        const label = CATEGORIES.find((c) => c.id === entry.category)?.label || entry.category;
        return `- [${label}] ${entry.text}`;
      }),
      '',
      ...(text.trim() ? [`New idea: [${CATEGORIES.find((c) => c.id === category)?.label}] ${text.trim()}`] : [])
    ].filter((line) => line !== '');
    return lines.join('\n');
  }, [category, suggestions, text]);

  const copyForDiscord = useCallback(() => {
    navigator.clipboard.writeText(shareText).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, [shareText]);

  const postOnX = useCallback(() => {
    const body = text.trim() || shareText;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');
  }, [shareText, text]);

  return (
    <div className="feedback-page">
      <NavBar />
      <div className="feedback-content">
        <div className="feedback-top-nav">
          <button className="feedback-back" onClick={() => navigate('/')} title="Back to Home">
            <ArrowLeft size={18} /> Back
          </button>
          <span className="feedback-title-bar">
            <MessageSquarePlus size={18} /> Feedback
          </span>
        </div>

        <header className="feedback-hero">
          <span className="feedback-kicker">Have your say</span>
          <h1>What would you like to see in GamePilot?</h1>
          <p>
            Suggest features, report bugs, or share wild ideas. Everything is stored locally
            unless you choose to copy or tweet it. No account needed.
          </p>
        </header>

        <section className="feedback-form-card">
          <div className="feedback-categories">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`feedback-category ${category === c.id ? 'selected' : ''}`}
                onClick={() => setCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <textarea
            className="feedback-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe your idea, bug, or polish request..."
            rows={4}
          />

          <div className="feedback-form-actions">
            <button
              type="button"
              className="feedback-save"
              onClick={saveSuggestion}
              disabled={!canSave}
            >
              {saved ? <Check size={16} /> : <Lightbulb size={16} />}
              {saved ? 'Saved locally' : 'Save idea'}
            </button>
            <span className="feedback-privacy-note">
              Stored on this device only
            </span>
          </div>
        </section>

        {suggestions.length > 0 && (
          <section className="feedback-list-card">
            <div className="feedback-list-header">
              <h2>Your saved ideas</h2>
              <button type="button" className="feedback-clear" onClick={clearAll}>
                <Trash2 size={14} /> Clear all
              </button>
            </div>
            <ul className="feedback-list">
              {suggestions.map((entry) => {
                const label = CATEGORIES.find((c) => c.id === entry.category)?.label;
                return (
                  <li key={entry.id} className="feedback-item">
                    <div className="feedback-item-meta">
                      <span className="feedback-item-category">{label}</span>
                      <span className="feedback-item-date">{formatDate(entry.createdAt)}</span>
                    </div>
                    <p className="feedback-item-text">{entry.text}</p>
                    <button
                      type="button"
                      className="feedback-item-delete"
                      onClick={() => deleteSuggestion(entry.id)}
                      title="Remove this idea"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="feedback-share-card">
          <div className="feedback-share-header">
            <MessageCircle size={18} />
            <h2>Share with the developer</h2>
          </div>
          <p className="feedback-share-intro">
            Copy everything below and paste it into Discord, or tweet your latest idea directly.
          </p>
          <div className="feedback-share-actions">
            <button type="button" className="feedback-copy" onClick={copyForDiscord}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy for Discord'}
            </button>
            <button type="button" className="feedback-x" onClick={postOnX}>
              <Twitter size={14} /> Post on X
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Feedback;
