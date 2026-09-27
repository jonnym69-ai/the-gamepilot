import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ScanLine } from 'lucide-react';
import PlayNextCard from './PlayNextCard';
import DailySpotlightCard from './DailySpotlightCard';
import { CurrentEraCard, RecentSessionsSummary } from './IdentityWidgets';
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

export default function HomeDailyOverview({ library, onLaunchGame, activeSessions = {}, endSession }) {
  const hasLibrary = Array.isArray(library) && library.length > 0;
  return (
    <main className="home-daily-overview" aria-label="Today">
      {hasLibrary ? (
        <>
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
            <CurrentEraCard compact />
            <RecentSessionsSummary compact />
            <Link to="/?view=activity" className="home-daily-text-link">
              View activity and recaps <ArrowRight size={15} aria-hidden="true" />
            </Link>
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
