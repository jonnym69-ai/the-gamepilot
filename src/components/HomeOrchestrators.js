import React from 'react';
import EmptyState from './EmptyState';
import { HomeSection } from './HomeSectionPrimitives';
import {
  ContinuePlayingSection,
  MomentumSection,
  MatchMyMoodSection,
  TuneYourNextPickSection,
  TopRatedSection,
  PerfectPlayResultSection,
  SurpriseGameResultSection,
  RediscoverResultSection,
  RecommendationResultsSection,
} from './RecommendationShelves';
import { LibraryTodaySection, LibraryStoryCard } from './LibraryTodaySection';

export function GettingStartedSection({ onOpen }) {
  return (
    <div className="getting-started-section">
      <button
        onClick={onOpen}
        className="getting-started-button"
        title="Open the getting started guide and shortcut overview"
      >
        📖 Getting Started Guide
      </button>
    </div>
  );
}

export function HomeToolsContent({
  libraryCount,
  mood,
  selectedGenre,
  time,
  availableMoods,
  availableGenres,
  onSelectVibe,
  onMoodChange,
  onGenreChange,
  onTimeChange,
  onFindGamesForMood,
  onFindPerfectPlay,
  onSurpriseMe,
  onRediscover,
  perfectPlayResult,
  perfectPlayEntries,
  surpriseGameResult,
  surpriseGame,
  surpriseEntry,
  surpriseGameArtwork,
  surpriseGamePlaceholder,
  rediscoverGameResult,
  rediscoverEntries,
  topRatedGames,
  shouldShowLegacyTopRatedSection,
  getGameCardClass,
  platformColors,
  platformIcons,
  formatPlaytime,
  handleTrackedLaunch,
  renderEndSessionButton,
  renderRecommendationFeedback,
  onClearPerfectPlay,
  onClearSurprise,
  onCloseRediscover,
  onLaunchGame,
  onOpenGettingStarted,
}) {
  const hasLibrary = Number(libraryCount || 0) > 0;
  const hasMeaningfulLibrary = Number(libraryCount || 0) >= 3;

  return (
    <div className="home-content">
      {hasMeaningfulLibrary && (
        <MatchMyMoodSection
          mood={mood}
          selectedGenre={selectedGenre}
          time={time}
          availableMoods={availableMoods}
          availableGenres={availableGenres}
          onSelectVibe={onSelectVibe}
          onMoodChange={onMoodChange}
          onGenreChange={onGenreChange}
          onTimeChange={onTimeChange}
          onFindGamesForMood={onFindGamesForMood}
        />
      )}

      {!hasLibrary && (
        <EmptyState
          icon="🛰️"
          title="Scan your library to unlock smarter Home recommendations"
          description="Once GamePilot can see your installed games, this area becomes much more useful for mood matching, surprise picks, rediscovery, and guided recommendations."
          compact
          style={{ marginBottom: '20px' }}
        />
      )}

      {hasLibrary && !hasMeaningfulLibrary && (
        <EmptyState
          icon="🧪"
          title="Your Home tools are still calibrating"
          description="You already have a few games in the library, but GamePilot gets noticeably better once you scan more titles and build a little session history. For now, the core filters below are the most useful controls."
          compact
          style={{ marginBottom: '20px' }}
        />
      )}

      <TuneYourNextPickSection
        mood={mood}
        selectedGenre={selectedGenre}
        time={time}
        availableMoods={availableMoods}
        availableGenres={availableGenres}
        onMoodChange={onMoodChange}
        onGenreChange={onGenreChange}
        onTimeChange={onTimeChange}
        onFindPerfectPlay={onFindPerfectPlay}
        onSurpriseMe={onSurpriseMe}
        onRediscover={onRediscover}
      />

      <RecommendationResultsSection hasResults={perfectPlayResult || surpriseGameResult || rediscoverGameResult}>
        <PerfectPlayResultSection
          result={perfectPlayResult}
          entries={perfectPlayEntries}
          getGameCardClass={getGameCardClass}
          platformIcons={platformIcons}
          formatPlaytime={formatPlaytime}
          handleTrackedLaunch={handleTrackedLaunch}
          renderEndSessionButton={renderEndSessionButton}
          renderRecommendationFeedback={renderRecommendationFeedback}
          onClear={onClearPerfectPlay}
        />
        <SurpriseGameResultSection
          result={surpriseGameResult}
          game={surpriseGame}
          entry={surpriseEntry}
          artwork={surpriseGameArtwork}
          placeholder={surpriseGamePlaceholder}
          platformIcons={platformIcons}
          formatPlaytime={formatPlaytime}
          handleTrackedLaunch={handleTrackedLaunch}
          renderEndSessionButton={renderEndSessionButton}
          renderRecommendationFeedback={renderRecommendationFeedback}
          onClear={onClearSurprise}
        />
        <RediscoverResultSection
          result={rediscoverGameResult}
          entries={rediscoverEntries}
          getGameCardClass={getGameCardClass}
          platformIcons={platformIcons}
          formatPlaytime={formatPlaytime}
          handleTrackedLaunch={handleTrackedLaunch}
          renderEndSessionButton={renderEndSessionButton}
          renderRecommendationFeedback={renderRecommendationFeedback}
          onClose={onCloseRediscover}
        />
      </RecommendationResultsSection>

      {topRatedGames.length > 0 && shouldShowLegacyTopRatedSection && (
        <TopRatedSection
          games={topRatedGames}
          getGameCardClass={getGameCardClass}
          platformIcons={platformIcons}
          formatPlaytime={formatPlaytime}
          onLaunchGame={onLaunchGame}
          renderEndSessionButton={renderEndSessionButton}
        />
      )}

      <GettingStartedSection onOpen={onOpenGettingStarted} />
    </div>
  );
}

export function HomeGuidedContent({
  libraryCount,
  homeShelfCards,
  weeklyQuestSummary,
  weeklyPlayDays,
  weeklyPlaytimeHours,
  recentLibraryActivity,
  tonightPickGame,
  tonightPickEntry,
  tonightPickArtwork,
  tonightPickPlaceholder,
  continuePlayingGame,
  continuePlayingEntry,
  continuePlayingArtwork,
  continuePlayingPlaceholder,
  rediscoverShelfGame,
  rediscoverShelfEntry,
  rediscoverShelfArtwork,
  rediscoverShelfPlaceholder,
  favoriteShelfGame,
  favoriteShelfArtwork,
  favoriteShelfPlaceholder,
  surpriseShelfGame,
  surpriseShelfEntry,
  surpriseShelfArtwork,
  surpriseShelfPlaceholder,
  surpriseCycling,
  platformIcons,
  onLaunchTonightPick,
  onLaunchContinuePlaying,
  onLaunchRediscover,
  onLaunchFavorite,
  onLaunchSurpriseShelf,
  onViewSurpriseShelfStore,
  formatLastPlayed,
  formatPlaytime,
  familiarityBias,
  onFamiliarityChange,
  buyEntry,
  buyEntryIndex,
  buyEntryCount,
  onBuyNext,
  onBuyPrev,
  libraryStoryItems,
  shouldShowLegacyContinueSection,
  continuePlayingMessage,
  continuePlayingEndSessionButton,
  weeklyQuest,
  gamePilotPickEntries,
  gamePilotPicksResult,
  getGameCardClass,
  onLaunchGame,
  trackRecommendationLaunch,
  renderEndSessionButton,
  handleWeeklyQuestPinToggle
}) {
  const hasLibrary = Number(libraryCount || 0) > 0;

  return (
    <>
      <HomeSection
        eyebrow="Guided Right Now"
        title="Let GamePilot lead the first choice"
        copy="Start with the shelves and story below, then drop into the curation tools when you want to steer more precisely."
      >
        {hasLibrary ? (
          <>
            <LibraryTodaySection
              homeShelfCards={homeShelfCards}
              weeklyQuestSummary={weeklyQuestSummary}
              weeklyPlayDays={weeklyPlayDays}
              weeklyPlaytimeHours={weeklyPlaytimeHours}
              recentLibraryActivity={recentLibraryActivity}
              tonightPickGame={tonightPickGame}
              tonightPickEntry={tonightPickEntry}
              tonightPickArtwork={tonightPickArtwork}
              tonightPickPlaceholder={tonightPickPlaceholder}
              continuePlayingGame={continuePlayingGame}
              continuePlayingEntry={continuePlayingEntry}
              continuePlayingArtwork={continuePlayingArtwork}
              continuePlayingPlaceholder={continuePlayingPlaceholder}
              rediscoverShelfGame={rediscoverShelfGame}
              rediscoverShelfEntry={rediscoverShelfEntry}
              rediscoverShelfArtwork={rediscoverShelfArtwork}
              rediscoverShelfPlaceholder={rediscoverShelfPlaceholder}
              favoriteShelfGame={favoriteShelfGame}
              favoriteShelfArtwork={favoriteShelfArtwork}
              favoriteShelfPlaceholder={favoriteShelfPlaceholder}
              surpriseShelfGame={surpriseShelfGame}
              surpriseShelfEntry={surpriseShelfEntry}
              surpriseShelfArtwork={surpriseShelfArtwork}
              surpriseShelfPlaceholder={surpriseShelfPlaceholder}
              surpriseCycling={surpriseCycling}
              platformIcons={platformIcons}
              onLaunchTonightPick={onLaunchTonightPick}
              onLaunchContinuePlaying={onLaunchContinuePlaying}
              onLaunchRediscover={onLaunchRediscover}
              onLaunchFavorite={onLaunchFavorite}
              onLaunchSurpriseShelf={onLaunchSurpriseShelf}
              onViewSurpriseShelfStore={onViewSurpriseShelfStore}
              formatLastPlayed={formatLastPlayed}
              formatPlaytime={formatPlaytime}
              familiarityBias={familiarityBias}
              onFamiliarityChange={onFamiliarityChange}
              buyEntry={buyEntry}
              buyEntryIndex={buyEntryIndex}
              buyEntryCount={buyEntryCount}
              onBuyNext={onBuyNext}
              onBuyPrev={onBuyPrev}
            />

            <LibraryStoryCard items={libraryStoryItems} />
          </>
        ) : (
          <EmptyState
            icon="🎮"
            title="Your Home shelves will appear after your first scan"
            description="Scan your local games to unlock Tonight's Best Pick, Continue Playing, Rediscover, and the rest of the guided Home view."
          />
        )}
      </HomeSection>

      {shouldShowLegacyContinueSection && (
        <ContinuePlayingSection
          game={continuePlayingGame}
          entry={continuePlayingEntry}
          artwork={continuePlayingArtwork}
          placeholder={continuePlayingPlaceholder}
          platformIcons={platformIcons}
          formatLastPlayed={formatLastPlayed}
          formatPlaytime={formatPlaytime}
          message={continuePlayingMessage}
          onLaunch={onLaunchContinuePlaying}
          endSessionButton={continuePlayingEndSessionButton}
        />
      )}

      <MomentumSection
        weeklyQuest={weeklyQuest}
        gamePilotPickEntries={gamePilotPickEntries}
        gamePilotPicksResult={gamePilotPicksResult}
        getGameCardClass={getGameCardClass}
        platformIcons={platformIcons}
        formatLastPlayed={formatLastPlayed}
        formatPlaytime={formatPlaytime}
        onLaunchGame={onLaunchGame}
        trackRecommendationLaunch={trackRecommendationLaunch}
        renderEndSessionButton={renderEndSessionButton}
        handleWeeklyQuestPinToggle={handleWeeklyQuestPinToggle}
      />
    </>
  );
}
