import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import '../styles/SearchFilterBar.css';

export function SearchFilterBar({
  searchQuery,
  setSearchQuery,
  filterMood,
  setFilterMood,
  filterGenre,
  setFilterGenre,
  filterPlatform,
  setFilterPlatform,
  sortBy,
  setSortBy,
  moods = [],
  genres = [],
  platforms = [],
  totalResults = 0
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterMood('');
    setFilterGenre('');
    setFilterPlatform('');
    setSortBy('name');
  };

  const hasActiveFilters = searchQuery || filterMood || filterGenre || filterPlatform || sortBy !== 'name';

  return (
    <div className="search-filter-bar">
      {/* Main Search Bar */}
      <div className="search-input-wrapper">
        <Search size={20} className="search-icon" />
        <input
          type="text"
          placeholder="Search games by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="clear-search-btn"
            title="Clear search"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Quick Filters */}
      <div className="quick-filters">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="filter-select sort-select"
          title="Sort games"
        >
          <option value="name">Sort: Name</option>
          <option value="most-played">Sort: Most Played</option>
          <option value="least-played">Sort: Least Played</option>
          <option value="recent">Sort: Recently Played</option>
          <option value="platform">Sort: Platform</option>
          <option value="genre">Sort: Genre</option>
          <option value="mood">Sort: Mood</option>
          <option value="favorites">Sort: Favorites</option>
        </select>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`advanced-filter-btn ${showAdvanced ? 'active' : ''}`}
          title="Toggle advanced filters"
        >
          <Filter size={18} />
          Filters
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="clear-filters-btn"
            title="Clear all filters"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Results Count */}
      <div className="results-count">
        {totalResults > 0 && (
          <span>{totalResults} game{totalResults !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="advanced-filters">
          <div className="filter-group">
            <label>Platform</label>
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="filter-select"
            >
              <option value="">All Platforms</option>
              {platforms.map(platform => (
                <option key={platform} value={platform}>{platform}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Genre</label>
            <select
              value={filterGenre}
              onChange={(e) => setFilterGenre(e.target.value)}
              className="filter-select"
            >
              <option value="">All Genres</option>
              {genres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Mood</label>
            <select
              value={filterMood}
              onChange={(e) => setFilterMood(e.target.value)}
              className="filter-select"
            >
              <option value="">All Moods</option>
              {moods.map(mood => (
                <option key={mood} value={mood}>{mood}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchFilterBar;
