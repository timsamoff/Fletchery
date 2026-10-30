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

// The file content after the writer changes the body. Starts from the template when the file doesn't exist.
export function withBody(raw, body, template, now = new Date()) {
  const frontmatter = raw === null ? newFrontmatter(template, now) : { ...newFrontmatter(template, now), ...parseEntry(raw).frontmatter };
  frontmatter.updated = now.toISOString();
  if ((frontmatter.status ?? 'empty') === 'empty' && body.trim()) frontmatter.status = 'draft';
  return serializeEntry(frontmatter, body);
}

// Drops the one blank line after the frontmatter and the final newline,
// so the editor shows only what the writer wrote.
function trimOne(body) {
  return body.replace(/^\n/, '').replace(/\n$/, '');
}
