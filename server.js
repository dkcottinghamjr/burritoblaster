#!/usr/bin/env node
/**
 * BURRITO BLASTER — server.js
 * A zero-dependency static file server for local development.
 *
 * The game itself needs no build step and no server (you can open
 * index.html directly). This exists purely so `npm run dev` gives you a
 * clean http://localhost URL, which some browsers prefer for features
 * like the Web Audio API and consistent asset loading.
 *
 * No npm install, no network fetch, no auto-open — just Node's built-ins.
 * Run:  npm run dev   (or)   node server.js   (or)   PORT=3000 node server.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const HOST = process.env.HOST || '127.0.0.1';
const START_PORT = parseInt(process.env.PORT || '8080', 10);
const MAX_PORT_TRIES = 10; // if the port is taken, walk upward a few times

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  // Decode + strip query/hash, default to index.html.
  let urlPath;
  try {
    urlPath = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  } catch (_) {
    res.writeHead(400); res.end('Bad request'); return;
  }
  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

  // Resolve inside ROOT and refuse any path that escapes it (traversal guard).
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 — Not found</h1><p>' + urlPath + '</p>');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache', // always serve the latest edit during dev
    });
    fs.createReadStream(filePath)
      .on('error', () => { res.writeHead(500); res.end('Read error'); })
      .pipe(res);
  });
});

// Fires exactly once, when a bind finally succeeds — reads the real port
// so a port-walk (EADDRINUSE fallback) prints the correct URL, not a stale one.
server.on('listening', () => {
  const { port } = server.address();
  console.log('\n  🌯  Burrito Blaster dev server');
  console.log(`      http://${HOST}:${port}/\n`);
  console.log('  Press Ctrl+C to stop.\n');
});

function listen(port, triesLeft) {
  server.once('error', err => {
    if (err.code === 'EADDRINUSE' && triesLeft > 0) {
      console.warn(`Port ${port} in use, trying ${port + 1}...`);
      listen(port + 1, triesLeft - 1);
    } else if (err.code === 'EADDRINUSE') {
      console.error(`Could not find a free port near ${START_PORT}. ` +
        `Set one explicitly:  PORT=3000 npm run dev`);
      process.exit(1);
    } else {
      console.error('Server error:', err.message);
      process.exit(1);
    }
  });
  server.listen(port, HOST);
}

listen(START_PORT, MAX_PORT_TRIES);
