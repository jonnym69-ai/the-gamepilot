import { DataExportService } from './DataExportService';
import { openExternalUrl } from './ElectronBridge';

const normalizeShareText = (value) => String(value || '').trim();

const SHARE_CHANNELS = Object.freeze({
  x: {
    label: 'X',
    buildUrl: (text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
  },
  reddit: {
    label: 'Reddit',
    buildUrl: (text) => {
      const title = 'My GamePilot Year in Review';
      return `https://www.reddit.com/submit?title=${encodeURIComponent(title)}&text=${encodeURIComponent(text)}`;
    }
  },
  whatsapp: {
    label: 'WhatsApp',
    buildUrl: (text) => `https://wa.me/?text=${encodeURIComponent(text)}`
  },
  telegram: {
    label: 'Telegram',
    buildUrl: (text) => `https://t.me/share/url?url=&text=${encodeURIComponent(text)}`
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
    const topGame = Array.isArray(snapshot?.topGames) && snapshot.topGames.length > 0
      ? snapshot.topGames[0]
      : null;

    const parts = [
      `GamePilot Year in Review ${selectedYear}`,
      `Playtime: ${Math.max(0, Math.round(Number(summary.playtimeMinutes || 0)))} minutes`,
      `Sessions: ${Math.max(0, Math.round(Number(summary.sessions || 0)))}`,
      `Active days: ${Math.max(0, Math.round(Number(summary.activeDays || 0)))}`,
      `Top game: ${topGame?.name || 'N/A'}`,
      '#GamePilot #LocalFirstGaming'
    ];

    return parts.join('\n');
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
}
