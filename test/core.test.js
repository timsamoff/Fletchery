// Tests for the shared core in public/js/core/. Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEntry, serializeEntry, updateEntry, normalizeStatus, FRONTMATTER_FIELDS } from '../public/js/core/entry.js';
import { parseLayers, serializeLayers, deepestFilled } from '../public/js/core/layers.js';
import { parseSidecar, updateSidecar, isImage, sidecarPath } from '../public/js/core/media.js';

const fields = [
  { id: 'age', label: 'Age' },
  { id: 'role', label: 'Role' },
];
const template = { title: 'Premise', type: 'premise' };
const roundTrip = (body, f = fields) => serializeLayers(parseLayers(body, f), f);

// ---------- layers ----------

test('a body with no layer headings is the Seed', () => {
  assert.equal(parseLayers('TBA', fields).seed, 'TBA');
  assert.equal(parseLayers('Line one.\n\n## My notes\n\nMore.', fields).seed, 'Line one.\n\n## My notes\n\nMore.');
});

test('layers round trip, and empty ones are left out', () => {
  const layers = { preamble: '', seed: 'One line.', sketch: '', sheet: { age: '', role: 'Smith.' }, sheetExtra: '', extra: '' };
  const md = serializeLayers(layers, fields);
  assert.equal(md, '## Seed\n\nOne line.\n\n## Sheet\n\n### Role\n\nSmith.');
  assert.equal(roundTrip(md), md);
  assert.equal(deepestFilled(parseLayers(md, fields)), 'sheet');
  assert.equal(deepestFilled(parseLayers('x', fields)), 'seed');
});

test('layer headings match in any case', () => {
  assert.equal(parseLayers('## seed\n\nlower', fields).seed, 'lower');
});

test('a heading the writer types stays in the box it was typed in', () => {
  const seed = 'First line.\n\n## My notes\n\nSecond part.';
  const md = serializeLayers({ preamble: '', seed, sketch: 'A paragraph.', sheet: {}, sheetExtra: '', extra: '' }, []);
  const back = parseLayers(md, []);
  assert.equal(back.seed, seed);
  assert.equal(back.sketch, 'A paragraph.');
  assert.equal(back.extra, '');
});

test('an unknown ### heading stays in its field', () => {
  const sheet = { age: 'Forty.\n\n### As a child\n\nSmall.', role: 'Smith.' };
  const md = serializeLayers({ preamble: '', seed: 's', sketch: '', sheet, sheetExtra: '', extra: '' }, fields);
  assert.deepEqual(parseLayers(md, fields).sheet, sheet);
});

test('a repeated field heading keeps both parts', () => {
  const body = '## Seed\n\nA seed.\n\n## Sheet\n\n### Age\n\nForty.\n\n### Role\n\nSmith.\n\n### Age\n\nSee above.';
  const { sheet } = parseLayers(body, fields);
  assert.equal(sheet.age, 'Forty.\n\nSee above.');
  assert.equal(sheet.role, 'Smith.');
});

test('a repeated layer heading keeps both parts', () => {
  assert.equal(parseLayers('## Seed\n\nOne.\n\n## Sketch\n\nS.\n\n## Seed\n\nTwo.', fields).seed, 'One.\n\nTwo.');
});

test('no text is dropped from a hand-written file', () => {
  const body = 'Intro note.\n\n## Seed\n\nS\n\n## Sheet\n\nLoose line.\n\n### Writer aside\n\nkeep me\n\n### Age\n\n40\n\n## Research\n\nlinks here';
  const out = roundTrip(body);
  for (const piece of ['Intro note.', 'Loose line.', '### Writer aside', 'keep me', '40', '## Research', 'links here']) {
    assert.ok(out.includes(piece), `kept: ${piece}`);
  }
  assert.equal(roundTrip(out), out);
});

test('a Sheet with no fields is one box', () => {
  const layers = parseLayers('## Seed\n\ns\n\n## Sheet\n\nA page.\n\n### A heading of mine\n\nMore.', []);
  assert.equal(layers.sheetExtra, 'A page.\n\n### A heading of mine\n\nMore.');
});

// ---------- entries ----------

test('a new entry has every frontmatter field', () => {
  const { frontmatter } = updateEntry(null, { body: '' }, template);
  for (const field of FRONTMATTER_FIELDS) assert.ok(field in frontmatter, field);
  assert.equal(frontmatter.status, 'empty');
});

test('status follows the text, and only the writer makes canon', () => {
  let r = updateEntry(null, { body: 'text' }, template);
  assert.equal(r.frontmatter.status, 'draft');
  r = updateEntry(r.content, { canon: true }, template);
  assert.equal(r.frontmatter.status, 'canon');
  r = updateEntry(r.content, { body: 'text' }, template);
  assert.equal(r.frontmatter.status, 'canon');
  assert.equal(r.reverted, false);
  r = updateEntry(r.content, { body: 'text edited' }, template);
  assert.equal(r.frontmatter.status, 'draft');
  assert.equal(r.reverted, true);
  r = updateEntry(r.content, { body: '' }, template);
  assert.equal(r.frontmatter.status, 'empty');
});

test('marking an AI draft as canon records the review', () => {
  const raw = serializeEntry({ title: 'X', author: 'ai-draft', status: 'draft' }, 'text');
  assert.equal(updateEntry(raw, { canon: true }, template).frontmatter.author, 'ai-reviewed');
});

test('settled reads as canon', () => {
  assert.equal(normalizeStatus('settled'), 'canon');
  assert.equal(normalizeStatus(undefined), 'empty');
});

test('unknown frontmatter keys survive a save', () => {
  const raw = '---\ntitle: Ada\nmood: stormy\nportrait:\n  image: a.jpg\n  x: 1\n---\n\nBody.\n';
  const { frontmatter, content } = updateEntry(raw, { body: 'Body two.' }, template);
  assert.equal(frontmatter.mood, 'stormy');
  assert.deepEqual(parseEntry(content).frontmatter.portrait, { image: 'a.jpg', x: 1 });
  assert.equal(parseEntry(content).body, 'Body two.');
});

test('a byte order mark does not hide the frontmatter', () => {
  const raw = '﻿---\ntitle: Ada\nstatus: canon\n---\n\n## Seed\n\nText.\n';
  assert.equal(parseEntry(raw).frontmatter.title, 'Ada');
  const { content, frontmatter } = updateEntry(raw, {}, template);
  assert.equal(frontmatter.status, 'canon');
  assert.equal(content.match(/^---$/gm).length, 2);
});

test('Windows line endings parse the same', () => {
  const { frontmatter, body } = parseEntry('---\r\ntitle: Ada\r\n---\r\n\r\nOne.\r\nTwo.\r\n');
  assert.equal(frontmatter.title, 'Ada');
  assert.equal(body, 'One.\nTwo.');
});

test('broken frontmatter throws a readable error', () => {
  assert.throws(() => parseEntry('---\ntitle: [unclosed\n---\n\nBody.\n'), /frontmatter/);
});

// ---------- image sidecars ----------

test('a sidecar keeps other keys and other text', () => {
  const raw = '---\ncaption: Old\nalt: ""\nsource: a museum\n---\n\nA note of mine.\n\n## What to notice\n\nThe hands.\n\n## Credits\n\nSomeone.\n';
  assert.deepEqual(parseSidecar(raw), { caption: 'Old', alt: '', notice: 'The hands.' });
  const next = updateSidecar(raw, { caption: 'New', alt: 'A portrait', notice: 'The eyes.' });
  assert.deepEqual(parseSidecar(next), { caption: 'New', alt: 'A portrait', notice: 'The eyes.' });
  for (const piece of ['source: a museum', 'A note of mine.', '## Credits', 'Someone.']) assert.ok(next.includes(piece), piece);
});

test('a missing sidecar reads as empty', () => {
  assert.deepEqual(parseSidecar(null), { caption: '', alt: '', notice: '' });
  assert.deepEqual(parseSidecar(updateSidecar(null, { caption: 'C', alt: '', notice: '' })), { caption: 'C', alt: '', notice: '' });
});

test('image names', () => {
  assert.ok(isImage('Photo.JPG'));
  assert.ok(!isImage('drawing.svg'));
  assert.equal(sidecarPath('characters/ada/a.png'), 'characters/ada/a.png.meta.md');
});
