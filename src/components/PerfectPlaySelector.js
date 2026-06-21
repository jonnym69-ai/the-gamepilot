import React, { useState, useMemo } from 'react';
import { MOODS, GENRES, getGenresForMood } from '../constants/GenresMoods';
import { RecommendationEngine } from '../services/RecommendationEngine';
import { RecommendationTuningService } from '../services/RecommendationTuningService';
import { RecommendationReasonChip } from './RecommendationReasonChip';
import '../styles/PerfectPlaySelector.css';

export function PerfectPlaySelector({ library = [], onGameSelected = () => {} }) {
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [availableMinutes, setAvailableMinutes] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [tuning, setTuning] = useState(() => RecommendationTuningService.getTuning());

  const updateTuning = (patch) => {
    const next = RecommendationTuningService.setTuning({ ...tuning, ...patch });
    setTuning(next);
  };

  // Toggle mood selection
  const toggleMood = (mood) => {
    setSelectedMoods(prev =>
      prev.includes(mood)
        ? prev.filter(m => m !== mood)
        : [...prev, mood]
    );
  };

  // Toggle genre selection
  const toggleGenre = (genre) => {
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  // Get recommendations when selections change
  const recommendationResult = useMemo(() => {
    if (selectedMoods.length === 0 && selectedGenres.length === 0) {
      return null;
    }

    RecommendationTuningService.applyTuningToWeights();
    return RecommendationEngine.getPerfectPlaySelectionResult(
      library,
      selectedMoods,
      selectedGenres,
      availableMinutes,
      10
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library, selectedMoods, selectedGenres, availableMinutes, tuning]);

  const matchingGames = recommendationResult?.games || [];
  const matchingEntries = recommendationResult?.entries || [];

  // Get best recommendation
  const bestRecommendation = useMemo(() => {
    return recommendationResult?.primaryGame || null;
  }, [recommendationResult]);

  // Handle game selection
  const handleSelectGame = (game) => {
    setSelectedGame(game);
    onGameSelected(game);
  };

  // Get genres for selected moods
  const genresForSelectedMoods = useMemo(() => {
    if (selectedMoods.length === 0) {
      return new Set();
    }

    const genres = new Set();
    selectedMoods.forEach(mood => {
      getGenresForMood(mood).forEach(genre => genres.add(genre));
    });
    return genres;
  }, [selectedMoods]);

  return (
    <div className="perfect-play-selector">
      <div className="selector-header">
        <h2>🎮 Perfect Play</h2>
        <p>Select moods and genres to find your perfect game</p>
      </div>

      <div className="selector-content">
        {/* Moods Section */}
        <div className="selector-section">
          <h3>😌 Select Moods ({selectedMoods.length})</h3>
          <div className="mood-grid">
            {MOODS.map(mood => (
              <button
                key={mood}
                className={`mood-button ${selectedMoods.includes(mood) ? 'selected' : ''}`}
                onClick={() => toggleMood(mood)}
              >
                {mood}
              </button>
            ))}
          </div>
        </div>

        {/* Genres Section */}
        <div className="selector-section">
          <h3>🎨 Select Genres ({selectedGenres.length})</h3>
          <div className="genre-grid">
            {GENRES.map(genre => (
              <button
                key={genre}
                className={`genre-button ${
                  selectedGenres.includes(genre) ? 'selected' : ''
                } ${
                  selectedMoods.length > 0 && !genresForSelectedMoods.has(genre) ? 'disabled' : ''
                }`}
                onClick={() => toggleGenre(genre)}
                disabled={selectedMoods.length > 0 && !genresForSelectedMoods.has(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>

        {/* Time Selection */}
        <div className="selector-section">
          <h3>⏱️ Available Time</h3>
          <div className="time-selection">
            <div className="time-options">
              <button
                className={`time-button ${availableMinutes === null ? 'selected' : ''}`}
                onClick={() => setAvailableMinutes(null)}
              >
                Any Time
              </button>
              <button
                className={`time-button ${availableMinutes === 30 ? 'selected' : ''}`}
                onClick={() => setAvailableMinutes(30)}
              >
                30 min
              </button>
              <button
                className={`time-button ${availableMinutes === 60 ? 'selected' : ''}`}
                onClick={() => setAvailableMinutes(60)}
              >
                1 hour
              </button>
              <button
                className={`time-button ${availableMinutes === 120 ? 'selected' : ''}`}
                onClick={() => setAvailableMinutes(120)}
              >
                2 hours
              </button>
            </div>
          </div>
        </div>

        {/* Tuning Controls */}
        <div className="selector-section tuning-section">
          <h3>🎚️ Recommendation Tuning</h3>
          <div className="tuning-controls">
            <div className="tuning-control">
              <label htmlFor="novelty-slider">Novelty</label>
              <input
                id="novelty-slider"
                type="range"
                min="0"
                max="100"
                value={Math.round(tuning.novelty * 100)}
                onChange={(e) => updateTuning({ novelty: Number(e.target.value) / 100 })}
              />
              <span>{Math.round(tuning.novelty * 100)}%</span>
            </div>
            <div className="tuning-control">
              <label htmlFor="diversity-slider">Diversity</label>
              <input
                id="diversity-slider"
                type="range"
                min="0"
                max="100"
                value={Math.round(tuning.diversity * 100)}
                onChange={(e) => updateTuning({ diversity: Number(e.target.value) / 100 })}
              />
              <span>{Math.round(tuning.diversity * 100)}%</span>
            </div>
            <div className="tuning-control">
              <label htmlFor="fatigue-select">Fatigue window</label>
              <select
                id="fatigue-select"
                value={tuning.fatigueWindowHours}
                onChange={(e) => updateTuning({ fatigueWindowHours: Number(e.target.value) })}
              >
                <option value={1}>1 hour</option>
                <option value={6}>6 hours</option>
                <option value={24}>1 day</option>
                <option value={72}>3 days</option>
                <option value={168}>1 week</option>
              </select>
            </div>
            <button
              className={`tuning-toggle ${tuning.explorationEnabled ? 'selected' : ''}`}
              onClick={() => updateTuning({ explorationEnabled: !tuning.explorationEnabled })}
            >
              {tuning.explorationEnabled ? 'Exploration slot on' : 'Exploration slot off'}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {(selectedMoods.length > 0 || selectedGenres.length > 0) && (
          <div className="selector-section results-section">
            <h3>
              📊 Results: {(recommendationResult?.totalMatches || 0)} game{(recommendationResult?.totalMatches || 0) !== 1 ? 's' : ''} found
            </h3>

            {matchingGames.length > 0 ? (
              <>
                {/* Best Recommendation */}
                {bestRecommendation && (
                  <div className="best-recommendation">
                    <h4>✨ Best Match</h4>
                    <div className="recommendation-card">
                      <div className="game-title">{bestRecommendation.name}</div>
                      <div className="game-meta">
                        <span className="platform">{bestRecommendation.platform}</span>
                        <span className="plays">
                          {bestRecommendation.launch_count || 0} plays
                        </span>
                      </div>
                      <RecommendationReasonChip
                        game={bestRecommendation}
                        mood={selectedMoods[0] || null}
                        genre={selectedGenres[0] || null}
                        timeAvailable={availableMinutes}
                        recommendationType="perfect-play"
                      />
                      <button
                        className="select-button"
                        onClick={() => handleSelectGame(bestRecommendation)}
                      >
                        Select This Game
                      </button>
                    </div>
                  </div>
                )}

                {/* All Matching Games */}
                <div className="all-recommendations">
                  <h4>All Matching Games</h4>
                  <div className="games-list">
                    {matchingEntries.map((entry, idx) => {
                      const game = entry.game;

                      return (
                      <div
                        key={game.appid || game.name || idx}
                        className={`game-item ${selectedGame?.appid === game.appid ? 'selected' : ''}`}
                        onClick={() => handleSelectGame(game)}
                      >
                        <div className="game-rank">{idx + 1}</div>
                        <div className="game-info">
                          <div className="game-name">{game.name}</div>
                          <div className="game-platform">{game.platform}</div>
                          <RecommendationReasonChip
                            game={game}
                            mood={selectedMoods[0] || null}
                            genre={selectedGenres[0] || null}
                            timeAvailable={availableMinutes}
                            recommendationType="perfect-play"
                          />
                        </div>
                        <div className="game-stats">
                          <span>{game.launch_count || 0} plays</span>
                        </div>
                      </div>
                    )})}
                  </div>
                  {(recommendationResult?.totalMatches || 0) > matchingEntries.length && (
                    <div className="more-games">
                      +{(recommendationResult?.totalMatches || 0) - matchingEntries.length} more games
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="no-results">
                <p>No games found matching your criteria.</p>
                <p>Try adjusting your mood, genre, or time selection.</p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {selectedMoods.length === 0 && selectedGenres.length === 0 && (
          <div className="empty-state">
            <p>Select moods and/or genres to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
