import React, { useEffect, useState } from 'react';
import { KeyRound, Image, Trophy, ShoppingBag, Youtube, HelpCircle, CloudDownload, Gamepad2 } from 'lucide-react';
import './ApiKeysSection.css';
import SteamGridDbService from '../services/SteamGridDbService';
import RetroAchievementsService from '../services/RetroAchievementsService';
import ItchAccountService from '../services/ItchAccountService';
import SteamWishlistService from '../services/SteamWishlistService';
import SteamFriendsService from '../services/SteamFriendsService';
import SteamProfileService from '../services/SteamProfileService';
import SteamOwnedGamesService from '../services/SteamOwnedGamesService';
import EpicAccountService from '../services/EpicAccountService';
import NotificationService from '../services/NotificationService';
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
  steam: {
    title: 'Find your Steam64 ID',
    unlocks:
      'Unlocks wishlist import, friends presence, your Steam profile card and your owned-but-not-installed Steam games.',
    steps: [
      'Your Steam64 ID is a 17-digit number from your public profile — it is not a secret key.',
      'Copy your Steam profile URL: Steam → your name → Profile → right-click → Copy Page URL.',
      'Paste the URL straight into the field — GamePilot extracts the ID for you.',
      'If syncs find nothing, set your Steam Game Details to public so the lists can be read.',
    ],
    linkUrl: 'https://steamid.io',
    linkLabel: 'Look it up on steamid.io',
  },
};

export function getConnectedKeyCount() {
  return [
    Boolean(SteamGridDbService.getApiKey()),
    Boolean(RetroAchievementsService.getCredentials()),
    Boolean(ItchAccountService.getApiKey()),
    Boolean(SteamWishlistService.getSteamId()),
    Boolean(EpicAccountService.isLinked()),
  ].filter(Boolean).length;
}

function ApiKeyCard({ icon, name, tagline, connected, guide, guideLabel, onShowGuide, children }) {
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
      {guide && (
        <button type="button" className="api-key-guide-open" onClick={() => onShowGuide(guide)}>
          <HelpCircle size={14} />
          {guideLabel || 'How do I get a key?'}
        </button>
      )}
    </div>
  );
}

export default function ApiKeysSection({ library = [] }) {
  const { success } = useToast();
  const [guideKey, setGuideKey] = useState(null);
  const [steamId, setSteamId] = useState(() => SteamWishlistService.getSteamId());
  const [steamWishlistEnabled, setSteamWishlistEnabled] = useState(() => SteamWishlistService.isEnabled());
  const [steamWishlistSyncing, setSteamWishlistSyncing] = useState(false);
  const [steamWishlistLastResult, setSteamWishlistLastResult] = useState(() => SteamWishlistService.getLastResult());
  const [steamFriendsEnabled, setSteamFriendsEnabled] = useState(() => SteamFriendsService.isEnabled());
  const [steamProfileEnabled, setSteamProfileEnabled] = useState(() => SteamProfileService.isEnabled());
  const [steamOwnedGamesEnabled, setSteamOwnedGamesEnabled] = useState(() => SteamOwnedGamesService.isEnabled());
  const [epicLinked, setEpicLinked] = useState(() => EpicAccountService.isLinked());
  const [epicDisplayName, setEpicDisplayName] = useState(() => EpicAccountService.getAccountMeta()?.displayName || '');
  const [epicLinkBusy, setEpicLinkBusy] = useState(false);
  const [epicLinkError, setEpicLinkError] = useState(null);

  useEffect(() => {
    let active = true;
    EpicAccountService.refreshStatus()
      .then((status) => {
        if (!active) return;
        setEpicLinked(status.linked === true);
        setEpicDisplayName(status.displayName || EpicAccountService.getAccountMeta()?.displayName || '');
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
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
        <h2>Integrations &amp; API Keys</h2>
      </div>
      <p className="setting-description" style={{ marginTop: 0 }}>
        Connect free accounts and keys to unlock more of GamePilot — Steam sync, artwork browsers, retro achievements,
        your itch library and video previews. Everything stays on this PC and is only ever sent to the service it
        belongs to.
      </p>

      <ApiKeyCard
        icon={<CloudDownload size={18} />}
        name="Steam"
        tagline="Sync your public Steam data — wishlist, friends presence, profile card and owned games — with your Steam64 ID."
        connected={Boolean(steamId.trim())}
        guide={GUIDES.steam}
        guideLabel="How do I find my Steam64 ID?"
        onShowGuide={(g) => setGuideKey(g)}
      >
        <input
          type="text"
          placeholder="Paste your Steam64 ID or profile URL…"
          value={steamId}
          onChange={(e) => {
            const next = e.target.value;
            setSteamId(next);
            SteamWishlistService.setSteamId(next);
          }}
          onBlur={() => setSteamId(SteamWishlistService.getSteamId())}
          aria-label="Steam64 ID or profile URL"
          style={inputStyle}
        />
        <div className="api-key-toggle-list">
          <div className="api-key-toggle-row">
            <span className="api-key-toggle-label">
              Wishlist import
              <span className="api-key-toggle-sub">Adds your Steam wishlist to the local Wishlist</span>
            </span>
            <span className="toggle-switch">
              <input
                type="checkbox"
                checked={steamWishlistEnabled}
                onChange={(e) => {
                  const next = e.target.checked;
                  setSteamWishlistEnabled(next);
                  SteamWishlistService.setEnabled(next);
                  success(`Steam Wishlist import ${next ? 'enabled' : 'disabled'}.`);
                }}
                id="api-keys-steam-wishlist"
              />
              <label htmlFor="api-keys-steam-wishlist" className="toggle-slider"></label>
            </span>
          </div>
          <div className="api-key-toggle-row">
            <span className="api-key-toggle-label">
              Friends presence
              <span className="api-key-toggle-sub">Which friends are online and what they're playing</span>
            </span>
            <span className="toggle-switch">
              <input
                type="checkbox"
                checked={steamFriendsEnabled}
                onChange={(e) => {
                  const next = e.target.checked;
                  setSteamFriendsEnabled(next);
                  SteamFriendsService.setEnabled(next);
                  NotificationService.syncFriendsWatch(library);
                  success(`Steam friends presence ${next ? 'enabled' : 'disabled'}.`);
                }}
                id="api-keys-steam-friends"
              />
              <label htmlFor="api-keys-steam-friends" className="toggle-slider"></label>
            </span>
          </div>
          <div className="api-key-toggle-row">
            <span className="api-key-toggle-label">
              Profile card
              <span className="api-key-toggle-sub">Persona name, avatar, level and join date on Profile</span>
            </span>
            <span className="toggle-switch">
              <input
                type="checkbox"
                checked={steamProfileEnabled}
                onChange={(e) => {
                  const next = e.target.checked;
                  setSteamProfileEnabled(next);
                  SteamProfileService.setEnabled(next);
                  success(`Steam profile card ${next ? 'enabled' : 'disabled'}.`);
                }}
                id="api-keys-steam-profile"
              />
              <label htmlFor="api-keys-steam-profile" className="toggle-slider"></label>
            </span>
          </div>
          <div className="api-key-toggle-row">
            <span className="api-key-toggle-label">
              Owned games
              <span className="api-key-toggle-sub">Owned on Steam but not installed, with install links</span>
            </span>
            <span className="toggle-switch">
              <input
                type="checkbox"
                checked={steamOwnedGamesEnabled}
                onChange={(e) => {
                  const next = e.target.checked;
                  setSteamOwnedGamesEnabled(next);
                  SteamOwnedGamesService.setEnabled(next);
                  success(`Steam owned games ${next ? 'enabled' : 'disabled'}.`);
                }}
                id="api-keys-steam-owned"
              />
              <label htmlFor="api-keys-steam-owned" className="toggle-slider"></label>
            </span>
          </div>
        </div>
        {steamWishlistEnabled && (
          <div className="api-key-card-actions">
            <button
              type="button"
              className="export-button"
              disabled={!SteamWishlistService.getSteamId() || steamWishlistSyncing}
              onClick={async () => {
                setSteamWishlistSyncing(true);
                try {
                  setSteamId(SteamWishlistService.getSteamId());
                  const result = await SteamWishlistService.sync();
                  setSteamWishlistLastResult(result);
                  if (result.success) {
                    success(`Synced ${result.count} game${result.count === 1 ? '' : 's'} from Steam wishlist.`);
                  }
                } finally {
                  setSteamWishlistSyncing(false);
                }
              }}
            >
              {steamWishlistSyncing ? 'Syncing…' : 'Sync wishlist now'}
            </button>
          </div>
        )}
        {steamWishlistLastResult?.fetchedAt && (
          <p className="api-key-card-hint">
            {steamWishlistLastResult.success
              ? `Last sync: ${steamWishlistLastResult.count} new game${steamWishlistLastResult.count === 1 ? '' : 's'} added from ${steamWishlistLastResult.totalFetched} fetched.`
              : `Last sync failed: ${steamWishlistLastResult.error}`}
          </p>
        )}
      </ApiKeyCard>

      <ApiKeyCard
        icon={<Gamepad2 size={18} />}
        name="Epic Games"
        tagline="Show games you own on Epic that aren't installed, with install links. Sign in once on Epic's own page — your token stays encrypted on this PC."
        connected={epicLinked}
      >
        {epicLinked ? (
          <div className="api-key-card-actions">
            <button
              type="button"
              className="export-button"
              disabled={epicLinkBusy}
              onClick={async () => {
                setEpicLinkBusy(true);
                try {
                  await EpicAccountService.disconnect();
                  setEpicLinked(false);
                  setEpicDisplayName('');
                  setEpicLinkError(null);
                  success('Epic account disconnected.');
                } finally {
                  setEpicLinkBusy(false);
                }
              }}
            >
              {epicLinkBusy ? 'Working…' : 'Disconnect'}
            </button>
          </div>
        ) : (
          <div className="api-key-card-actions">
            <button
              type="button"
              className="export-button"
              disabled={epicLinkBusy}
              onClick={async () => {
                setEpicLinkBusy(true);
                setEpicLinkError(null);
                try {
                  const result = await EpicAccountService.link();
                  if (result.success) {
                    setEpicLinked(true);
                    setEpicDisplayName(result.displayName || '');
                    success(`Epic account linked${result.displayName ? ` as ${result.displayName}` : ''}.`);
                  } else if (result.code !== 'cancelled') {
                    setEpicLinkError(result.error || 'Epic sign-in failed — try again.');
                  }
                } finally {
                  setEpicLinkBusy(false);
                }
              }}
            >
              {epicLinkBusy ? 'Waiting for sign-in…' : 'Link Epic Account'}
            </button>
          </div>
        )}
        {epicLinked && epicDisplayName && <p className="api-key-card-hint">Linked as {epicDisplayName}.</p>}
        {epicLinkError && <p className="api-key-card-hint">{epicLinkError}</p>}
      </ApiKeyCard>

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
