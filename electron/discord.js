/**
 * Discord IPC handlers: Rich Presence + share webhook posts.
 */

const { httpsRequest } = require('./net');
const discordPresence = require('../discordPresence');

// Webhook URLs only — the handler must not become a generic SSRF relay for
// whatever a compromised renderer sends it.
const WEBHOOK_URL_PATTERN =
  /^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]{10,}(?:\?[\w=&%-]*)?$/;
const MAX_FILE_BYTES = 24 * 1024 * 1024; // Discord's free-tier webhook cap is 25MB
const WEBHOOK_TIMEOUT_MS = 30000; // image uploads need longer than the default 8s
const ALLOWED_FILE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'text/plain']);

const buildMultipart = ({ payloadJson, file }) => {
  const boundary = `----GamePilotFormBoundary${Date.now().toString(36)}`;
  const chunks = [
    Buffer.from(
      `--${boundary}\r\n` +
        'Content-Disposition: form-data; name="payload_json"\r\n' +
        'Content-Type: application/json\r\n\r\n' +
        `${payloadJson}\r\n`,
      'utf8'
    ),
  ];
  if (file) {
    const safeName = String(file.filename || 'gamepilot-share.png')
      .replace(/["\\\r\n]/g, '_')
      .slice(0, 100);
    chunks.push(
      Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="files[0]"; filename="${safeName}"\r\n` +
          `Content-Type: ${file.contentType}\r\n\r\n`,
        'utf8'
      ),
      file.buffer,
      Buffer.from('\r\n', 'utf8')
    );
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'));
  return { boundary, body: Buffer.concat(chunks) };
};

function registerIpcHandlers(ipcMain) {
  ipcMain.handle('discord-webhook-post', async (_event, request = {}) => {
    try {
      const url = String(request?.url || '');
      if (!WEBHOOK_URL_PATTERN.test(url)) {
        return { success: false, status: 0, error: 'invalid-webhook-url' };
      }
      const payloadJson = String(request?.body?.payload_json || '');
      if (!payloadJson) {
        return { success: false, status: 0, error: 'missing-payload' };
      }

      let file = null;
      const fileRequest = request?.body?.file;
      if (fileRequest && Array.isArray(fileRequest.data)) {
        const buffer = Buffer.from(fileRequest.data);
        if (buffer.length === 0) {
          return { success: false, status: 0, error: 'empty-file' };
        }
        if (buffer.length > MAX_FILE_BYTES) {
          return { success: false, status: 0, error: 'file-too-large' };
        }
        file = {
          buffer,
          filename: fileRequest.filename,
          contentType: ALLOWED_FILE_TYPES.has(fileRequest.contentType)
            ? fileRequest.contentType
            : 'application/octet-stream',
        };
      }

      const { boundary, body } = buildMultipart({ payloadJson, file });
      const res = await httpsRequest(
        url,
        body,
        {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          Accept: 'application/json',
          'User-Agent': 'GamePilot (local library companion)',
        },
        WEBHOOK_TIMEOUT_MS
      );

      // Discord answers 204 (no wait) or 200 (with message JSON) on success.
      if (res.status === 200 || res.status === 204) {
        return { success: true, status: res.status };
      }
      const detail = typeof res.body === 'string' ? res.body.slice(0, 300).replace(/\s+/g, ' ') : '';
      return { success: false, status: res.status, error: detail || `http-${res.status}` };
    } catch (error) {
      console.warn('[discord] webhook post failed:', error.message);
      return { success: false, status: 0, error: error?.message || 'request-failed' };
    }
  });

  ipcMain.handle('discord-start-game-presence', async (_event, game = {}) => {
    try {
      discordPresence.startGamePresence(game);
      return { success: true };
    } catch (error) {
      return { success: false, message: String(error?.message || error) };
    }
  });

  ipcMain.handle('discord-stop-game-presence', async () => {
    try {
      discordPresence.stopGamePresence();
      return { success: true };
    } catch (error) {
      return { success: false, message: String(error?.message || error) };
    }
  });

  ipcMain.handle('discord-set-idle-presence', async () => {
    try {
      discordPresence.setIdlePresence();
      return { success: true };
    } catch (error) {
      return { success: false, message: String(error?.message || error) };
    }
  });

  ipcMain.handle('discord-disconnect', async () => {
    try {
      discordPresence.disconnect();
      return { success: true };
    } catch (error) {
      return { success: false, message: String(error?.message || error) };
    }
  });
}

module.exports = { registerIpcHandlers, discordPresence };
