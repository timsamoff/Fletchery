// Tests for links and image references in public/js/core/links.js. Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEntry } from '../public/js/core/entry.js';
import { freeName, linkedPaths, listAll, moveImage, moveMap, pathToRef, refToPath, rewriteAll, rewriteEntry } from '../public/js/core/links.js';

// A store that keeps files in memory, with the same version rule as the real ones.
class MemoryStore {
  constructor(files) {
    this.files = new Map(Object.entries(files));
  }
  async list(dir = '') {
    const prefix = dir ? `${dir}/` : '';
    const names = new Map();
    for (const path of this.files.keys()) {
      if (!path.startsWith(prefix)) continue;
      const [name, ...more] = path.slice(prefix.length).split('/');
      names.set(name, more.length ? 'dir' : 'file');
    }
    return [...names].map(([name, type]) => ({ name, type }));
  }
  async read(path) {
    const content = this.files.get(path);
    return content === undefined ? { exists: false, content: null, version: null } : { exists: true, content, version: `v:${content}` };
  }
  async write(path, content, baseVersion) {
    if ((await this.read(path)).version !== baseVersion) throw new Error('conflict');
    this.files.set(path, content);
  }
  async move(from, to) {
    this.files.set(to, this.files.get(from));
    this.files.delete(from);
  }
  async moveMedia(from, to) {
    return this.move(from, to);
  }
}

test('references: a bare name is in the entry folder, a path is anywhere else', () => {
  assert.equal(refToPath('forge.jpg', 'characters/ada'), 'characters/ada/forge.jpg');
  assert.equal(refToPath('media/castle.jpg', 'characters/ada'), 'media/castle.jpg');
  assert.equal(pathToRef('characters/ada/forge.jpg', 'characters/ada'), 'forge.jpg');
  assert.equal(pathToRef('media/castle.jpg', 'characters/ada'), 'media/castle.jpg');
});

test('free names count up', () => {
  assert.equal(freeName([], 'a.jpg'), 'a.jpg');
  assert.equal(freeName(['a.jpg', 'a-2.jpg'], 'a.jpg'), 'a-3.jpg');
});

test('a move covers a file, and everything under a folder', () => {
  const map = moveMap([{ from: 'characters/old', to: 'characters/new' }]);
  assert.equal(map('characters/old/a.jpg'), 'characters/new/a.jpg');
  assert.equal(map('characters/older/a.jpg'), 'characters/older/a.jpg');
});

const entry = [
  '---',
  'title: Ada',
  'images:',
  '  - forge.jpg',
  '  - media/castle.jpg',
  'portrait:',
  '  image: forge.jpg',
  '  x: 1',
  'mood: stormy',
  '---',
  '',
  '## Seed',
  '',
  'See ![the forge](forge.jpg "At night") and [the castle](../../media/castle.jpg#east), not [this](https://example.com/forge.jpg).',
  '',
].join('\n');

test('an entry lists what it points to', () => {
  assert.deepEqual([...linkedPaths(entry, 'characters/ada/ada.md')].sort(), ['characters/ada/forge.jpg', 'media/castle.jpg']);
});

test('moving an image out of the entry folder rewrites references and links', () => {
  const next = rewriteEntry(entry, 'characters/ada/ada.md', 'characters/ada/ada.md', moveMap([{ from: 'characters/ada/forge.jpg', to: 'media/forge.jpg' }]));
  const { frontmatter, body } = parseEntry(next);
  assert.deepEqual(frontmatter.images, ['media/forge.jpg', 'media/castle.jpg']);
  assert.equal(frontmatter.portrait.image, 'media/forge.jpg');
  assert.equal(frontmatter.portrait.x, 1);
  assert.equal(frontmatter.mood, 'stormy');
  assert.ok(body.includes('![the forge](../../media/forge.jpg "At night")'));
  assert.ok(body.includes('[the castle](../../media/castle.jpg#east)'));
  assert.ok(body.includes('https://example.com/forge.jpg'));
});

test('moving an image into the entry folder makes its reference a bare name', () => {
  const next = rewriteEntry(entry, 'characters/ada/ada.md', 'characters/ada/ada.md', moveMap([{ from: 'media/castle.jpg', to: 'characters/ada/castle.jpg' }]));
  assert.deepEqual(parseEntry(next).frontmatter.images, ['forge.jpg', 'castle.jpg']);
  assert.ok(next.includes('[the castle](castle.jpg#east)'));
});

test('an entry nothing touches comes back as null, and text outside links is never altered', () => {
  assert.equal(rewriteEntry(entry, 'characters/ada/ada.md', 'characters/ada/ada.md', moveMap([{ from: 'media/other.jpg', to: 'media/x.jpg' }])), null);
  const plain = 'No frontmatter here.\n\n![a](pics/a.jpg)\n\n   Odd   spacing stays.\n';
  const next = rewriteEntry(plain, 'notes/n.md', 'notes/n.md', moveMap([{ from: 'notes/pics/a.jpg', to: 'media/a.jpg' }]));
  assert.equal(next, 'No frontmatter here.\n\n![a](../media/a.jpg)\n\n   Odd   spacing stays.\n');
});

test('a renamed folder rewrites other entries that point into it', () => {
  const other = '---\ntitle: Ben\nimages:\n  - characters/ada/forge.jpg\n---\n\n[Ada](../ada/ada.md)\n';
  const map = moveMap([
    { from: 'characters/ada/ada.md', to: 'characters/ada-smith/ada-smith.md' },
    { from: 'characters/ada', to: 'characters/ada-smith' },
  ]);
  const next = rewriteEntry(other, 'characters/ben/ben.md', 'characters/ben/ben.md', map);
  assert.deepEqual(parseEntry(next).frontmatter.images, ['characters/ada-smith/forge.jpg']);
  assert.ok(next.includes('[Ada](../ada-smith/ada-smith.md)'));
});

test('moving an image moves its sidecar and repairs every entry', async () => {
  const store = new MemoryStore({
    'fletchery.json': '{}',
    'characters/ada/ada.md': entry,
    'characters/ada/forge.jpg': 'IMG',
    'characters/ada/forge.jpg.meta.md': '---\ncaption: The forge\n---\n',
    'characters/ben/ben.md': '---\ntitle: Ben\nimages:\n  - characters/ada/forge.jpg\n---\n',
    'media/forge.jpg': 'OTHER',
    '.fletchery/hidden.md': '![x](../characters/ada/forge.jpg)',
  });
  const result = await moveImage(store, 'characters/ada/forge.jpg', 'media');
  assert.equal(result.to, 'media/forge-2.jpg');
  assert.deepEqual(result.changed.sort(), ['characters/ada/ada.md', 'characters/ben/ben.md']);
  assert.deepEqual(result.failed, []);
  assert.equal(store.files.get('media/forge-2.jpg'), 'IMG');
  assert.ok(store.files.has('media/forge-2.jpg.meta.md'));
  assert.ok(!store.files.has('characters/ada/forge.jpg'));
  assert.deepEqual(parseEntry(store.files.get('characters/ben/ben.md')).frontmatter.images, ['media/forge-2.jpg']);
  assert.ok(!(await listAll(store)).some((p) => p.startsWith('.fletchery')));
});

test('a file that cannot be rewritten is reported, and the rest still are', async () => {
  const store = new MemoryStore({
    'a/a.md': '---\ntitle: [broken\nimages:\n  - media/x.jpg\n---\n',
    'b/b.md': '![x](../media/x.jpg)\n',
  });
  const result = await rewriteAll(store, moveMap([{ from: 'media/x.jpg', to: 'media/y.jpg' }]));
  assert.deepEqual(result, { changed: ['b/b.md'], failed: ['a/a.md'] });
});
