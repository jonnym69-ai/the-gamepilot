import React, { useState, useMemo } from 'react';
import { RecommendationEngine } from '../services/RecommendationEngine';
import { RecommendationTuningService } from '../services/RecommendationTuningService';
import { getFamiliarityBias, setFamiliarityBias } from '../services/RecommendationWeights';
import { resolveGameArtworkBundle } from '../services/GameArtworkService';
import { RecommendationReasonChip } from './RecommendationReasonChip';
import LazyImage from './LazyImage';
import '../styles/PerfectPlaySelector.css';

export function PerfectPlaySelector({ library = [], onGameSelected = () => {} }) {
  const [selectedGame, setSelectedGame] = useState(null);
  const [tuning, setTuning] = useState(() => RecommendationTuningService.getTuning());
  const [familiarityBias, setFamiliarityBiasState] = useState(() => getFamiliarityBias());

  const updateTuning = (patch) => {
    const next = RecommendationTuningService.setTuning({ ...tuning, ...patch });
    setTuning(next);
  };

  // Picks are always on — ranked purely by play history and tuning.
  const recommendationResult = useMemo(() => {
    RecommendationTuningService.applyTuningToWeights();
    return RecommendationEngine.getPerfectPlayResult(library, null, null, null, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library, tuning, familiarityBias]);

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

  return (
    <div className="perfect-play-selector">
      <div className="selector-header">
        <h2>🎮 For You</h2>
        <p>Top picks from your library, ranked by how you actually play.</p>
      </div>

      <div className="selector-content">
        {/* Tuning Controls */}
        <details className="selector-section tuning-section selector-advanced">
          <summary>Fine-tune recommendations</summary>
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
          <div className="familiarity-toggle-group">
            <label className="familiarity-toggle-label">Taste</label>
            <div className="familiarity-toggle-buttons">
              <button
                className={`familiarity-btn ${familiarityBias === 'familiar' ? 'selected' : ''}`}
                onClick={() => {
                  setFamiliarityBias('familiar');
                  setFamiliarityBiasState('familiar');
                }}
              >
                Familiar
              </button>
              <button
                className={`familiarity-btn ${familiarityBias === null ? 'selected' : ''}`}
                onClick={() => {
                  setFamiliarityBias(null);
                  setFamiliarityBiasState(null);
                }}
              >
                Balanced
              </button>
              <button
                className={`familiarity-btn ${familiarityBias === 'fresh' ? 'selected' : ''}`}
                onClick={() => {
                  setFamiliarityBias('fresh');
                  setFamiliarityBiasState('fresh');
                }}
              >
                Fresh
              </button>
            </div>
          </div>
        </details>

        {/* Results Section */}
        <div className="selector-section results-section">
          <h3>{matchingGames.length} picks for right now</h3>

          {matchingGames.length > 0 ? (
            <>
              {/* Best Recommendation */}
              {bestRecommendation && (
                <div className="best-recommendation">
                  <h4>✨ Best Match</h4>
                  <div className="recommendation-card">
                    {(() => {
                      const bundle = resolveGameArtworkBundle(bestRecommendation, {
                        surface: 'portrait',
                        fallbackSurface: 'library_card',
                      });
                      return (
                        <div className="recommendation-art">
                          <LazyImage
                            src={bundle.artwork}
                            fallbackSrc={bundle.fallbackSrc}
                            alt={bestRecommendation.name}
                            placeholder={bundle.placeholder}
                          />
                        </div>
                      );
                    })()}
                    <div className="recommendation-card-body">
                      <div className="game-title">{bestRecommendation.name}</div>
                      <div className="game-meta">
                        <span className="platform">{bestRecommendation.platform}</span>
                        <span className="plays">{bestRecommendation.launch_count || 0} plays</span>
                      </div>
                      <RecommendationReasonChip
                        game={bestRecommendation}
                        mood={null}
                        genre={null}
                        timeAvailable={null}
                        recommendationType="perfect-play"
                      />
                      <button className="select-button" onClick={() => handleSelectGame(bestRecommendation)}>
                        Play Now
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* All Matching Games */}
              <div className="all-recommendations">
                {matchingEntries.length > 1 && <h4>Other picks</h4>}
                <div className="games-list">
                  {matchingEntries
                    .filter((entry) => entry.game !== bestRecommendation)
                    .map((entry, idx) => {
                      const game = entry.game;

                      return (
                        <button
                          type="button"
                          key={game.appid || game.name || idx}
                          className={`game-item ${selectedGame === game ? 'selected' : ''}`}
                          aria-label={`Play ${game.name}`}
                          onClick={() => handleSelectGame(game)}
                        >
                          <div className="game-rank">{idx + 1}</div>
                          {(() => {
                            const bundle = resolveGameArtworkBundle(game, {
                              surface: 'portrait',
                              fallbackSurface: 'library_card',
                            });
                            return (
                              <div className="game-item-art" aria-hidden="true">
                                <LazyImage
                                  src={bundle.artwork}
                                  fallbackSrc={bundle.fallbackSrc}
                                  alt=""
                                  placeholder={bundle.placeholder}
                                />
                              </div>
                            );
                          })()}
                          <div className="game-info">
                            <div className="game-name">{game.name}</div>
                            <div className="game-platform">{game.platform}</div>
                            <RecommendationReasonChip
                              game={game}
                              mood={null}
                              genre={null}
                              timeAvailable={null}
                              recommendationType="perfect-play"
                            />
                          </div>
                          <div className="game-stats">
                            <span>{game.launch_count || 0} plays</span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </>
          ) : (
            <div className="no-results">
              <p>No picks to show right now.</p>
              <p>Scan your library or adjust the tuning controls above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
