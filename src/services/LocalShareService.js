import { DataExportService } from './DataExportService';
import { openExternalUrl } from './ElectronBridge';
import { StatsAggregationService } from './StatsAggregationService';
import { formatPlaytime } from '../utils/formatPlaytime';
import { GamingIdentity } from '../GamingIdentity';
import GamingPersonaService from './GamingPersonaService';
import { RecapStoryService } from './RecapStoryService';
import { YearInReviewService } from './YearInReviewService';
import CurrentEraService from './CurrentEraService';

const normalizeShareText = (value) => String(value || '').trim();

const DISCORD_WEBHOOK_URL_KEY = 'discordWebhookUrl';

const SHARE_CHANNELS = Object.freeze({
  x: {
    label: 'X',
    buildUrl: (text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
  },
  bluesky: {
    label: 'Bluesky',
    buildUrl: (text) => `https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`
  },
  threads: {
    label: 'Threads',
    buildUrl: (text) => `https://threads.net/intent/post?text=${encodeURIComponent(text)}`
  },
  mastodon: {
    label: 'Mastodon',
    buildUrl: (text) => `https://mastodon.social/share?text=${encodeURIComponent(text)}`
  },
  reddit: {
    label: 'Reddit',
    buildUrl: (text, title) => {
      const shareTitle = title || text?.split('\n')?.[0] || 'My GamePilot Share';
      return `https://www.reddit.com/submit?title=${encodeURIComponent(shareTitle)}&text=${encodeURIComponent(text)}`;
    }
  },
  discord: {
    label: 'Discord',
    buildUrl: (text) => `https://discord.com/channels/@me` // Discord has no web share intent; handled by shareToDiscord
  },
  facebook: {
    label: 'Facebook',
    buildUrl: (text) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://github.com/jonnym69-ai/the-gamepilot/releases')}&quote=${encodeURIComponent(text)}`
  },
  linkedin: {
    label: 'LinkedIn',
    buildUrl: (text) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://github.com/jonnym69-ai/the-gamepilot/releases')}&summary=${encodeURIComponent(text)}`
  },
  whatsapp: {
    label: 'WhatsApp',
    buildUrl: (text) => `https://wa.me/?text=${encodeURIComponent(text)}`
  },
  telegram: {
    label: 'Telegram',
    buildUrl: (text) => `https://t.me/share/url?url=&text=${encodeURIComponent(text)}`
  },
  messenger: {
    label: 'Messenger',
    buildUrl: (text) => `https://www.messenger.com/` // Messenger has no direct web compose URL; handled by shareToMessenger
  },
  email: {
    label: 'Email',
    buildUrl: (text) => {
      const subject = text?.split('\n')?.[0] || 'My GamePilot Share';
      return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    }
  }
});

export class LocalShareService {
  static getDiscordWebhookUrl() {
    try {
      return window.localStorage.getItem(DISCORD_WEBHOOK_URL_KEY) || '';
    } catch {
      return '';
    }
  }

  static setDiscordWebhookUrl(url) {
    try {
      if (url && typeof url === 'string' && url.startsWith('https://discord.com/api/webhooks/')) {
        window.localStorage.setItem(DISCORD_WEBHOOK_URL_KEY, url);
        return true;
      }
      window.localStorage.removeItem(DISCORD_WEBHOOK_URL_KEY);
      return false;
    } catch {
      return false;
    }
  }

  static hasDiscordWebhookUrl() {
    const url = LocalShareService.getDiscordWebhookUrl();
    return Boolean(url) && url.startsWith('https://discord.com/api/webhooks/');
  }

  static async postToDiscordWebhook({ imageBlob = null, text = '', filename = 'gamepilot-share.png' }) {
    const webhookUrl = LocalShareService.getDiscordWebhookUrl();
    if (!webhookUrl) {
      return { success: false, message: 'No Discord webhook URL configured.' };
    }

    const normalizedText = normalizeShareText(text);
    if (!normalizedText && !imageBlob) {
      return { success: false, message: 'Nothing to post to Discord.' };
    }

    try {
      const payloadJson = JSON.stringify({
        content: normalizedText || '',
        username: 'GamePilot',
        avatar_url: 'https://raw.githubusercontent.com/jonnym69-ai/the-gamepilot/main/public/gamepilotlogo.png'
      });

      const electronAPI = typeof window !== 'undefined' ? window.electronAPI : null;

      if (electronAPI && typeof electronAPI.discordWebhookPost === 'function') {
        const body = { payload_json: payloadJson };

        if (imageBlob) {
          const arrayBuffer = await imageBlob.arrayBuffer();
          body.file = {
            data: Array.from(new Uint8Array(arrayBuffer)),
            filename,
            contentType: imageBlob.type || 'image/png'
          };
        }

        const result = await electronAPI.discordWebhookPost({
          url: webhookUrl,
          body,
          isMultipart: true
        });

        if (!result.success) {
          return { success: false, message: `Discord webhook failed: ${result.status} ${result.error || ''}` };
        }

        return { success: true, channel: 'discord-webhook', label: 'Discord Webhook' };
      }

      // Browser fallback (may hit CORS — Electron path is preferred)
      const formData = new FormData();
      formData.append('payload_json', new Blob([payloadJson], { type: 'application/json' }));

      if (imageBlob) {
        const file = new File([imageBlob], filename, { type: imageBlob.type || 'image/png' });
        formData.append('file', file);
      }

      const response = await fetch(webhookUrl, { method: 'POST', body: formData });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return { success: false, message: `Discord webhook failed: ${response.status} ${errorText}` };
      }

      return { success: true, channel: 'discord-webhook', label: 'Discord Webhook' };
    } catch (error) {
      return { success: false, message: error?.message || 'Could not post to Discord webhook.' };
    }
  }

  static getSupportedChannels() {
    return Object.entries(SHARE_CHANNELS).map(([id, config]) => ({
      id,
      label: config.label
    }));
  }

  static buildYearInReviewShareText(snapshot = {}, selectedYear = new Date().getFullYear()) {
    const summary = snapshot?.summary || {};
    const topGames = Array.isArray(snapshot?.topGames) ? snapshot.topGames.slice(0, 3) : [];
    const gamingPersona = GamingPersonaService.getPersona();
    const primary = gamingPersona?.primaryPersona;
    const persona = primary?.label || snapshot?.persona?.identityLabel || 'Player';
    const totalMinutes = Math.max(0, Math.round(Number(summary.playtimeMinutes || 0)));
    const playtimeLabel = formatPlaytime(totalMinutes);

    const lines = [
      `My GamePilot Year in Review ${selectedYear}`,
      ``,
      `${playtimeLabel} across ${summary.sessions || 0} sessions · ${summary.activeDays || 0} active days`,
      `I played like a ${persona}.`
    ];

    const storyArc = snapshot?.seasonalStory?.arc;
    if (storyArc) {
      lines.push('');
      lines.push(`The Story of My ${selectedYear} Gaming Year`);
      lines.push(storyArc);
    }

    if (topGames.length > 0) {
      const topGameNames = topGames.map((game) => game.name).filter(Boolean).join(', ');
      lines.push('');
      lines.push(`Top games: ${topGameNames}`);
    }

    lines.push('');
    lines.push('Get your own local-first recap:');
    lines.push('https://github.com/jonnym69-ai/the-gamepilot/releases');
    lines.push('#GamePilot #LocalFirstGaming #OpenSource');

    return lines.join('\n');
  }

  static async copyTextToClipboard(text) {
    const normalizedText = normalizeShareText(text);
    if (!normalizedText) {
      return false;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(normalizedText);
        return true;
      }
    } catch (error) {
      // Fallback below
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = normalizedText;
      textArea.setAttribute('readonly', 'true');
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      textArea.style.pointerEvents = 'none';
      document.body.appendChild(textArea);
      textArea.select();
      textArea.setSelectionRange(0, normalizedText.length);
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return Boolean(success);
    } catch (error) {
      return false;
    }
  }

  static downloadShareText(text, filename = null) {
    const normalizedText = normalizeShareText(text);
    if (!normalizedText) {
      return false;
    }

    const safeFilename = filename || `gamepilot-share-${new Date().toISOString().split('T')[0]}.txt`;
    const blob = new Blob([normalizedText], { type: 'text/plain;charset=utf-8' });
    DataExportService.downloadFile(blob, safeFilename);
    return true;
  }

  static async downloadImageFromCanvas(canvas, filename = null) {
    if (!canvas) return { success: false, message: 'Canvas not available' };

    const safeFilename = filename || `gamepilot-share-${new Date().toISOString().split('T')[0]}.png`;

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) {
      return { success: false, message: 'Failed to generate image blob' };
    }

    DataExportService.downloadFile(blob, safeFilename);
    return { success: true, filename: safeFilename };
  }

  static async openShareIntent(channel, text) {
    const normalizedText = normalizeShareText(text);
    if (!normalizedText) {
      return { success: false, message: 'Share text is empty.' };
    }

    const config = SHARE_CHANNELS[channel];
    if (!config) {
      return { success: false, message: `Unsupported share channel: ${channel}` };
    }

    try {
      const url = config.buildUrl(normalizedText);
      await openExternalUrl(url);
      return { success: true, channel, label: config.label, url };
    } catch (error) {
      return {
        success: false,
        channel,
        label: config.label,
        message: error?.message || 'Failed to open share link.'
      };
    }
  }

  static async shareToDiscord({ imageBlob = null, text = '', filename = 'gamepilot-share.png' }) {
    const normalizedText = normalizeShareText(text);
    if (!normalizedText && !imageBlob) {
      return { success: false, message: 'Nothing to share to Discord.' };
    }

    if (LocalShareService.hasDiscordWebhookUrl()) {
      const result = await LocalShareService.postToDiscordWebhook({ imageBlob, text, filename });
      if (result.success) {
        return { ...result, imageStaged: false, url: '' };
      }
      return { ...result, imageStaged: false };
    }

    const canWriteClipboard = typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.write === 'function';

    if (imageBlob && !canWriteClipboard) {
      return { success: false, message: 'Clipboard image sharing is not supported on this device.' };
    }

    try {
      const items = [];
      if (imageBlob) {
        const file = new File([imageBlob], filename, { type: imageBlob.type || 'image/png' });
        const clipboardItemData = { [file.type]: file };
        if (normalizedText) {
          clipboardItemData['text/plain'] = new Blob([normalizedText], { type: 'text/plain' });
        }
        items.push(new ClipboardItem(clipboardItemData));
      } else if (normalizedText) {
        await LocalShareService.copyTextToClipboard(normalizedText);
      }

      if (items.length > 0) {
        await navigator.clipboard.write(items);
      }

      const url = SHARE_CHANNELS.discord.buildUrl(normalizedText);
      await openExternalUrl(url);
      return { success: true, channel: 'discord', label: 'Discord', url, imageStaged: Boolean(imageBlob) };
    } catch (error) {
      return { success: false, channel: 'discord', label: 'Discord', message: error?.message || 'Could not share to Discord.' };
    }
  }

  static async shareToMessenger({ imageBlob = null, text = '', filename = 'gamepilot-share.png' }) {
    const normalizedText = normalizeShareText(text);
    if (!normalizedText && !imageBlob) {
      return { success: false, message: 'Nothing to share to Messenger.' };
    }

    const canWriteClipboard = typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.write === 'function';

    if (imageBlob && !canWriteClipboard) {
      return { success: false, message: 'Clipboard image sharing is not supported on this device.' };
    }

    try {
      const items = [];
      if (imageBlob) {
        const file = new File([imageBlob], filename, { type: imageBlob.type || 'image/png' });
        const clipboardItemData = { [file.type]: file };
        if (normalizedText) {
          clipboardItemData['text/plain'] = new Blob([normalizedText], { type: 'text/plain' });
        }
        items.push(new ClipboardItem(clipboardItemData));
      } else if (normalizedText) {
        await LocalShareService.copyTextToClipboard(normalizedText);
      }

      if (items.length > 0) {
        await navigator.clipboard.write(items);
      }

      const url = SHARE_CHANNELS.messenger.buildUrl(normalizedText);
      await openExternalUrl(url);
      return { success: true, channel: 'messenger', label: 'Messenger', url, imageStaged: Boolean(imageBlob) };
    } catch (error) {
      return { success: false, channel: 'messenger', label: 'Messenger', message: error?.message || 'Could not share to Messenger.' };
    }
  }

  static canUseNativeShare() {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  }

  static async shareWithNativeShare({ text, files = [], title = null }) {
    if (!LocalShareService.canUseNativeShare()) {
      return { success: false, message: 'Native sharing is not available on this device.' };
    }

    try {
      const shareTitle = title || text?.split('\n')?.[0] || 'My GamePilot Share';
      const payload = { title: shareTitle, text };
      if (files.length > 0) {
        payload.files = files;
      }
      await navigator.share(payload);
      return { success: true };
    } catch (error) {
      if (error?.name === 'AbortError') {
        return { success: false, message: 'Share cancelled.' };
      }
      return { success: false, message: error?.message || 'Native share failed.' };
    }
  }

  static canCopyImage() {
    return (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.write === 'function'
    );
  }

  static async copyImageToClipboard(blob, filename = 'gamepilot-share.png') {
    if (!blob) {
      return { success: false, message: 'No image provided.' };
    }
    if (!LocalShareService.canCopyImage()) {
      return { success: false, message: 'Clipboard does not support images on this device.' };
    }

    try {
      const file = new File([blob], filename, { type: blob.type || 'image/png' });
      await navigator.clipboard.write([
        new ClipboardItem({ [file.type]: file })
      ]);
      return { success: true };
    } catch (error) {
      return { success: false, message: error?.message || 'Could not copy image to clipboard.' };
    }
  }

  static buildSharePackage(snapshot = {}, selectedYear = new Date().getFullYear()) {
    const text = LocalShareService.buildYearInReviewShareText(snapshot, selectedYear);
    const filename = `gamepilot-year-in-review-${selectedYear}.png`;
    const title = `My GamePilot Year in Review ${selectedYear}`;
    return { text, filename, title };
  }

  static buildSteamHoursShareText(totalMinutes = 0, gameCount = 0, username = 'Gamer') {
    const playtimeLabel = formatPlaytime(totalMinutes);
    const lines = [
      `🎮 ${username}'s Steam Lifetime Hours`,
      ``,
      `⏱️ ${playtimeLabel} across ${gameCount} game${gameCount !== 1 ? 's' : ''}`,
      ``,
      `Tracked with GamePilot — my library, my stats, my machine.`,
      `https://github.com/jonnym69-ai/the-gamepilot/releases`,
      '#GamePilot #SteamHours #GamingStats'
    ];
    return lines.join('\n');
  }

  static buildLibraryValueShareText(libraryValue = {}, username = 'Gamer') {
    const safeValue = libraryValue || {};
    const total = Number(safeValue.totalValue || 0).toFixed(2);
    const steam = Number(safeValue.steamValue || 0).toFixed(2);
    const totalGames = safeValue.totalGames || 0;
    const steamGames = safeValue.steamGames || 0;

    const lines = [
      `💰 ${username}'s Game Library Value`,
      ``,
      `💵 Total value: $${total}`,
      `🎯 ${totalGames} games`,
      `📊 Steam value: $${steam} (${steamGames} games)`,
      ``,
      `Get your own local-first breakdown:`,
      `https://github.com/jonnym69-ai/the-gamepilot/releases`,
      '#GamePilot #LibraryValue #SteamValue'
    ];
    return lines.join('\n');
  }

  static buildLibraryShareText(library = [], username = 'Gamer', period = 'all') {
    const safeLibrary = Array.isArray(library) ? library : [];
    const validPeriod = ['weekly', 'monthly'].includes(period) ? period : 'all';
    const periodLabel = validPeriod === 'weekly' ? 'Weekly' : validPeriod === 'monthly' ? 'Monthly' : 'All-Time';

    let totalMinutes = 0;
    let steamMinutes = 0;
    let mostPlayed = [];
    let sessionCount = 0;
    let gameCount = safeLibrary.length;
    let steamGameCount = 0;

    if (validPeriod !== 'all') {
      try {
        const dashboard = StatsAggregationService.getDashboardData(safeLibrary);
        const snapshot = dashboard?.periods?.[validPeriod];
        const games = snapshot?.topGames || [];
        totalMinutes = snapshot?.playtimeMinutes || 0;
        sessionCount = snapshot?.sessions || 0;
        gameCount = snapshot?.uniqueGames || 0;
        mostPlayed = games.slice(0, 3).filter((game) => game.totalPlaytime > 0);
        const steamGames = games.filter((game) => String(game?.platform).toLowerCase() === 'steam');
        steamMinutes = steamGames.reduce((sum, game) => sum + (game.totalPlaytime || 0), 0);
        steamGameCount = steamGames.length;
      } catch (error) {
        console.warn('Failed to compute period share text, falling back to all-time:', error);
      }
    }

    if (validPeriod === 'all' || totalMinutes === 0) {
      const safeMinutes = (game) => {
        const value = Number(game?.time_played ?? game?.playtime ?? 0);
        return Number.isFinite(value) ? value : 0;
      };
      totalMinutes = safeLibrary.reduce((sum, game) => sum + safeMinutes(game), 0);
      const steamGames = safeLibrary.filter((game) => String(game?.platform || game?.brandPlatform || '').toLowerCase() === 'steam');
      steamMinutes = steamGames.reduce((sum, game) => sum + safeMinutes(game), 0);
      steamGameCount = steamGames.length;
      mostPlayed = [...safeLibrary]
        .sort((left, right) => safeMinutes(right) - safeMinutes(left))
        .slice(0, 3)
        .filter((game) => safeMinutes(game) > 0);
      // Fallback: sum library launch counts for all-time session count
      if (sessionCount === 0) {
        sessionCount = safeLibrary.reduce((sum, game) => sum + (game?.launch_count || game?.sessions || 0), 0);
      }
    }

    const totalPlaytime = formatPlaytime(totalMinutes);
    const steamPlaytime = formatPlaytime(steamMinutes);

    let persona = null;
    let personaRoast = null;
    try {
      persona = GamingPersonaService.getPersona();
      personaRoast = persona?.summaryRoast || persona?.primaryPersona?.roast || null;
    } catch { /* ignore */ }

    const roasts = [
      `${totalPlaytime} across ${gameCount} games and I still can't decide what to play next.`,
      `${sessionCount} sessions. ${gameCount} games. Zero regrets. Okay, maybe some regrets.`,
      `I could've learned a language. Instead, ${totalPlaytime} in games. Worth it.`,
      `My backlog is bigger than some people's Steam accounts. ${totalPlaytime} and counting.`,
      `Steam says ${steamPlaytime}. GamePilot says ${totalPlaytime}. My social life says nothing.`,
    ];
    if (personaRoast) {
      roasts.unshift(personaRoast);
    }

    const roastLine = roasts[Math.floor(Math.random() * roasts.length)];
    const eraTagline = CurrentEraService.getEraTagline();

    const lines = [
      `🎮 ${username}'s ${periodLabel} GamePilot Recap`,
      ``,
      `⏱️ ${totalPlaytime} across ${gameCount} games · ${sessionCount} session${sessionCount !== 1 ? 's' : ''}`,
      `🎯 Steam: ${steamPlaytime} · ${steamGameCount} games`,
      ...(eraTagline ? [``, `🗺️ ${eraTagline}`] : []),
      ``,
      roastLine,
    ];

    if (mostPlayed.length > 0) {
      const topNames = mostPlayed.map((game) => game.name).filter(Boolean).join(', ');
      lines.push(`🏆 Most played: ${topNames}`);
    }

    lines.push('');
    lines.push('Get your own local-first recap:');
    lines.push('https://github.com/jonnym69-ai/the-gamepilot/releases');
    lines.push('#GamePilot #SteamHours #GamingStats');

    return lines.join('\n');
  }

  static buildTopRatedShareText(library = [], username = 'Gamer', selectedGames = null) {
    const safeLibrary = Array.isArray(library) ? library : [];
    const allTopRated = safeLibrary
      .filter((game) => typeof game?.userRating === 'number' && game.userRating >= 10)
      .sort((left, right) => {
        const ratingDiff = (right.userRating || 0) - (left.userRating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        const aTime = Number(left?.time_played ?? left?.playtime ?? left?.totalPlaytime ?? 0);
        const bTime = Number(right?.time_played ?? right?.playtime ?? right?.totalPlaytime ?? 0);
        return bTime - aTime;
      });

    const topRated = Array.isArray(selectedGames) && selectedGames.length > 0
      ? selectedGames.slice(0, 6)
      : allTopRated.slice(0, 6);

    const totalMinutes = topRated.reduce((sum, game) => {
      const value = Number(game?.time_played ?? game?.playtime ?? game?.totalPlaytime ?? 0);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);

    const lines = [
      `🌟 ${username}'s Perfect 10/10 Picks`,
      ``,
      `🏆 ${topRated.length} game${topRated.length !== 1 ? 's' : ''} rated a perfect 10`,
      `⏱️ ${formatPlaytime(totalMinutes)} across these favourites`
    ];

    if (topRated.length > 0) {
      lines.push('');
      topRated.forEach((game, index) => {
        const playtime = formatPlaytime(Number(game?.time_played ?? game?.playtime ?? game?.totalPlaytime ?? 0));
        lines.push(`${index + 1}. ${game.name} · ${playtime}`);
      });
    }

    lines.push('');
    lines.push('Get your own local-first library recap:');
    lines.push('https://github.com/jonnym69-ai/the-gamepilot/releases');
    lines.push('#GamePilot #TopRated #Perfect10');

    return lines.join('\n');
  }

  static buildTopRatedShareCardPackage(library = [], username = 'Gamer', selectedGames = null) {
    const text = LocalShareService.buildTopRatedShareText(library, username, selectedGames);
    const filename = `gamepilot-top-rated-${new Date().toISOString().split('T')[0]}.png`;
    const title = `${username}'s Perfect 10/10 Picks`;
    return { text, filename, title };
  }

  static buildLibraryShareCardPackage(library = [], username = 'Gamer', period = 'all') {
    const validPeriod = ['weekly', 'monthly'].includes(period) ? period : 'all';
    const periodLabel = validPeriod === 'weekly' ? 'Weekly' : validPeriod === 'monthly' ? 'Monthly' : 'Library';
    const text = LocalShareService.buildLibraryShareText(library, username, validPeriod);
    const filename = `gamepilot-${validPeriod}-recap-${new Date().toISOString().split('T')[0]}.png`;
    const title = `${username}'s ${periodLabel} GamePilot Recap`;
    return { text, filename, title };
  }

  static buildMultiGameShareText(games = [], username = 'Gamer') {
    const safeGames = Array.isArray(games) ? games.slice(0, 3).filter(Boolean) : [];
    if (safeGames.length === 0) return '';

    const names = safeGames.map((g) => g.name || 'Unknown').join(' · ');
    const totalMinutes = safeGames.reduce((sum, g) => sum + Number(g?.time_played ?? g?.playtime ?? 0), 0);
    const totalSessions = safeGames.reduce((sum, g) => sum + (g?.launch_count || g?.sessions || 0), 0);
    const playtimeLabel = formatPlaytime(totalMinutes);

    const roasts = [
      `${playtimeLabel} across ${safeGames.length} games and I still want more.`,
      `${safeGames.length} games. ${playtimeLabel}. ${totalSessions} sessions. This is my personality now.`,
      `Currently rotating: ${names}. My free time called, it's not coming back.`,
      `Someone asked what I'm playing. I sent them this. They regret asking.`,
    ];

    const lines = [
      `🎮 ${username}'s GamePilot Picks`,
      ``,
      `⏱️ ${playtimeLabel} · ${totalSessions} session${totalSessions !== 1 ? 's' : ''}`,
      `🎯 ${names}`,
      ``,
      roasts[Math.floor(Math.random() * roasts.length)],
    ];

    lines.push('');
    lines.push('Get your own local-first recap:');
    lines.push('https://github.com/jonnym69-ai/the-gamepilot/releases');
    lines.push('#GamePilot #GamingStats');

    return lines.join('\n');
  }

  static buildMultiGameShareCardPackage(games = [], username = 'Gamer') {
    const text = LocalShareService.buildMultiGameShareText(games, username);
    const filename = `gamepilot-picks-${new Date().toISOString().split('T')[0]}.png`;
    const title = `${username}'s GamePilot Picks`;
    return { text, filename, title };
  }

  static buildIdentityShareText(profile = {}, username = 'Gamer') {
    const safeProfile = profile || {};
    const identity = safeProfile.identity || {};
    const stats = safeProfile.stats || {};
    const displayName = safeProfile.username || username || 'Pilot';

    const gamingPersona = GamingPersonaService.getPersona();
    const primary = gamingPersona?.primaryPersona;
    const identityLabel = primary?.label || identity.personality || 'Uncharted Pilot';
    const description = gamingPersona?.summaryRoast || primary?.roast || identity.description || 'My gaming identity';
    const title = safeProfile.title || 'Newbie';
    const level = safeProfile.level || 1;
    const totalPlaytime = stats.totalPlayTime || 0;
    const dominantGenre = gamingPersona?.signals?.dominantGenre || identity.favoriteGenre || '—';
    const dominantMood = identity.favoriteMood || gamingPersona?.signals?.dominantMood || '—';

    const lines = [
      `${displayName} · GamePilot Player Identity`,
      '',
      `${identityLabel}`,
      `${description}`,
      '',
      `Title: ${title} · Level ${level} · ${formatPlaytime(totalPlaytime)} total playtime`,
      `Top mood: ${dominantMood} · Top genre: ${dominantGenre} · Playstyle: ${identity.playStyle || 'Balanced'}`,
      '',
      'Generated locally by GamePilot.',
      'https://github.com/jonnym69-ai/the-gamepilot/releases',
      '#GamePilot #PlayerIdentity'
    ];

    return lines.join('\n');
  }

  static buildPersonaShareText(persona = {}, username = 'Gamer') {
    const safePersona = persona || {};
    const primary = safePersona.primaryPersona || safePersona;
    const label = primary?.label || safePersona?.label || 'Gamer in Progress';
    const roast = safePersona?.summaryRoast || primary?.roast || '';
    const description = primary?.description || '';
    const evidence = Array.isArray(primary?.evidence) ? primary.evidence : [];
    const subTraits = Array.isArray(safePersona?.subTraits) ? safePersona.subTraits : [];
    const topGames = Array.isArray(safePersona?.topGames) ? safePersona.topGames.slice(0, 3) : [];
    const dominantGenre = safePersona?.signals?.dominantGenre || primary?.basedOnGame || null;
    const confidence = safePersona?.confidence || 'low';
    const displayName = username || 'Pilot';

    const eraTagline = CurrentEraService.getEraTagline();

    const lines = [
      `🎮 ${displayName} · ${label}`,
      ...(eraTagline ? [`Currently in: ${eraTagline}`, ''] : [''])
    ];

    if (roast) {
      lines.push(`"${roast}"`);
      lines.push('');
    }

    if (description) {
      lines.push(description);
      lines.push('');
    }

    if (evidence.length > 0) {
      lines.push(`Evidence: ${evidence.join(' · ')}`);
    }

    if (subTraits.length > 0) {
      const traitLabels = subTraits.map((t) => t.label || t.id).join(', ');
      lines.push(`Traits: ${traitLabels}`);
    }

    if (topGames.length > 0) {
      const gameNames = topGames.map((g) => g.name || g.gameName).filter(Boolean).join(', ');
      if (gameNames) {
        lines.push(`Top games: ${gameNames}`);
      }
    }

    if (dominantGenre) {
      lines.push(`Dominant genre: ${dominantGenre}`);
    }

    lines.push('');
    lines.push(confidence === 'high' ? 'Confidence: High — built from real play history.' : 'Confidence: Still sharpening — play more to refine.');
    lines.push('');
    lines.push('Get your own gaming persona at:');
    lines.push('https://github.com/jonnym69-ai/the-gamepilot/releases');
    lines.push('#GamePilot #GamingPersona');

    return lines.join('\n');
  }

  static buildPersonaShareCardPackage(persona = {}, username = 'Gamer') {
    const text = LocalShareService.buildPersonaShareText(persona, username);
    const filename = `gamepilot-persona-${new Date().toISOString().split('T')[0]}.png`;
    const title = `${username || 'Pilot'}'s GamePilot Persona`;
    return { text, filename, title };
  }

  static buildIdentityShareCardPackage(profile = {}, username = 'Gamer') {
    const text = LocalShareService.buildIdentityShareText(profile, username);
    const filename = `gamepilot-identity-${new Date().toISOString().split('T')[0]}.png`;
    const title = `${profile?.username || username || 'Pilot'}'s GamePilot Identity`;
    return { text, filename, title };
  }

  static buildPeriodStoryShareText(story = {}, period = 'weekly', username = 'Gamer') {
    if (story?.narrative) {
      const periodTitle = period === 'weekly'
        ? "This Week's GamePilot Recap"
        : period === 'monthly'
          ? "This Month's GamePilot Recap"
          : 'GamePilot Recap';
      const lines = [
        `${periodTitle} — ${username || 'Pilot'}`,
        '',
        story.narrative.replace(/\*\*/g, ''),
        '',
        'Generated locally by GamePilot.'
      ];
      return lines.join('\n');
    }
    return RecapStoryService.buildShareText(story, period, username);
  }

  static buildPeriodStoryShareCardPackage(periodSnapshot = {}, period = 'weekly', username = 'Gamer') {
    const text = LocalShareService.buildPeriodStoryShareText(periodSnapshot, period, username);
    const filename = `gamepilot-${period}-story-${new Date().toISOString().split('T')[0]}.png`;
    const title = `${username || 'Pilot'}'s ${period === 'weekly' ? 'Weekly' : 'Monthly'} GamePilot Story`;
    return { text, filename, title };
  }

  static buildIdentityShareDataFromLibrary(library = [], username = 'Gamer') {
    const profile = GamingIdentity.getProfile();
    const evolution = YearInReviewService.getLifetimePersonaEvolution(library);
    return {
      profile,
      evolution,
      text: LocalShareService.buildIdentityShareText(profile, username),
      package: LocalShareService.buildIdentityShareCardPackage(profile, username)
    };
  }
}
