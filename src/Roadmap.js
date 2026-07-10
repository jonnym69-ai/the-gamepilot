import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Heart, Github, MessageSquare, Send, Map, Twitter, MessageCircle, Check, Youtube, Gamepad2, Lightbulb } from 'lucide-react';
import NavBar from './NavBar';
import StorageService from './services/StorageService';
import './Roadmap.css';

const extractXHandle = (url) => {
  const match = (url || '').match(/(?:twitter\.com|x\.com)\/([^/?#]+)/i);
  return match ? match[1] : null;
};

const X_URL = 'https://x.com/Mozog91';
const PATREON_URL = 'https://www.patreon.com/cw/GamePilot';
const GITHUB_URL = 'https://github.com/jonnym69-ai/the-gamepilot/releases/tag/v1.7.0';
const ITCH_URL = 'https://moz91.itch.io/gamepilot';
const YOUTUBE_URL = 'https://www.youtube.com/@Mozog91';
const DISCORD_URL = 'https://discord.gg/7sy5vmXudB';

const SUPPORT_LINKS = [
  {
    id: 'x',
    label: 'X / Twitter',
    url: X_URL,
    icon: Twitter,
    blurb: 'Follow for updates and send feedback directly.'
  },
  {
    id: 'youtube',
    label: 'YouTube',
    url: YOUTUBE_URL,
    icon: Youtube,
    blurb: 'Watch updates, trailers, and feature deep dives.'
  },
  {
    id: 'patreon',
    label: 'Support on Patreon',
    url: PATREON_URL,
    icon: Heart,
    blurb: 'Pro features, cosmetic packs, and a direct line into what gets built next.'
  },
  {
    id: 'github',
    label: 'GitHub',
    url: GITHUB_URL,
    icon: Github,
    blurb: 'Follow the project, file issues, and watch releases evolve.'
  },
  {
    id: 'itch',
    label: 'itch.io',
    url: ITCH_URL,
    icon: Gamepad2,
    blurb: 'Download the latest builds and check release notes.'
  },
  {
    id: 'discord',
    label: 'Discord',
    url: DISCORD_URL,
    icon: MessageCircle,
    blurb: 'Join the community and share feedback.'
  }
];

const ROADMAP_PHASES = [
  {
    id: 'phase-1',
    status: 'complete',
    label: 'Phase 1',
    title: 'Authoritative session truth',
    description: 'Sessions are the single source of truth. XP and progression are awarded when a session ends, not just when a game launches.'
  },
  {
    id: 'phase-2',
    status: 'complete',
    label: 'Phase 2',
    title: 'Unified stats backbone',
    description: 'StatsAggregationService gives every surface the same numbers: playtime, top games, streaks, sessions, and platform splits.'
  },
  {
    id: 'phase-3',
    status: 'complete',
    label: 'Phase 3',
    title: 'Smarter recommendations & identity loop',
    description: 'Identity-driven picks, wishlist fusion, and weekly story chapters that reflect what you played and what you were recommended.'
  },
  {
    id: 'phase-4',
    status: 'complete',
    label: 'Phase 4',
    title: 'Reward economy expansion',
    description: 'Presentation unlocks, titles, badges, and cosmetic rewards that surface naturally from play behavior.'
  },
  {
    id: 'phase-5',
    status: 'complete',
    label: 'Phase 5',
    title: 'Retention features',
    description: 'Rotating goals, GamePilot Picks, Weekly Quest, and Year in Review become regular reasons to open the app.'
  },
  {
    id: 'phase-6',
    status: 'complete',
    label: 'Phase 6',
    title: 'Identity & story archive',
    description: 'GamingPersonaService, StoryArchive, TasteFingerprint, StoryBookPanel, and the public Roadmap page bring your gaming identity to life.'
  },
  {
    id: 'phase-7',
    status: 'planned',
    label: 'Phase 7',
    title: 'Leanback / controller TV mode',
    description: 'A big-screen, controller-friendly toggle for couch gaming so GamePilot works away from the desk.'
  },
  {
    id: 'free-games',
    status: 'planned',
    label: 'Optional track',
    title: 'Free games discovery',
    description: 'A lightweight radar for free-to-keep and standout deals without cluttering the core experience.'
  }
];

const VOTE_OPTIONS = [
  { id: 'tv-mode', label: 'TV / controller mode' },
  { id: 'free-games', label: 'Free games radar' },
  { id: 'story-archive', label: 'Story archive & book export' },
  { id: 'deeper-insights', label: 'Deeper identity insights' },
  { id: 'multiplayer', label: 'Multiplayer/co-op planner' },
  { id: 'mobile-companion', label: 'Mobile companion sync' }
];

const VOTES_STORAGE_KEY = 'roadmapVotes';

function Roadmap() {
  const navigate = useNavigate();
  const [votes, setVotes] = useState(() => StorageService.get(VOTES_STORAGE_KEY, {}));
  const [justVoted, setJustVoted] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [copiedDiscord, setCopiedDiscord] = useState(false);

  const xHandle = extractXHandle(X_URL);

  const totalVotes = useMemo(() => Object.values(votes).filter(Boolean).length, [votes]);

  const toggleVote = useCallback((id) => {
    const next = { ...votes, [id]: !votes[id] };
    StorageService.set(VOTES_STORAGE_KEY, next);
    setVotes(next);
    setJustVoted(id);
    window.setTimeout(() => setJustVoted((current) => (current === id ? null : current)), 1500);
  }, [votes]);

  const buildFeedbackText = useCallback(() => {
    const selected = VOTE_OPTIONS.filter((option) => votes[option.id]).map((option) => option.label);
    const lines = [
      'GamePilot roadmap feedback',
      '',
      ...(selected.length > 0 ? selected.map((label) => `- ${label}`) : ['- No specific votes selected']),
      '',
      feedback.trim()
    ].filter((line) => line !== '');
    return lines.join('\n');
  }, [votes, feedback]);

  const shareOnX = useCallback(() => {
    const text = buildFeedbackText();
    const mention = xHandle ? ` @${xHandle}` : '';
    const body = `${text}${mention}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');
  }, [buildFeedbackText, xHandle]);

  const copyForDiscord = useCallback(() => {
    const text = buildFeedbackText();
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedDiscord(true);
    window.setTimeout(() => setCopiedDiscord(false), 2000);
  }, [buildFeedbackText]);

  const exportVotes = useCallback(() => {
    const selected = VOTE_OPTIONS.filter((option) => votes[option.id]).map((option) => option.label);
    const payload = {
      type: 'gamepilot-roadmap-votes',
      exportedAt: new Date().toISOString(),
      selected,
      totalVotes: selected.length
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gamepilot-roadmap-votes.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [votes]);

  return (
    <div className="roadmap-page">
      <NavBar />
      <div className="roadmap-content">
        <div className="roadmap-top-nav">
          <button className="roadmap-back" onClick={() => navigate('/')} title="Back to Home">
            <ArrowLeft size={18} /> Back
          </button>
          <span className="roadmap-title-bar">
            <Map size={18} /> Roadmap &amp; Goals
          </span>
        </div>

        <header className="roadmap-hero">
          <span className="roadmap-kicker">Community driven</span>
          <h1>Where GamePilot is heading</h1>
          <p>
            GamePilot is built locally on your machine. Your feedback, bug reports,
            and feature votes shape the order in which the next phases ship. Nothing here
            is a promise — it is a transparent plan that gets reordered by the people
            using the app.
          </p>
        </header>

        <section className="roadmap-phases">
          {ROADMAP_PHASES.map((phase) => (
            <div key={phase.id} className={`roadmap-phase roadmap-phase--${phase.status}`}>
              <div className="roadmap-phase-meta">
                <span className="roadmap-phase-label">{phase.label}</span>
                <span className={`roadmap-phase-status roadmap-phase-status--${phase.status}`}>
                  {phase.status}
                </span>
              </div>
              <h3 className="roadmap-phase-title">{phase.title}</h3>
              <p className="roadmap-phase-description">{phase.description}</p>
            </div>
          ))}
        </section>

        <section className="roadmap-vote">
          <div className="roadmap-vote-header">
            <MessageSquare size={18} />
            <h2>Vote on what comes next</h2>
          </div>
          <p className="roadmap-vote-intro">
            Pick the features you want most. Votes are stored locally and can be exported
            so you can share them with the community.
          </p>
          <div className="roadmap-vote-options">
            {VOTE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`roadmap-vote-option ${votes[option.id] ? 'selected' : ''} ${justVoted === option.id ? 'popped' : ''}`}
                onClick={() => toggleVote(option.id)}
              >
                <span className="roadmap-vote-check" />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
          <div className="roadmap-vote-actions">
            <span className="roadmap-vote-count">{totalVotes} selected</span>
            <button
              type="button"
              className="roadmap-vote-export"
              onClick={exportVotes}
              disabled={totalVotes === 0}
            >
              <Send size={14} /> Export my votes
            </button>
          </div>
        </section>

        <section className="roadmap-feedback">
          <div className="roadmap-feedback-header">
            <Send size={18} />
            <h2>Send feedback directly</h2>
          </div>
          <p className="roadmap-feedback-intro">
            Pick the features you want, add a quick note, and send it straight to the developer.
            No export needed — just a pre-filled post you can send on X or paste into Discord.
          </p>
          <div className="roadmap-feedback-prompt">
            <Lightbulb size={16} />
            <span>What would you like to see in GamePilot?</span>
          </div>
          <textarea
            className="roadmap-feedback-note"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Describe your idea — features, fixes, or anything you wish GamePilot did..."
            rows={3}
          />
          <div className="roadmap-feedback-actions">
            <button
              type="button"
              className="roadmap-feedback-x"
              onClick={shareOnX}
              disabled={!xHandle}
              title={xHandle ? `Post a pre-filled tweet mentioning @${xHandle}` : 'Add your X link in Profile to enable this button'}
            >
              <Twitter size={14} /> Post on X
            </button>
            <button
              type="button"
              className="roadmap-feedback-discord"
              onClick={copyForDiscord}
            >
              {copiedDiscord ? <Check size={14} /> : <MessageCircle size={14} />}
              {copiedDiscord ? 'Copied for Discord' : 'Copy for Discord'}
            </button>
          </div>
          <a
            href={DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="roadmap-discord-invite"
          >
            <MessageCircle size={14} /> Join the Discord to share feedback
          </a>
        </section>

        <section className="roadmap-community">
          <h2>Community input</h2>
          <p>
            Bug reports, Discord threads, GitHub issues, and Patreon messages all feed into
            the same queue. The features that get the most detailed, repeatable feedback
            tend to rise to the top. This app is community-driven: your input goes further
            than you realize.
          </p>
        </section>

        <section className="roadmap-support">
          <h2>Support the project</h2>
          <div className="roadmap-support-cards">
            {SUPPORT_LINKS.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`roadmap-support-card roadmap-support-card--${link.id}`}
              >
                <div className="roadmap-support-icon">
                  <link.icon size={20} />
                </div>
                <div className="roadmap-support-info">
                  <span className="roadmap-support-label">
                    {link.label} <ExternalLink size={12} />
                  </span>
                  <p>{link.blurb}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Roadmap;
