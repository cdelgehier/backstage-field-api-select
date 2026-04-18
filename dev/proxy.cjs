/**
 * Minimal proxy server — replaces the full Backstage backend for the demo.
 * Handles /api/proxy/demo-api/* and forwards to PROXY_TARGET.
 * Uses only Node built-ins; no npm dependencies needed.
 */

const http = require('http');
const https = require('https');

const RAW_TARGET = process.env.PROXY_TARGET || 'https://jsonplaceholder.typicode.com';
const target = new URL(RAW_TARGET);
const isHttps = target.protocol === 'https:';
const lib = isHttps ? https : http;
const PROXY_PREFIX = '/api/proxy/demo-api';
// Equivalent to curl -k: skip TLS verification for internal/self-signed certs.
const tlsOptions = isHttps ? { rejectUnauthorized: false } : {};

// Optional auth header injected into every upstream request.
// Pass at container start: docker run -e PROXY_TOKEN=<token> ...
const PROXY_TOKEN = process.env.PROXY_TOKEN || '';
if (PROXY_TOKEN) console.log('[proxy] PROXY_TOKEN set — injecting Authorization header');

const server = http.createServer((req, res) => {
  // CORS preflight
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', '*');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (!req.url.startsWith(PROXY_PREFIX)) {
    res.writeHead(404);
    res.end('not found');
    return;
  }

  const upstreamPath = req.url.slice(PROXY_PREFIX.length) || '/';
  const options = {
    hostname: target.hostname,
    port: target.port || (isHttps ? 443 : 80),
    path: upstreamPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: target.hostname,
      ...(PROXY_TOKEN ? { authorization: `Bearer ${PROXY_TOKEN}` } : {}),
    },
    ...tlsOptions,
  };

  const proxyReq = lib.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      ...proxyRes.headers,
      'access-control-allow-origin': '*',
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[proxy] error:', err.message);
    res.writeHead(502);
    res.end('bad gateway');
  });

  req.pipe(proxyReq);
});

server.listen(7007, () => {
  console.log(`[proxy] :7007 → ${RAW_TARGET}`);
});
