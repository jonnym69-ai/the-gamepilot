import React, { useState } from 'react';
import { KeyRound, Image, Trophy, ShoppingBag, Youtube, HelpCircle } from 'lucide-react';
import './ApiKeysSection.css';
import SteamGridDbService from '../services/SteamGridDbService';
import RetroAchievementsService from '../services/RetroAchievementsService';
import ItchAccountService from '../services/ItchAccountService';
import YouTubeSettings from './YouTubeSettings';
import ApiKeyGuideModal from './ApiKeyGuideModal';
import { useToast } from './Toast';

// Settings → API Keys: one card per optional free service. Every key is the
// user's own, stored only on this PC, and each card carries a popup
// walkthrough ("How do I get a key?") so nobody has to guess where keys come
// from. YouTube is async/encrypted so it is excluded from the header count.
const GUIDES = {
  sgdb: {
    title: 'Get a SteamGridDB key',
    unlocks:
      'Unlocks real cover art, wide heroes and logos for any game — browse them from a game\u2019s Edit details.',
    steps: [
      'Sign in at steamgriddb.com — "Sign in through Steam" is the quickest way.',
      'Open your profile menu and choose Preferences → API.',
      'Click "Generate API Key" and copy it (or copy an existing one).',
      'Paste the key into the field on this card — done.',
    ],
    linkUrl: 'https://www.steamgriddb.com/profile/preferences/api',
    linkLabel: 'Open the SteamGridDB API page',
  },
  ra: {
    title: 'Get a RetroAchievements key',
    unlocks: 'Unlocks achievement progress on your emulated games after a ROM rescan.',
    steps: [
      'Create a free account at retroachievements.org.',
      'Open your control panel and scroll to the "Keys" section.',
      'Copy your Web API Key.',
      'Paste it here along with your RetroAchievements username.',
    ],
    linkUrl: 'https://retroachievements.org/controlpanel.php',
    linkLabel: 'Open your RA control panel',
  },
  itch: {
    title: 'Get an itch.io key',
    unlocks:
      'Unlocks your owned itch.io library — purchases, claimed freebies and bundle games — in "Owned, not installed" and backlog picks.',
    steps: [
      'Sign in at itch.io.',
      'Open user settings → API keys.',
      'Click "Generate new API key" and copy it.',
      'Paste it here — clearing the field later disconnects.',
    ],
    linkUrl: 'https://itch.io/user/settings/api-keys',
    linkLabel: 'Open itch.io API keys',
  },
  youtube: {
    title: 'Get a YouTube Data API key',
    unlocks: 'Unlocks the local "Watch before you play" video previews. Searches only run when you choose a video.',
    steps: [
      'Sign in to Google Cloud Console with a Google account (free).',
      'Create a project, or select an existing one.',
      'Enable "YouTube Data API v3".',
      'Go to Credentials → Create credentials → API key.',
      'Paste the key here — it is stored encrypted on this PC.',
    ],
    linkUrl: 'https://console.cloud.google.com/apis/library/youtube.googleapis.com',
    linkLabel: 'Open YouTube Data API in Google Cloud',
  },
};

export function getConnectedKeyCount() {
  return [
    Boolean(SteamGridDbService.getApiKey()),
    Boolean(RetroAchievementsService.getCredentials()),
    Boolean(ItchAccountService.getApiKey()),
  ].filter(Boolean).length;
}

function ApiKeyCard({ icon, name, tagline, connected, guide, onShowGuide, children }) {
  return (
    <div className="api-key-card">
      <div className="api-key-card-head">
        <span className="api-key-card-icon">{icon}</span>
        <span className="api-key-card-name">{name}</span>
        {connected !== null && (
          <span className={`api-key-card-status${connected ? ' connected' : ''}`}>
            {connected ? 'Connected' : 'Not set up'}
          </span>
        )}
      </div>
      <p className="api-key-card-tagline">{tagline}</p>
      <div className="api-key-card-fields">{children}</div>
      <button type="button" className="api-key-guide-open" onClick={() => onShowGuide(guide)}>
        <HelpCircle size={14} />
        How do I get a key?
      </button>
    </div>
  );
}

export default function ApiKeysSection() {
  const { success } = useToast();
  const [guideKey, setGuideKey] = useState(null);
  const [sgdbDraft, setSgdbDraft] = useState('');
  const [sgdbSaved, setSgdbSaved] = useState(SteamGridDbService.getApiKey());
  const [raEnabled, setRaEnabled] = useState(RetroAchievementsService.isEnabled());
  const [raUsername, setRaUsername] = useState(RetroAchievementsService.getUsername());
  const [raApiKey, setRaApiKey] = useState(RetroAchievementsService.getApiKey());
  const [itchKey, setItchKey] = useState(ItchAccountService.getApiKey());

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text)',
    boxSizing: 'border-box',
  };

  const saveSgdb = () => {
    const value = sgdbDraft.trim();
    if (!value) return;
    SteamGridDbService.setApiKey(value);
    setSgdbSaved(value);
    setSgdbDraft('');
    success('SteamGridDB key saved. Browse artwork from any game\u2019s Edit details.');
  };

  const clearSgdb = () => {
    SteamGridDbService.setApiKey('');
    setSgdbSaved('');
    success('SteamGridDB key removed.');
  };

  return (
    <div className="settings-section">
      <div className="section-header">
        <KeyRound size={20} />
        <h2>API Keys</h2>
      </div>
      <p className="setting-description" style={{ marginTop: 0 }}>
        Optional free keys unlock more of GamePilot — artwork browsers, retro achievements and your itch library. Each
        one is yours, stored only on this PC, and only ever sent to the service it belongs to.
      </p>

      <ApiKeyCard
        icon={<Image size={18} />}
        name="SteamGridDB"
        tagline="Browse and apply real cover art, heroes and logos for any game from Edit details."
        connected={Boolean(sgdbSaved)}
        guide={GUIDES.sgdb}
        onShowGuide={(g) => setGuideKey(g)}
      >
        <input
          type="password"
          placeholder={sgdbSaved ? 'Replace key…' : 'Paste your SteamGridDB API key…'}
          value={sgdbDraft}
          onChange={(e) => setSgdbDraft(e.target.value)}
          aria-label="SteamGridDB API key"
          style={inputStyle}
        />
        <div className="api-key-card-actions">
          <button type="button" className="export-button" onClick={saveSgdb} disabled={!sgdbDraft.trim()}>
            Save key
          </button>
          {sgdbSaved && (
            <button type="button" className="export-button" onClick={clearSgdb}>
              Remove key
            </button>
          )}
        </div>
      </ApiKeyCard>

      <ApiKeyCard
        icon={<Trophy size={18} />}
        name="RetroAchievements"
        tagline="Show achievement progress on emulated games after a ROM rescan. Needs your RA username and web API key."
        connected={Boolean(raUsername.trim() && raApiKey.trim())}
        guide={GUIDES.ra}
        onShowGuide={(g) => setGuideKey(g)}
      >
        <div className="api-key-toggle-row">
          <div className="toggle-switch">
            <input
              type="checkbox"
              checked={raEnabled}
              onChange={(e) => {
                const next = e.target.checked;
                setRaEnabled(next);
                RetroAchievementsService.setEnabled(next);
                success(
                  next
                    ? 'RetroAchievements enabled. Rescan ROMs to match your retro library.'
                    : 'RetroAchievements disabled.'
                );
              }}
              id="api-keys-ra-enabled"
            />
            <label htmlFor="api-keys-ra-enabled" className="toggle-slider"></label>
          </div>
          <span className="api-key-toggle-label">Enabled</span>
        </div>
        {raEnabled && (
          <>
            <input
              type="text"
              placeholder="RetroAchievements username"
              value={raUsername}
              onChange={(e) => {
                setRaUsername(e.target.value);
                RetroAchievementsService.setUsername(e.target.value);
              }}
              aria-label="RetroAchievements username"
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Web API key"
              value={raApiKey}
              onChange={(e) => {
                setRaApiKey(e.target.value);
                RetroAchievementsService.setApiKey(e.target.value);
              }}
              aria-label="RetroAchievements web API key"
              style={inputStyle}
            />
            {(!raUsername.trim() || !raApiKey.trim()) && (
              <p className="api-key-card-hint">Add both a username and API key so a ROM rescan can pick up progress.</p>
            )}
          </>
        )}
      </ApiKeyCard>

      <ApiKeyCard
        icon={<ShoppingBag size={18} />}
        name="itch.io"
        tagline="Show games you own on itch — purchases, claimed freebies and bundle games — in “Owned, not installed”."
        connected={Boolean(itchKey)}
        guide={GUIDES.itch}
        onShowGuide={(g) => setGuideKey(g)}
      >
        <input
          type="password"
          placeholder="Paste your itch.io API key…"
          value={itchKey}
          onChange={(e) => setItchKey(e.target.value)}
          onBlur={() => {
            const next = itchKey.trim();
            if (next) ItchAccountService.setApiKey(next);
            else ItchAccountService.clear();
            setItchKey(ItchAccountService.getApiKey());
          }}
          aria-label="itch.io API key"
          style={inputStyle}
        />
        {itchKey && (
          <p className="api-key-card-hint">
            {ItchAccountService.getCached()?.games?.length
              ? `Key saved — ${ItchAccountService.getCached().games.length} itch games found.`
              : 'Key saved — your itch games appear on the next library refresh.'}
          </p>
        )}
      </ApiKeyCard>

      <ApiKeyCard
        icon={<Youtube size={18} />}
        name="YouTube"
        tagline="Power the local “Watch before you play” previews. Stored encrypted on this PC."
        connected={null}
        guide={GUIDES.youtube}
        onShowGuide={(g) => setGuideKey(g)}
      >
        <YouTubeSettings embedded />
      </ApiKeyCard>

      <ApiKeyGuideModal isOpen={Boolean(guideKey)} guide={guideKey} onClose={() => setGuideKey(null)} />
    </div>
  );
}
