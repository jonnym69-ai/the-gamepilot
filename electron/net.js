const electron = require('electron');

/**
 * Shared HTTPS request helper using Electron's Chromium network stack.
 * Used by HLTB, PCGW, Steam, and wishlist bridges to avoid CORS and
 * Node TLS fingerprint blocking.
 */
const httpsRequest = (url, body = null, headers = {}) =>
  new Promise((resolve, reject) => {
    let req;
    try {
      req = electron.net.request({ method: body ? 'POST' : 'GET', url });
    } catch (err) {
      return reject(err);
    }

    const chunks = [];
    req.on('response', (res) => {
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode, headers: res.headers, body: data });
      });
      res.on('error', (err) => reject(err));
    });
    req.on('error', (err) => reject(err));

    const timer = setTimeout(() => {
      try {
        req.abort();
      } catch {}
      reject(new Error('httpsRequest timeout'));
    }, 8000);
    req.on('close', () => clearTimeout(timer));

    if (headers) {
      Object.entries(headers).forEach(([k, v]) => req.setHeader(k, v));
    }

    if (body) req.write(body);
    req.end();
  });

module.exports = { httpsRequest };
