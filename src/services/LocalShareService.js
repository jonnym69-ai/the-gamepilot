import { DataExportService } from './DataExportService';
import { openExternalUrl } from './ElectronBridge';

const normalizeShareText = (value) => String(value || '').trim();

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
    buildUrl: (text) => {
      const title = 'My GamePilot Year in Review';
      return `https://www.reddit.com/submit?title=${encodeURIComponent(title)}&text=${encodeURIComponent(text)}`;
    }
  },
  discord: {
    label: 'Discord',
    buildUrl: (text) => `https://discord.com/channels/@me` // Discord has no web share intent; text is copied
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
  email: {
    label: 'Email',
    buildUrl: (text) => {
      const subject = 'My GamePilot Year in Review';
      return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    }
  }
});

export class LocalShareService {
  static getSupportedChannels() {
    return Object.entries(SHARE_CHANNELS).map(([id, config]) => ({
      id,
      label: config.label
    }));
  }

  static buildYearInReviewShareText(snapshot = {}, selectedYear = new Date().getFullYear()) {
    const summary = snapshot?.summary || {};
    const topGames = Array.isArray(snapshot?.topGames) ? snapshot.topGames.slice(0, 3) : [];
    const persona = snapshot?.persona?.identityLabel || 'Player';
    const totalMinutes = Math.max(0, Math.round(Number(summary.playtimeMinutes || 0)));
    const totalHours = Math.round(totalMinutes / 60);
    const playtimeLabel = totalHours > 0 ? `${totalHours} hours` : `${totalMinutes} minutes`;

    const lines = [
      `My GamePilot Year in Review ${selectedYear}`,
      ``,
      `${playtimeLabel} across ${summary.sessions || 0} sessions · ${summary.activeDays || 0} active days`,
      `I played like a ${persona}.`
    ];

    if (topGames.length > 0) {
      const topGameNames = topGames.map((game) => game.name).filter(Boolean).join(', ');
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

  static canUseNativeShare() {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  }

  static async shareWithNativeShare({ text, files = [], title = 'My GamePilot Year in Review' }) {
    if (!LocalShareService.canUseNativeShare()) {
      return { success: false, message: 'Native sharing is not available on this device.' };
    }

    try {
      const payload = { title, text };
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
    const totalHours = Math.max(0, Math.round(Number(totalMinutes) / 60));
    const lines = [
      `🎮 ${username}'s Steam Lifetime Hours`,
      ``,
      `⏱️ ${totalHours.toLocaleString()} hours across ${gameCount} game${gameCount !== 1 ? 's' : ''}`,
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
}
