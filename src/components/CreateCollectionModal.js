import React, { useState, useCallback } from 'react';
import { X, Folder, Save, Trash2 } from 'lucide-react';
import { UserRuleCollectionService } from '../services/UserRuleCollectionService';
import './CreateCollectionModal.css';

const PRESET_COLORS = [
  '#ff6b35', '#f472b6', '#a78bfa', '#34d399', '#3dd9ff',
  '#facc15', '#f87171', '#22d3ee', '#fb923c', '#818cf8'
];

const GENRE_OPTIONS = [
  'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation',
  'Sports', 'Racing', 'Puzzle', 'Platformer', 'Shooter',
  'Fighting', 'Horror', 'Survival', 'Roguelike', 'Indie',
  'MMO', 'Visual Novel', 'Management'
];

const MOOD_OPTIONS = ['Relaxed', 'Competitive', 'Creative', 'Nostalgic', 'Excited', 'Focused'];
const PLATFORM_OPTIONS = ['Steam', 'Epic', 'GOG', 'EA', 'Uplay', 'Battle.net', 'Xbox', 'PlayStation', 'Rockstar', 'Riot', 'Manual'];
const COMPLETION_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'completed', label: 'Completed' },
  { value: 'playing', label: 'Playing / In Progress' },
  { value: 'backlog', label: 'Backlog / Unplayed' },
  { value: 'uncompleted', label: 'Not Completed' }
];

export default function CreateCollectionModal({ isOpen, onClose, library = [], onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [completionStatus, setCompletionStatus] = useState('');
  const [minPlaytime, setMinPlaytime] = useState('');
  const [maxPlaytime, setMaxPlaytime] = useState('');
  const [minSessions, setMinSessions] = useState('');
  const [maxSessions, setMaxSessions] = useState('');
  const [neverPlayed, setNeverPlayed] = useState(false);
  const [preview, setPreview] = useState(null);

  const toggleInList = useCallback((list, setList, item) => {
    setList((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  }, []);

  const buildRules = useCallback(() => {
    const rules = {};
    if (selectedGenres.length > 0) rules.genres = selectedGenres;
    if (selectedMoods.length > 0) rules.moods = selectedMoods;
    if (selectedPlatforms.length > 0) rules.platforms = selectedPlatforms;
    if (completionStatus) rules.completionStatus = completionStatus;
    if (minPlaytime !== '') rules.minPlaytime = Number(minPlaytime);
    if (maxPlaytime !== '') rules.maxPlaytime = Number(maxPlaytime);
    if (minSessions !== '') rules.minSessions = Number(minSessions);
    if (maxSessions !== '') rules.maxSessions = Number(maxSessions);
    if (neverPlayed) rules.neverPlayed = true;
    return rules;
  }, [selectedGenres, selectedMoods, selectedPlatforms, completionStatus, minPlaytime, maxPlaytime, minSessions, maxSessions, neverPlayed]);

  const handlePreview = useCallback(() => {
    const rules = buildRules();
    const temp = UserRuleCollectionService.evaluateCollection(
      { id: 'preview', name, rules, color, isUserCreated: true },
      library
    );
    setPreview(temp);
  }, [buildRules, library, name, color]);

  const handleSave = useCallback(() => {
    const rules = buildRules();
    const collection = UserRuleCollectionService.createCollection({
      name: name || 'My Collection',
      description,
      rules,
      color,
      icon: 'folder'
    });
    onCreated?.(collection);
    onClose();
  }, [buildRules, name, description, color, onCreated, onClose]);

  const handleReset = useCallback(() => {
    setName('');
    setDescription('');
    setColor(PRESET_COLORS[0]);
    setSelectedGenres([]);
    setSelectedMoods([]);
    setSelectedPlatforms([]);
    setCompletionStatus('');
    setMinPlaytime('');
    setMaxPlaytime('');
    setMinSessions('');
    setMaxSessions('');
    setNeverPlayed(false);
    setPreview(null);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="ccm-overlay" onClick={onClose}>
      <div className="ccm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ccm-header">
          <div className="ccm-title">
            <Folder size={20} />
            <h3>Create Smart Collection</h3>
          </div>
          <button type="button" className="ccm-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="ccm-body">
          <div className="ccm-section">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekend RPGs"
            />
          </div>

          <div className="ccm-section">
            <label>Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What makes this collection special?"
            />
          </div>

          <div className="ccm-section">
            <label>Color</label>
            <div className="ccm-colors">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`ccm-color ${color === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="ccm-section">
            <label>Genres</label>
            <div className="ccm-chips">
              {GENRE_OPTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`ccm-chip ${selectedGenres.includes(g) ? 'active' : ''}`}
                  onClick={() => toggleInList(selectedGenres, setSelectedGenres, g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="ccm-section">
            <label>Moods</label>
            <div className="ccm-chips">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`ccm-chip ${selectedMoods.includes(m) ? 'active' : ''}`}
                  onClick={() => toggleInList(selectedMoods, setSelectedMoods, m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="ccm-section">
            <label>Platforms</label>
            <div className="ccm-chips">
              {PLATFORM_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`ccm-chip ${selectedPlatforms.includes(p) ? 'active' : ''}`}
                  onClick={() => toggleInList(selectedPlatforms, setSelectedPlatforms, p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="ccm-section">
            <label>Completion Status</label>
            <select
              value={completionStatus}
              onChange={(e) => setCompletionStatus(e.target.value)}
            >
              {COMPLETION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="ccm-section ccm-range-row">
            <div>
              <label>Min Playtime (min)</label>
              <input
                type="number"
                value={minPlaytime}
                onChange={(e) => setMinPlaytime(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label>Max Playtime (min)</label>
              <input
                type="number"
                value={maxPlaytime}
                onChange={(e) => setMaxPlaytime(e.target.value)}
                placeholder="∞"
              />
            </div>
          </div>

          <div className="ccm-section ccm-range-row">
            <div>
              <label>Min Sessions</label>
              <input
                type="number"
                value={minSessions}
                onChange={(e) => setMinSessions(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label>Max Sessions</label>
              <input
                type="number"
                value={maxSessions}
                onChange={(e) => setMaxSessions(e.target.value)}
                placeholder="∞"
              />
            </div>
          </div>

          <div className="ccm-section ccm-toggle">
            <label>
              <input
                type="checkbox"
                checked={neverPlayed}
                onChange={(e) => setNeverPlayed(e.target.checked)}
              />
              Only unplayed games (never launched)
            </label>
          </div>

          {preview && (
            <div className="ccm-preview">
              <strong>Preview: {preview.games.length} games match</strong>
              <div className="ccm-preview-games">
                {preview.games.slice(0, 8).map((g) => (
                  <span key={g.appid || g.name} className="ccm-preview-game">{g.name}</span>
                ))}
                {preview.games.length > 8 && (
                  <span className="ccm-preview-more">+{preview.games.length - 8} more</span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="ccm-footer">
          <button type="button" className="ccm-btn ccm-btn-secondary" onClick={handleReset}>
            <Trash2 size={14} />
            Reset
          </button>
          <button type="button" className="ccm-btn ccm-btn-secondary" onClick={handlePreview}>
            Preview
          </button>
          <button type="button" className="ccm-btn ccm-btn-primary" onClick={handleSave}>
            <Save size={14} />
            Save Collection
          </button>
        </div>
      </div>
    </div>
  );
}
