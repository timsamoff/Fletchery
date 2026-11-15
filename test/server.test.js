// Tests for the file store in server/, against a throwaway project in the OS temp folder. Run with: npm test
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createServer } from '../server/server.js';

let project;
let port;
let origin;

before(async () => {
  project = await fs.mkdtemp(path.join(os.tmpdir(), 'fletchery-test-'));
  await fs.mkdir(path.join(project, 'story-bible'));
  port = await createServer(project).listen(3400);
  origin = `http://127.0.0.1:${port}`;
});

after(async () => {
  await fs.rm(project, { recursive: true, force: true });
  setImmediate(() => process.exit()); // the server and its watcher have no stop method yet
});

const api = (method, url, body, headers = {}) =>
  fetch(origin + url, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(method === 'GET' ? {} : { Origin: origin }), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
const put = (file, content, baseVersion) => api('PUT', '/api/file', { path: file, content, baseVersion });
const onDisk = (file) => fs.readFile(path.join(project, 'story-bible', file), 'utf8');

test('a write needs the version the caller last saw', async () => {
  const first = await put('a.md', 'one', null);
  assert.equal(first.status, 200);
  const { version } = await first.json();

  const stale = await put('a.md', 'two', null);
  assert.equal(stale.status, 409);
  assert.equal((await stale.json()).current.content, 'one');

  assert.equal((await put('a.md', 'two', version)).status, 200);
  assert.equal(await onDisk('a.md'), 'two');
});

test('an outside edit makes the next write a conflict', async () => {
  const { version } = await (await put('b.md', 'mine', null)).json();
  await fs.writeFile(path.join(project, 'story-bible', 'b.md'), 'theirs');
  const res = await put('b.md', 'mine again', version);
  assert.equal(res.status, 409);
  assert.equal(await onDisk('b.md'), 'theirs');
});

test('delete and move check the version too', async () => {
  const { version } = await (await put('c.md', 'text', null)).json();
  assert.equal((await api('DELETE', '/api/file', { path: 'c.md', baseVersion: 'wrong' })).status, 409);
  assert.equal((await api('POST', '/api/move', { from: 'c.md', to: 'a.md', baseVersion: version })).status, 409);
  assert.equal((await api('POST', '/api/move', { from: 'c.md', to: 'd/c.md', baseVersion: version })).status, 200);
  assert.equal(await onDisk('d/c.md'), 'text');
});

test('paths outside the bible are refused', async () => {
  for (const bad of ['../outside.md', 'a/../../outside.md', path.join(project, 'outside.md'), '']) {
    assert.equal((await put(bad, 'x', null)).status, 400, bad);
    assert.equal((await fetch(`${origin}/api/file?path=${encodeURIComponent(bad)}`)).status, 400, bad);
  }
  await assert.rejects(fs.access(path.join(project, 'outside.md')));
});

test('writes from another site, and requests to another host name, are refused', async () => {
  assert.equal((await api('PUT', '/api/file', { path: 'x.md', content: 'x', baseVersion: null }, { Origin: 'http://evil.example' })).status, 403);
  const noOrigin = await fetch(`${origin}/api/file`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(noOrigin.status, 403);
  const status = await new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: '/api/project', headers: { Host: 'evil.example' } }, (res) => resolve(res.statusCode)).on('error', reject);
  });
  assert.equal(status, 403);
});

test('a character split across two network chunks is stored whole', async () => {
  const text = 'It’s here.';
  const body = Buffer.from(JSON.stringify({ path: 'split.md', content: text, baseVersion: null }), 'utf8');
  const cut = body.indexOf(Buffer.from('’', 'utf8')) + 1; // inside the three-byte apostrophe
  const status = await new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: '/api/file', method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: origin, 'Content-Length': body.length } },
      (res) => res.resume().on('end', () => resolve(res.statusCode)),
    );
    req.on('error', reject);
    req.setNoDelay(true);
    req.write(body.subarray(0, cut));
    setTimeout(() => req.end(body.subarray(cut)), 150);
  });
  assert.equal(status, 200);
  assert.equal(await onDisk('split.md'), text);
});

test('images: only known types, no overwrite, and unchanged ones are not sent twice', async () => {
  const upload = (name, query = '') =>
    fetch(`${origin}/api/upload?dir=pics&name=${encodeURIComponent(name)}${query}`, { method: 'POST', headers: { Origin: origin }, body: Buffer.from([1, 2, 3]) });
  assert.equal((await upload('drawing.svg')).status, 415);
  assert.equal((await (await upload('My Photo.PNG')).json()).path, 'pics/my-photo.png');
  assert.equal((await (await upload('My Photo.PNG')).json()).path, 'pics/my-photo-2.png');
  assert.equal((await (await upload('My Photo.PNG', '&replace=1')).json()).path, 'pics/my-photo.png');

  const first = await fetch(`${origin}/api/media?path=pics/my-photo.png`);
  assert.equal(first.status, 200);
  assert.equal(first.headers.get('content-type'), 'image/png');
  const again = await fetch(`${origin}/api/media?path=pics/my-photo.png`, { headers: { 'If-None-Match': first.headers.get('etag') } });
  assert.equal(again.status, 304);
  assert.equal((await fetch(`${origin}/api/media?path=a.md`)).status, 400);
});
