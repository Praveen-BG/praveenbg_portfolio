import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

function securityHeaders(contentType) {
  return {
    'content-type': contentType,
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'content-security-policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
  };
}

function json(res, status, body) {
  res.writeHead(status, { ...securityHeaders('application/json; charset=utf-8'), 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function makeRateLimiter(maxPerMinute) {
  const buckets = new Map();
  return ip => {
    const now = Date.now();
    const current = buckets.get(ip);
    if (!current || now - current.startedAt >= 60_000) {
      buckets.set(ip, { startedAt: now, count: 1 });
      return true;
    }
    current.count += 1;
    return current.count <= maxPerMinute;
  };
}

export function createPortfolioServer({ config, distDir = path.resolve('dist') }) {
  const allowRequest = makeRateLimiter(config.rateLimitPerMinute);
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const ip = req.socket.remoteAddress || 'unknown';
      if (url.pathname.startsWith('/api/') && !allowRequest(ip)) return json(res, 429, { error: 'Too many requests. Please try again shortly.' });

      if (req.method === 'GET' && url.pathname === '/api/status') {
        return json(res, 200, {
          faq_mode: 'deterministic',
          ai_enabled: false,
          storage_mode: 'disabled',
          storage_configured: false,
          contact: { linkedin: true, email: true, phone: false, resume: true }
        });
      }

      if (req.method === 'POST' && url.pathname.startsWith('/api/chat/')) {
        return json(res, 410, { error: 'Chat recording is disabled.' });
      }

      if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'Not found.' });
      if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: 'Method not allowed.' });

      const requested = url.pathname === '/' ? '/index.html' : url.pathname;
      const decoded = decodeURIComponent(requested);
      const filePath = path.resolve(distDir, `.${decoded}`);
      if (!filePath.startsWith(`${path.resolve(distDir)}${path.sep}`)) return json(res, 403, { error: 'Forbidden.' });
      const file = await fs.readFile(filePath);
      const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, { ...securityHeaders(contentType), 'cache-control': /^(text\/|application\/json)/.test(contentType) ? 'no-cache' : 'public, max-age=3600' });
      if (req.method === 'HEAD') return res.end();
      res.end(file);
    } catch (error) {
      if (error.code === 'ENOENT') return json(res, 404, { error: 'Not found.' });
      const status = error.status || 500;
      if (status >= 500) console.error(`Request failed: ${error.message}`);
      json(res, status, { error: status >= 500 ? 'The service is temporarily unavailable.' : error.message });
    }
  });

  return { server };
}
