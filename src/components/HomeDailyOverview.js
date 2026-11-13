import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, ScanLine } from 'lucide-react';
import PlayNextCard from './PlayNextCard';
import LazyImage from './LazyImage';
import { resolveGameArtworkBundle } from '../services/GameArtworkService';
import { GameCurationService } from '../services/GameCurationService';
import FriendsPlayingCard from './FriendsPlayingCard';
import DailySpotlightCard from './DailySpotlightCard';
import DailyDoodleTitle from './DailyDoodleTitle';
import OnThisDayCard from './OnThisDayCard';
import TodayStrip from './TodayStrip';
import { CurrentEraCard, RecentSessionsSummary } from './IdentityWidgets';
import EraTransitionCard from './EraTransitionCard';
import YearInReviewPromptCard from './YearInReviewPromptCard';
import MonthlyRecapStrip from './MonthlyRecapStrip';
import GamingVitalsCard from './GamingVitalsCard';
import FirstReadCard from './FirstReadCard';
import LiveYearCard from './LiveYearCard';
import DeepRunCard from './DeepRunCard';
import WhatsNewCard from './WhatsNewCard';
import WishlistService from '../services/WishlistService';
import './HomeDailyOverview.css';

export const HOME_VIEWS = ['today', 'discover', 'activity', 'identity', 'wishlist'];

const VIEW_COPY = {
  today: ['Less browsing. More playing.', 'A game to play. A library to rediscover. A story that is yours.'],
  discover: [
    'Find something worth exploring',
    'Rediscover something you own, see Epic giveaways, or choose by mood and time.',
  ],
  activity: ['Your recent activity', 'Recorded sessions, recaps and milestones, in one place.'],
  identity: ['Your gaming identity', 'Your persona, eras and champions — built from how you play.'],
  wishlist: ['Worth keeping an eye on', 'Your wishlist, prices and purchase recommendations.'],
};

export function HomeViewNavigation({ view, username, libraryCount, onScan, loading }) {
  const [heading, description] = VIEW_COPY[view] || VIEW_COPY.today;
  return (
    <header className="home-daily-header">
      <div className="home-daily-heading-row">
        <div>
          <p className="home-daily-eyebrow">{username ? `Welcome back, ${username}` : 'Your personal gaming space'}</p>
          <h1>{heading}</h1>
          <p>{description}</p>
        </div>
        <div className="home-daily-actions">
          <Link to="/library" className="home-library-link">
            Browse library <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <button
            type="button"
            className={libraryCount ? 'home-rescan' : 'scan-button'}
            onClick={onScan}
            disabled={loading}
          >
            <ScanLine size={16} aria-hidden="true" />
            {loading ? 'Scanning...' : libraryCount ? 'Scan for games' : 'Scan Local Games'}
          </button>
        </div>
      </div>
      <nav className="home-view-navigation" aria-label="Home sections">
        {HOME_VIEWS.map((item) => (
          <Link
            key={item}
            to={item === 'today' ? '/' : `/?view=${item}`}
            aria-current={view === item ? 'page' : undefined}
          >
            {item.charAt(0).toUpperCase() + item.slice(1)}
          </Link>
        ))}
      </nav>
    </header>
  );
}

const NEW_TO_LIBRARY_DAYS = 14;
const MAX_NEW_GAMES = 5;

const formatAddedAgo = (ts) => {
  if (!ts) return 'recently added';
  const days = Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'added today';
  if (days === 1) return 'added yesterday';
  return `added ${days}d ago`;
};

export default function HomeDailyOverview({
  library,
  onLaunchGame,
  activeSessions = {},
  endSession,
  username,
  welcomeMessage,
  profilePic,
  themeId,
}) {
  const hasLibrary = Array.isArray(library) && library.length > 0;

  // Steam's "What's New" shelf analog: games first scanned in the last
  // fortnight (new purchases, claimed freebies, fresh ROM scans), newest first.
  const newToLibrary = useMemo(
    () =>
      (Array.isArray(library) ? library : [])
        .filter((game) => game?.name && GameCurationService.isRecentlyAdded(game.name, NEW_TO_LIBRARY_DAYS))
        .map((game) => ({ game, added: GameCurationService.getDateAdded(game.name) || 0 }))
        .sort((a, b) => b.added - a.added)
        .slice(0, MAX_NEW_GAMES),
    [library]
  );

  // Kick a background wishlist price check on Today mounts — refreshIfStale
  // self-guards on the wishlist toggle and its 24h cache, so this is a no-op
  // when disabled or fresh. When it lands, the TodayStrip deals chip updates
  // via the gamepilot:wishlist-alerts event.
  useEffect(() => {
    WishlistService.refreshIfStale()?.catch?.(() => {});
  }, []);

  return (
    <main className="home-daily-overview" aria-label="Today">
      <div className="home-daily-doodle">
        <DailyDoodleTitle
          username={username}
          welcomeMessage={username ? welcomeMessage : ''}
          profilePic={profilePic}
          themeId={themeId}
        />
      </div>
      {hasLibrary ? (
        <>
          <WhatsNewCard hasLibrary={hasLibrary} />
          <TodayStrip />
          <section className="home-daily-play" aria-labelledby="home-play-heading">
            <p className="home-daily-eyebrow">Ready when you are</p>
            <h2 id="home-play-heading">Play Next</h2>
            <PlayNextCard
              library={library}
              onLaunchGame={onLaunchGame}
              emptyFallback={<p>No pick just yet. Browse your library or try the Discover filters.</p>}
            />
            <Link to="/?view=discover" className="home-daily-text-link">
              Want to choose by mood or time? Explore Discover <ArrowRight size={15} aria-hidden="true" />
            </Link>
            {newToLibrary.length > 0 && (
              <div className="home-new-games">
                <p className="home-new-games-label">New to your library</p>
                <ul className="home-new-games-row">
                  {newToLibrary.map(({ game, added }) => {
                    const bundle = resolveGameArtworkBundle(game, {
                      surface: 'portrait',
                      fallbackSurface: 'library_card',
                    });
                    return (
                      <li key={game.name}>
                        <button
                          type="button"
                          className="home-new-games-tile"
                          onClick={() => onLaunchGame?.(game)}
                          aria-label={`Play ${game.name}`}
                          title={`Play ${game.name}`}
                        >
                          <span className="home-new-games-art">
                            {bundle.artwork ? (
                              <LazyImage
                                src={bundle.artwork}
                                fallbackSrc={bundle.fallbackSrc}
                                alt=""
                                placeholder={bundle.placeholder}
                              />
                            ) : (
                              <span className="home-new-games-placeholder" aria-hidden="true">
                                {game.name[0] || '?'}
                              </span>
                            )}
                            <span className="home-new-games-play" aria-hidden="true">
                              <Play size={13} />
                            </span>
                          </span>
                          <span className="home-new-games-name">{game.name}</span>
                          <span className="home-new-games-added">{formatAddedAgo(added)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {Object.keys(activeSessions).length > 0 && (
              <div className="home-active-sessions" aria-label="Active sessions">
                {Object.keys(activeSessions).map((name) => (
                  <div key={name}>
                    <span>Tracking: {name}</span>
                    <button type="button" onClick={() => endSession?.(name)}>
                      End session
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
          <div className="home-daily-spotlight">
            <DailySpotlightCard library={library} />
          </div>
          <section className="home-daily-story" aria-labelledby="home-story-heading">
            <div className="home-daily-section-heading">
              <h2 id="home-story-heading">Your story</h2>
              <Link to="/?view=identity">
                Explore identity <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            <FirstReadCard library={library} />
            <GamingVitalsCard />
            <YearInReviewPromptCard library={library} />
            <EraTransitionCard />
            <CurrentEraCard compact />
            <DeepRunCard library={library} onLaunchGame={onLaunchGame} />
            <RecentSessionsSummary compact />
            <MonthlyRecapStrip />
            <LiveYearCard />
            <Link to="/?view=activity" className="home-daily-text-link">
              View activity and recaps <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <FriendsPlayingCard library={library} onLaunchGame={onLaunchGame} />
            <OnThisDayCard />
          </section>
        </>
      ) : (
        <section className="home-daily-empty">
          <h2>Your next session starts here</h2>
          <p>
            Scan your games using the button above. GamePilot will suggest a game to play and spotlight something from
            your library each day.
          </p>
          <p>Your gaming story grows as you record sessions. No GamePilot account needed.</p>
        </section>
      )}
    </main>
  );
}
