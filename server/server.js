// Local HTTP server: static files, a small JSON API, and server-sent events.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bible, BibleError, hash } from './bible.js';
import { Watcher } from './watch.js';

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(APP_DIR, 'public');
const FONT_DIRS = ['source-sans-3', 'atkinson-hyperlegible', 'literata'].map((name) =>
  path.join(APP_DIR, 'node_modules', '@fontsource', name, 'files'),
);
const ICON = path.join(APP_DIR, 'assets', 'fletchery-icon.svg');
const SECTIONS_DIR = path.join(APP_DIR, 'sections');
// Browser build of the yaml package, mapped to the bare name "yaml" by the page's import map.
const YAML_DIR = path.join(APP_DIR, 'node_modules', 'yaml', 'browser', 'dist');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8',
};

export function createServer(projectDir) {
  const bible = new Bible(projectDir);
  const clients = new Set();
  const watcher = new Watcher(bible, (change) => {
    const payload = `event: change\ndata: ${JSON.stringify(change)}\n\n`;
    for (const res of clients) res.write(payload);
  });
  let port = 0;

  const allowedHosts = () => [`127.0.0.1:${port}`, `localhost:${port}`];

  async function handle(req, res) {
    // Refuse anything not addressed to this server by name (blocks DNS rebinding),
    // and any write that comes from another site's page.
    if (!allowedHosts().includes(req.headers.host)) return send(res, 403, { error: 'Unknown host.' });
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const origin = req.headers.origin;
      if (!origin || !allowedHosts().map((h) => `http://${h}`).includes(origin)) {
        return send(res, 403, { error: 'Writes are accepted only from the Fletchery page.' });
      }
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const route = `${req.method} ${url.pathname}`;

    if (route === 'GET /api/project') return send(res, 200, { projectDir, bibleDir: bible.root });
    if (route === 'GET /api/list') return send(res, 200, { entries: await bible.list(url.searchParams.get('dir') ?? '') });
    if (route === 'GET /api/file') return send(res, 200, await bible.read(url.searchParams.get('path')));
    if (route === 'PUT /api/file') return send(res, 200, await writeFile(await readBody(req)));
    if (route === 'DELETE /api/file') return send(res, 200, await deleteFile(await readBody(req)));
    if (route === 'POST /api/move') return send(res, 200, await moveFile(await readBody(req)));
    if (route === 'GET /api/events') return events(req, res);
    if (req.method === 'GET') return serveStatic(url.pathname, res);
    return send(res, 404, { error: 'Not found.' });
  }

  // Every change names the version the caller last saw. A mismatch returns 409 with what's stored now.
  async function requireVersion(rel, baseVersion) {
    const current = await bible.read(rel);
    if (current.version !== (baseVersion ?? null)) throw new BibleError(409, 'The file changed in storage.', { current });
    return current;
  }

  async function writeFile({ path: rel, content, baseVersion }) {
    if (typeof content !== 'string') throw new BibleError(400, 'Missing content.');
    await requireVersion(rel, baseVersion);
    watcher.expect(rel, hash(content));
    const version = await bible.writeAtomic(rel, content);
    watcher.start();
    return { version };
  }

  async function deleteFile({ path: rel, baseVersion }) {
    await requireVersion(rel, baseVersion);
    watcher.expect(rel, null);
    await bible.remove(rel);
    return {};
  }

  async function moveFile({ from, to, baseVersion }) {
    const current = await requireVersion(from, baseVersion);
    if (!current.exists) throw new BibleError(404, 'There is no file to move.');
    watcher.expect(from, null);
    watcher.expect(to, current.version);
    await bible.move(from, to);
    return { version: current.version };
  }

  function events(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('retry: 2000\n\n');
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => {
      clearInterval(ping);
      clients.delete(res);
    });
  }

  async function serveStatic(pathname, res) {
    let file;
    if (pathname === '/') file = path.join(PUBLIC_DIR, 'index.html');
    else if (pathname === '/icon.svg') file = ICON;
    else if (/^\/sections\/[a-z]+\.json$/.test(pathname)) file = path.join(SECTIONS_DIR, path.basename(pathname));
    else if (pathname.startsWith('/vendor/yaml/')) {
      file = path.resolve(YAML_DIR, '.' + pathname.slice('/vendor/yaml'.length));
      if (!file.startsWith(YAML_DIR + path.sep)) file = null;
    }
    else if (pathname.startsWith('/fonts/')) {
      const name = path.basename(pathname);
      for (const dir of FONT_DIRS) {
        try {
          await fs.access(path.join(dir, name));
          file = path.join(dir, name);
          break;
        } catch {}
      }
    } else {
      file = path.resolve(PUBLIC_DIR, '.' + pathname);
      if (!file.startsWith(PUBLIC_DIR + path.sep)) file = null;
    }
    if (!file) return send(res, 404, { error: 'Not found.' });
    try {
      const data = await fs.readFile(file);
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      res.end(data);
    } catch {
      send(res, 404, { error: 'Not found.' });
    }
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      if (err instanceof BibleError) return send(res, err.status, { error: err.message, ...err.extra });
      console.error(err);
      send(res, 500, { error: 'Something went wrong on the server. The terminal has details.' });
    });
  });

  return {
    async listen(startPort) {
      port = await listenOnFreePort(server, startPort);
      if (await bible.exists()) watcher.start();
      return port;
    },
  };
}

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-cache' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (!String(req.headers['content-type'] ?? '').startsWith('application/json')) {
    throw new BibleError(415, 'Expected JSON.');
  }
  let data = '';
  for await (const chunk of req) {
    data += chunk;
    if (data.length > 5_000_000) throw new BibleError(413, 'Request too large.');
  }
  try {
    return JSON.parse(data || '{}');
  } catch {
    throw new BibleError(400, 'Invalid JSON.');
  }
}

function listenOnFreePort(server, startPort, tries = 50) {
  return new Promise((resolve, reject) => {
    let candidate = startPort;
    const attempt = () => {
      server.once('error', onError);
      server.listen(candidate, '127.0.0.1', () => {
        server.off('error', onError);
        resolve(candidate);
      });
    };
    const onError = (err) => {
      if (err.code === 'EADDRINUSE' && candidate < startPort + tries) {
        candidate++;
        attempt();
      } else reject(err);
    };
    attempt();
  });
}
