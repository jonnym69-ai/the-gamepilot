import React, { useMemo, useRef, useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Dna,
  TrendingUp,
  Sparkles,
  Clock,
  Gamepad2,
  Award,
  Zap,
  ChevronRight,
  Flame,
  Target
} from 'lucide-react';
import { GamingIdentity } from '../GamingIdentity';
import GamingPersonaService from '../services/GamingPersonaService';
import { IdentityShareCard } from './IdentityShareCard';
import { ShareMenu } from './ShareMenu';
import { useToast } from './Toast';
import { LocalShareService } from '../services/LocalShareService';
import ProfileService from '../services/ProfileService';
import { formatPlaytime } from '../utils/formatPlaytime';
import './GamingDNAPage.css';

const TrendArrow = ({ from, to }) => {
  if (!from || !to || from === to) return null;
  return (
    <div className="dna-trend-arrow">
      <span className="dna-trend-from">{from}</span>
      <ChevronRight size={14} />
      <span className="dna-trend-to">{to}</span>
    </div>
  );
};

const DNACard = ({ icon: Icon, title, value, subtitle, trend }) => (
  <div className="dna-card">
    <div className="dna-card-icon">
      <Icon size={20} />
    </div>
    <div className="dna-card-content">
      <span className="dna-card-title">{title}</span>
      <strong className="dna-card-value">{value}</strong>
      {subtitle && <span className="dna-card-subtitle">{subtitle}</span>}
      {trend && <div className="dna-card-trend">{trend}</div>}
    </div>
  </div>
);

const EvolutionTimeline = ({ snapshots }) => {
  if (!snapshots || snapshots.length < 2) return null;

  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];

  const trends = [];
  if (first.favoriteMood && last.favoriteMood && first.favoriteMood !== last.favoriteMood) {
    trends.push({ label: 'Mood', from: first.favoriteMood, to: last.favoriteMood });
  }
  if (first.favoriteGenre && last.favoriteGenre && first.favoriteGenre !== last.favoriteGenre) {
    trends.push({ label: 'Genre', from: first.favoriteGenre, to: last.favoriteGenre });
  }
  if (first.playStyle && last.playStyle && first.playStyle !== last.playStyle) {
    trends.push({ label: 'Style', from: first.playStyle, to: last.playStyle });
  }

  if (trends.length === 0) {
    return (
      <div className="dna-evolution-steady">
        <Sparkles size={16} />
        <span>Your gaming identity has stayed remarkably consistent — a signature style.</span>
      </div>
    );
  }

  return (
    <div className="dna-evolution-trends">
      {trends.map((t) => (
        <div key={t.label} className="dna-evolution-trend">
          <span className="dna-evolution-label">{t.label} shift</span>
          <TrendArrow from={t.from} to={t.to} />
        </div>
      ))}
    </div>
  );
};

export default function GamingDNAPage({ library = [] }) {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const shareCardRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- GamingIdentity reads from storage internally
  const profile = useMemo(() => GamingIdentity.getProfile(), [library]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- GamingIdentity reads from storage internally
  const snapshots = useMemo(() => GamingIdentity.getIdentitySnapshots(), [library]);

  useEffect(() => {
    // Ensure a current snapshot exists for evolution comparison
    GamingIdentity.saveIdentitySnapshot();
  }, []);

  const { firstSnapshot, lastSnapshot, growth } = useMemo(() => {
    if (!snapshots || snapshots.length === 0) {
      return { firstSnapshot: null, lastSnapshot: null, growth: null };
    }
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    return {
      firstSnapshot: first,
      lastSnapshot: last,
      growth: {
        levelDelta: (last.level || 1) - (first.level || 1),
        playtimeDelta: (last.totalPlayTime || 0) - (first.totalPlayTime || 0),
        sessionDelta: (last.totalSessions || 0) - (first.totalSessions || 0),
        libraryDelta: (last.librarySize || 0) - (first.librarySize || 0),
        daysTracked: snapshots.length
      }
    };
  }, [snapshots]);

  const generateShareCardBlob = useCallback(async () => {
    if (!shareCardRef.current) return null;
    setIsCapturing(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(shareCardRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true
      });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      setIsCapturing(false);
      return blob;
    } catch (e) {
      setIsCapturing(false);
      console.error('DNA share capture failed:', e);
      return null;
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- derived from stable profile object
  const identity = useMemo(() => profile?.identity || {}, [profile?.identity]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stats = useMemo(() => profile?.stats || {}, [profile?.stats]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const persona = useMemo(() => profile?.persona || {}, [profile?.persona]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const gamingPersona = useMemo(() => GamingPersonaService.getPersona(), []);
  const primary = gamingPersona?.primaryPersona;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const signatureGames = useMemo(() => profile?.signatureGames || [], [profile?.signatureGames]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tasteClusters = useMemo(() => profile?.tasteClusters || [], [profile?.tasteClusters]);

  const handleCopyImage = useCallback(async () => {
    const blob = await generateShareCardBlob();
    if (!blob) {
      error('Could not generate DNA share card.');
      return false;
    }
    const copied = await LocalShareService.copyImageToClipboard(blob);
    success(copied ? 'DNA card copied to clipboard.' : 'Could not copy DNA card.');
    return copied;
  }, [generateShareCardBlob, success, error]);

  const handleDownloadImage = useCallback(async () => {
    const blob = await generateShareCardBlob();
    if (!blob) {
      error('Could not generate DNA share card.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gamepilot-dna-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    success('DNA card saved.');
  }, [generateShareCardBlob, success, error]);

  const buildShareText = useCallback(() => {
    const lines = [];
    lines.push(`🧬 Gaming DNA — ${profile?.title || 'Gamer'} · Level ${profile?.level || 1}`);
    lines.push(`${stats.totalPlayTime ? formatPlaytime(stats.totalPlayTime) : '0h'} played · ${stats.totalSessions || 0} sessions · ${stats.librarySize || 0} games`);
    if (identity.signature) {
      lines.push(identity.signature);
    }
    lines.push('Powered by GamePilot');
    return ProfileService.appendSocialLinksToShareText(lines.join('\n'));
  }, [profile, stats, identity]);

  const handleShareText = useCallback(async (channel, text = null) => {
    const result = await LocalShareService.openShareIntent(channel, text || buildShareText());
    success(result.success ? `Opened ${result.label}.` : result.message || 'Could not share DNA.');
  }, [buildShareText, success]);

  const handleNativeShare = useCallback(async (text = null) => {
    const blob = await generateShareCardBlob();
    if (!blob) {
      error('Could not generate DNA share card.');
      return;
    }
    const file = new File([blob], `gamepilot-dna-${Date.now()}.png`, { type: 'image/png' });
    const result = await LocalShareService.shareWithNativeShare({
      title: 'My Gaming DNA',
      text: text || buildShareText(),
      files: [file]
    });
    success(result.success ? 'Native share opened.' : result.message || 'Could not share.');
  }, [generateShareCardBlob, buildShareText, success, error]);

  const evolutionData = useMemo(() => {
    if (!firstSnapshot || !lastSnapshot) return null;
    return {
      summary: growth?.daysTracked > 7
        ? `Over ${growth.daysTracked} snapshots, you evolved from a ${firstSnapshot.favoriteMood || 'curious'} player to a ${lastSnapshot.favoriteMood || 'seasoned'} gamer.`
        : `Your gaming DNA is forming — ${growth?.daysTracked || 0} snapshots captured so far.`,
      opening: {
        dominantMood: firstSnapshot.favoriteMood,
        dominantGenre: firstSnapshot.favoriteGenre,
        preferredSessionLabel: firstSnapshot.playStyle,
        identityLabel: firstSnapshot.archetype || firstSnapshot.title || 'Newcomer'
      },
      closing: {
        dominantMood: lastSnapshot.favoriteMood,
        dominantGenre: lastSnapshot.favoriteGenre,
        preferredSessionLabel: lastSnapshot.playStyle,
        identityLabel: lastSnapshot.archetype || lastSnapshot.title || 'Gamer'
      }
    };
  }, [firstSnapshot, lastSnapshot, growth]);

  return (
    <div className="gaming-dna-page">
      <div className="dna-header">
        <button className="dna-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          Back
        </button>
        <div className="dna-title">
          <Dna size={22} />
          <h1>Gaming DNA</h1>
        </div>
        <ShareMenu
          onCopyText={async () => {
            const copied = await LocalShareService.copyTextToClipboard(buildShareText());
            success(copied ? 'DNA text copied to clipboard.' : 'Could not copy DNA text.');
            return copied;
          }}
          onCopyImage={handleCopyImage}
          onSaveImage={handleDownloadImage}
          onShareText={handleShareText}
          buildCaption={buildShareText}
          onNativeShare={handleNativeShare}
          triggerLabel="Share DNA"
          imageAvailable={true}
          disabled={isCapturing}
        />
      </div>

      <div className="dna-hero">
        <div className="dna-identity-badge">
          <span className="dna-title-badge">{profile?.title || 'Gamer'}</span>
          <h2>{identity.personality || primary?.label || persona?.personaIdentity?.label || 'Uncharted Pilot'}</h2>
          <p>{identity.description || gamingPersona?.summaryRoast || primary?.roast || persona?.personaIdentity?.description || 'Your gaming identity is still forming.'}</p>
        </div>
      </div>

      <div className="dna-grid">
        <DNACard
          icon={Clock}
          title="Total Playtime"
          value={formatPlaytime(stats.totalPlayTime || 0)}
          subtitle={`${stats.totalSessions || 0} sessions`}
          trend={growth?.playtimeDelta > 0 ? `+${formatPlaytime(growth.playtimeDelta)} since first snapshot` : null}
        />
        <DNACard
          icon={Gamepad2}
          title="Library"
          value={stats.librarySize || 0}
          subtitle="games tracked"
          trend={growth?.libraryDelta > 0 ? `+${growth.libraryDelta} since start` : null}
        />
        <DNACard
          icon={Award}
          title="Level"
          value={profile?.level || 1}
          subtitle={profile?.title || 'Newbie'}
          trend={growth?.levelDelta > 0 ? `+${growth.levelDelta} levels gained` : null}
        />
        <DNACard
          icon={Zap}
          title="Play Style"
          value={identity.playStyle || 'Balanced'}
          subtitle="session preference"
        />
        <DNACard
          icon={Sparkles}
          title="Dominant Mood"
          value={identity.favoriteMood || persona?.dominantMood || '—'}
          subtitle="your gaming vibe"
        />
        <DNACard
          icon={TrendingUp}
          title="Top Genre"
          value={identity.favoriteGenre || persona?.dominantGenre || '—'}
          subtitle="where you spend time"
        />
      </div>

      {signatureGames.length > 0 && (
        <div className="dna-signature-games-section">
          <h3>
            <Flame size={18} />
            Signature Games
          </h3>
          <p className="dna-section-description">The titles that define your taste — ranked by playtime, ratings, and engagement.</p>
          <div className="dna-signature-games-list">
            {signatureGames.map((game, idx) => (
              <div key={game.appid || game.name || idx} className="dna-signature-game">
                <span className="dna-signature-game-rank">#{idx + 1}</span>
                <div className="dna-signature-game-info">
                  <span className="dna-signature-game-name">{game.name}</span>
                  <span className="dna-signature-game-meta">
                    {game.playtimeHours > 0 && `${game.playtimeHours}h played`}
                    {game.playtimeHours > 0 && game.rating > 0 && ' · '}
                    {game.rating > 0 && `${game.rating}/10`}
                    {game.wouldReplay === true && ' · would replay'}
                  </span>
                  {game.genres && game.genres.length > 0 && (
                    <span className="dna-signature-game-genres">{game.genres.join(' · ')}</span>
                  )}
                </div>
                <span className="dna-signature-game-score">{game.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {signatureGames.length === 0 && tasteClusters.length === 0 && (stats.totalPlayTime || 0) === 0 && (
        <div className="dna-onboarding-nudge">
          <div className="dna-onboarding-icon">
            <Gamepad2 size={32} />
          </div>
          <h3>Play to unlock your taste profile</h3>
          <p>Launch a few games from your library and GamePilot will identify your signature titles, detect your taste clusters, and start serving personalized recommendations.</p>
        </div>
      )}

      {tasteClusters.length > 0 && (
        <div className="dna-taste-clusters-section">
          <h3>
            <Target size={18} />
            Taste Clusters
          </h3>
          <p className="dna-section-description">Emergent patterns from your play history that go beyond single-genre tags.</p>
          <div className="dna-taste-clusters-list">
            {tasteClusters.map((cluster) => (
              <div key={cluster.id} className="dna-taste-cluster">
                <div className="dna-taste-cluster-header">
                  <span className="dna-taste-cluster-label">{cluster.label}</span>
                  <span className="dna-taste-cluster-count">{cluster.matchCount} signature games</span>
                </div>
                <span className="dna-taste-cluster-description">{cluster.description}</span>
                <span className="dna-taste-cluster-games">{cluster.gameNames.join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {snapshots && snapshots.length >= 2 && (
        <div className="dna-evolution-section">
          <h3>
            <TrendingUp size={18} />
            Evolution
          </h3>
          <EvolutionTimeline snapshots={snapshots} />
          <div className="dna-evolution-stats">
            <div>
              <span>First captured</span>
              <strong>{firstSnapshot ? new Date(firstSnapshot.date).toLocaleDateString() : '—'}</strong>
            </div>
            <div>
              <span>Snapshots taken</span>
              <strong>{snapshots.length}</strong>
            </div>
            <div>
              <span>Latest capture</span>
              <strong>{lastSnapshot ? new Date(lastSnapshot.date).toLocaleDateString() : '—'}</strong>
            </div>
          </div>
        </div>
      )}

      {profile?.badges && profile.badges.length > 0 && (
        <div className="dna-badges-section">
          <h3>
            <Award size={18} />
            Identity Badges
          </h3>
          <div className="dna-badges-grid">
            {profile.badges.slice(0, 8).map((badge) => (
              <div key={badge.id} className="dna-badge">
                <span className="dna-badge-icon">{badge.icon}</span>
                <span className="dna-badge-name">{badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dna-signature">
        <h3>
          <Award size={18} />
          Gamer Signature
        </h3>
        <p className="dna-signature-text">{identity.signature || `${profile?.title || 'Gamer'} • Level ${profile?.level || 1} • ${identity.favoriteMood || 'Curious'} • ${identity.favoriteGenre || 'Explorer'}`}</p>
      </div>

      <div style={{ position: 'fixed', left: 0, top: 0, opacity: 0, pointerEvents: 'none', zIndex: -1 }}>
        <div ref={shareCardRef}>
          <IdentityShareCard
            profile={profile}
            evolution={evolutionData}
            library={library}
          />
        </div>
      </div>
    </div>
  );
}
