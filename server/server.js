// Local HTTP server: static files, a small JSON API, and server-sent events.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bible, BibleError, hash, parseEntry, serializeEntry } from './bible.js';
import { Watcher } from './watch.js';

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(APP_DIR, 'public');
const FONT_DIRS = ['source-sans-3', 'atkinson-hyperlegible'].map((name) =>
  path.join(APP_DIR, 'node_modules', '@fontsource', name, 'files'),
);
const ICON = path.join(APP_DIR, 'assets', 'fletcherling-icon.svg');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8',
};

const STORY_TYPES = ['prose', 'screenplay', 'game'];
const SCOPES = ['standalone', 'series'];
const SETTINGS_FILE = 'fletcherling.json';
const PREMISE_FILE = 'premise/premise.md';

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
        return send(res, 403, { error: 'Writes are accepted only from the Fletcherling page.' });
      }
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const route = `${req.method} ${url.pathname}`;

    if (route === 'GET /api/project') return send(res, 200, await project());
    if (route === 'POST /api/setup') return send(res, 200, await setup(await readBody(req)));
    if (route === 'GET /api/entry') return send(res, 200, await getEntry(url.searchParams.get('path')));
    if (route === 'PUT /api/entry') return send(res, 200, await putEntry(await readBody(req)));
    if (route === 'GET /api/events') return events(req, res);
    if (req.method === 'GET') return serveStatic(url.pathname, res);
    return send(res, 404, { error: 'Not found.' });
  }

  async function project() {
    const exists = await bible.exists();
    const settings = exists ? await bible.readJson(SETTINGS_FILE) : null;
    return { projectDir, bibleDir: bible.root, settings };
  }

  async function setup(input) {
    if (await bible.readRaw(SETTINGS_FILE)) throw new BibleError(409, 'This project is already set up.');
    const title = String(input.title ?? '').trim();
    if (!STORY_TYPES.includes(input.storyType)) throw new BibleError(400, 'Choose a story type.');
    if (!SCOPES.includes(input.scope)) throw new BibleError(400, 'Choose standalone or series.');
    if (!title) throw new BibleError(400, 'Enter a working title.');

    const settings = {
      version: 1,
      storyType: input.storyType,
      title,
      scope: input.scope,
      font: 'source-sans-3',
      claudeMdPointer: null,
      createdAt: new Date().toISOString(),
    };
    await bible.writeJson(SETTINGS_FILE, settings);
    if (!(await bible.readRaw(PREMISE_FILE))) {
      const content = serializeEntry(
        {
          title: 'Premise',
          type: 'premise',
          depth: 'seed',
          status: 'empty',
          author: 'writer',
          updated: new Date().toISOString(),
          description: '',
        },
        '',
      );
      watcher.expect(PREMISE_FILE, hash(content));
      await bible.writeAtomic(PREMISE_FILE, content);
    }
    watcher.start();
    return { settings };
  }

  async function getEntry(rel) {
    requireMarkdown(rel);
    const file = await bible.readRaw(rel);
    if (!file) return { path: rel, exists: false, hash: null, frontmatter: {}, body: '' };
    const { frontmatter, body } = parseEntry(file.raw);
    return { path: rel, exists: true, hash: file.hash, frontmatter, body };
  }

  // Saves only if the file on disk is still the version the page loaded.
  async function putEntry(input) {
    const rel = input.path;
    requireMarkdown(rel);
    if (typeof input.body !== 'string') throw new BibleError(400, 'Missing body.');
    const current = await bible.readRaw(rel);
    const currentHash = current ? current.hash : null;
    if (currentHash !== (input.baseHash ?? null)) {
      const disk = current ? { hash: current.hash, ...parseEntry(current.raw) } : { hash: null, frontmatter: {}, body: '' };
      throw new BibleError(409, 'The file changed on disk.', { disk });
    }
    const frontmatter = current ? parseEntry(current.raw).frontmatter : { title: path.basename(rel, '.md') };
    frontmatter.updated = new Date().toISOString();
    if ((frontmatter.status ?? 'empty') === 'empty' && input.body.trim()) frontmatter.status = 'draft';
    const content = serializeEntry(frontmatter, input.body);
    watcher.expect(rel, hash(content));
    const newHash = await bible.writeAtomic(rel, content);
    return { path: rel, hash: newHash, frontmatter };
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

function requireMarkdown(rel) {
  if (typeof rel !== 'string' || !rel.endsWith('.md')) throw new BibleError(400, 'Only Markdown entries can be edited here.');
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
