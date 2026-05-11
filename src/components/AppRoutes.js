import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import Home from '../Home';
import Library from '../Library';
import Stats from '../Stats';
import Achievements from '../Achievements';
import GamingLinks from '../GamingLinks';
import Donate from '../Donate';
import Settings from '../Settings';
import Profile from '../Profile';
import YearInReview from '../YearInReview';
import ChallengeBoard from '../ChallengeBoard';
import PerformanceCockpit from '../PerformanceCockpit';
import ErrorBoundary from './ErrorBoundary';

const renderWithBoundary = (element) => (
  <ErrorBoundary>
    {element}
  </ErrorBoundary>
);

const AppRoutes = ({
  activeSessions,
  endSession,
  filterGenre,
  filterMood,
  filterPlatform,
  filterTime,
  getMostPlayedGames,
  getPerfectPlay,
  getPlaytimeStats,
  handleLaunchGame,
  lastPlayedGame,
  launchGame,
  library,
  loading,
  scanLocalLibrary,
  searchQuery,
  setFilterGenre,
  setFilterMood,
  setFilterPlatform,
  setFilterTime,
  setLibrary,
  setSearchQuery,
  setTheme,
  theme,
  updateGamePrice
}) => (
  <HashRouter>
    <Routes>
      <Route
        path="/"
        element={renderWithBoundary(
          <Home
            library={library}
            getPerfectPlay={getPerfectPlay}
            launchGame={launchGame}
            onLaunchGame={handleLaunchGame}
            lastPlayedGame={lastPlayedGame}
            insights={[]}
            getPlaytimeStats={getPlaytimeStats}
            getMostPlayedGames={getMostPlayedGames}
            theme={theme}
            onScan={scanLocalLibrary}
            loading={loading}
            mood={filterMood}
            setMood={setFilterMood}
            time={filterTime}
            setTime={setFilterTime}
            selectedGenre={filterGenre}
            setSelectedGenre={setFilterGenre}
            activeSessions={activeSessions}
            endSession={endSession}
          />
        )}
      />
      <Route
        path="/library"
        element={renderWithBoundary(
          <Library
            library={library}
            setLibrary={setLibrary}
            theme={theme}
            filterMood={filterMood}
            setFilterMood={setFilterMood}
            filterGenre={filterGenre}
            setFilterGenre={setFilterGenre}
            filterPlatform={filterPlatform}
            setFilterPlatform={setFilterPlatform}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onScan={scanLocalLibrary}
            onLaunchGame={handleLaunchGame}
            activeSessions={activeSessions}
            endSession={endSession}
            onUpdatePrice={updateGamePrice}
          />
        )}
      />
      <Route path="/stats" element={renderWithBoundary(<Stats library={library} theme={theme} />)} />
      <Route path="/achievements" element={renderWithBoundary(<Achievements library={library} theme={theme} />)} />
      <Route path="/gaming-links" element={renderWithBoundary(<GamingLinks theme={theme} />)} />
      <Route path="/donate" element={renderWithBoundary(<Donate theme={theme} />)} />
      <Route path="/settings" element={renderWithBoundary(<Settings theme={theme} setTheme={setTheme} />)} />
      <Route
        path="/profile"
        element={renderWithBoundary(
          <Profile
            theme={theme}
            getPlaytimeStats={getPlaytimeStats}
            getMostPlayedGames={getMostPlayedGames}
            library={library}
            activeSessions={activeSessions}
            endSession={endSession}
          />
        )}
      />
      <Route
        path="/year-in-review"
        element={renderWithBoundary(
          <YearInReview
            theme={theme}
            library={library}
            onLaunchGame={handleLaunchGame}
            activeSessions={activeSessions}
            endSession={endSession}
            getPlaytimeStats={getPlaytimeStats}
            getMostPlayedGames={getMostPlayedGames}
          />
        )}
      />
      <Route
        path="/challenge-board"
        element={renderWithBoundary(
          <ChallengeBoard
            theme={theme}
            library={library}
            onLaunchGame={handleLaunchGame}
            activeSessions={activeSessions}
            endSession={endSession}
          />
        )}
      />
      <Route
        path="/performance"
        element={renderWithBoundary(
          <PerformanceCockpit
            theme={theme}
            library={library}
            onLaunchGame={handleLaunchGame}
            activeSessions={activeSessions}
            endSession={endSession}
          />
        )}
      />
    </Routes>
  </HashRouter>
);

export default AppRoutes;
