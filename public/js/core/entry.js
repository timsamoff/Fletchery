// Entry files: Markdown with YAML frontmatter. Runs in the browser and in Node.
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

export const FRONTMATTER_FIELDS = ['title', 'type', 'depth', 'status', 'author', 'updated', 'description'];

export class EntryFormatError extends Error {
  constructor(message, detail) {
    super(message);
    this.detail = detail; // the YAML parser's own message, for logs rather than the writer
  }
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

// Splits a file into frontmatter and body. Throws EntryFormatError if the YAML is broken.
export function parseEntry(raw) {
  const match = raw.match(FRONTMATTER);
  if (!match) return { frontmatter: {}, body: trimOne(raw.replace(/\r\n/g, '\n')) };
  let frontmatter;
  try {
    frontmatter = parseYaml(match[1]) ?? {};
  } catch (err) {
    throw new EntryFormatError('The frontmatter in this file can’t be read. Fix it in an editor, then reload.', err.message);
  }
  return { frontmatter, body: trimOne(raw.slice(match[0].length).replace(/\r\n/g, '\n')) };
}

export function serializeEntry(frontmatter, body) {
  const text = body.replace(/\r\n/g, '\n');
  return `---\n${stringifyYaml(frontmatter)}---\n\n${text}${text && !text.endsWith('\n') ? '\n' : ''}`;
}

// A complete frontmatter block for a new entry, with every field present.
export function newFrontmatter({ title, type }, now = new Date()) {
  return {
    title,
    type,
    depth: 'seed',
    status: 'empty',
    author: 'writer',
    updated: now.toISOString(),
    description: '',
  };
}

// The file content after a change. Starts from the template when the file doesn't exist.
// change: { body?, depth?, description?, canon?: true | false, set?: { other fields } }. Returns { content, frontmatter, reverted }.
// Status rules: empty and draft follow the text; canon is the writer's decision, and editing
// the text of a canon entry drops it back to draft (reverted: true).
export function updateEntry(raw, change, template, now = new Date()) {
  const existing = raw === null ? { frontmatter: {}, body: '' } : parseEntry(raw);
  const frontmatter = { ...newFrontmatter(template, now), ...existing.frontmatter };
  frontmatter.status = normalizeStatus(frontmatter.status);
  const body = change.body ?? existing.body;
  const bodyChanged = change.body !== undefined && change.body !== existing.body;
  let reverted = false;

  if (change.depth) frontmatter.depth = change.depth;
  if (change.set) Object.assign(frontmatter, change.set); // other fields, such as a renamed title or a character's silhouette
  if (change.description !== undefined) frontmatter.description = change.description;
  if (change.canon === true) {
    frontmatter.status = 'canon';
    if (frontmatter.author === 'ai-draft') frontmatter.author = 'ai-reviewed';
  } else if (!body.trim()) {
    frontmatter.status = 'empty';
  } else if (change.canon === false || frontmatter.status === 'empty') {
    frontmatter.status = 'draft';
  } else if (frontmatter.status === 'canon' && bodyChanged) {
    frontmatter.status = 'draft';
    reverted = true;
  }
  frontmatter.updated = now.toISOString();
  return { content: serializeEntry(frontmatter, body), frontmatter, reverted };
}

// "settled" was the canon status's name before 2026-10-30. Files written then still read correctly.
export function normalizeStatus(status) {
  return status === 'settled' ? 'canon' : (status ?? 'empty');
}

// Drops the one blank line after the frontmatter and the final newline,
// so the editor shows only what the writer wrote.
function trimOne(body) {
  return body.replace(/^\n/, '').replace(/\n$/, '');
}
