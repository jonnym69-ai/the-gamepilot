jest.mock('electron', () => ({}));
jest.mock('../../electron/net', () => ({ httpsRequest: jest.fn() }));
jest.mock('../../discordPresence', () => ({
  startGamePresence: jest.fn(),
  stopGamePresence: jest.fn(),
  setIdlePresence: jest.fn(),
  disconnect: jest.fn(),
}));

const { httpsRequest } = require('../../electron/net');
const { registerIpcHandlers } = require('../../electron/discord');

const webhookUrl = 'https://discord.com/api/webhooks/1234567890/AbCdEfGhIj_-KlMn';
let handler;

beforeEach(() => {
  httpsRequest.mockReset();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  registerIpcHandlers({
    handle: (name, fn) => {
      if (name === 'discord-webhook-post') handler = fn;
    },
  });
});

afterEach(() => jest.restoreAllMocks());

test('posts text payload to a valid webhook URL', async () => {
  httpsRequest.mockResolvedValue({ status: 204, headers: {}, body: '' });

  const result = await handler(null, {
    url: webhookUrl,
    body: { payload_json: JSON.stringify({ content: 'hello' }) },
  });
  expect(result).toEqual({ success: true, status: 204 });

  const [url, body, headers] = httpsRequest.mock.calls[0];
  expect(url).toBe(webhookUrl);
  expect(headers['Content-Type']).toMatch(/^multipart\/form-data; boundary=/);
  expect(headers).not.toHaveProperty('Content-Length');
  const text = body.toString('latin1');
  expect(text).toContain('name="payload_json"');
  expect(text).toContain('{"content":"hello"}');
});

test('posts image file bytes inside the multipart body', async () => {
  httpsRequest.mockResolvedValue({ status: 200, headers: {}, body: '{}' });

  const fileBytes = [137, 80, 78, 71, 13, 10, 26, 10, 99];
  const result = await handler(null, {
    url: webhookUrl,
    body: {
      payload_json: JSON.stringify({ content: 'card' }),
      file: { data: fileBytes, filename: 'share.png', contentType: 'image/png' },
    },
  });
  expect(result).toEqual({ success: true, status: 200 });

  const [, body, headers] = httpsRequest.mock.calls[0];
  expect(headers).not.toHaveProperty('Content-Length');
  expect(body.includes(Buffer.from(fileBytes))).toBe(true);
  const text = body.toString('latin1');
  expect(text).toContain('name="files[0]"; filename="share.png"');
  expect(text).toContain('Content-Type: image/png');
});

test.each([
  '',
  'http://discord.com/api/webhooks/1/x',
  'https://evil.com/api/webhooks/1/x',
  'https://discord.com/api/webhooks/abc/short',
])('rejects invalid webhook URL %p without a request', async (url) => {
  const result = await handler(null, { url, body: { payload_json: '{}' } });
  expect(result).toEqual({ success: false, status: 0, error: 'invalid-webhook-url' });
  expect(httpsRequest).not.toHaveBeenCalled();
});

test('surfaces Discord and network failures', async () => {
  httpsRequest.mockResolvedValueOnce({ status: 400, headers: {}, body: '{"message": "Invalid Webhook Token"}' });
  const denied = await handler(null, { url: webhookUrl, body: { payload_json: '{}' } });
  expect(denied.success).toBe(false);
  expect(denied.status).toBe(400);

  httpsRequest.mockRejectedValueOnce(new Error('net::ERR_INVALID_ARGUMENT'));
  const failed = await handler(null, { url: webhookUrl, body: { payload_json: '{}' } });
  expect(failed.success).toBe(false);
  expect(failed.status).toBe(0);
  expect(failed.error).toBe('net::ERR_INVALID_ARGUMENT');
});
