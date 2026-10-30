// Reads and writes files inside one story-bible directory.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import YAML from 'yaml';

export const TMP_PREFIX = '.fl-tmp-';

export function hash(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

export class Bible {
  constructor(projectDir) {
    this.projectDir = projectDir;
    this.root = path.join(projectDir, 'story-bible');
  }

  // Every path the API accepts must resolve inside the bible.
  resolve(rel) {
    if (typeof rel !== 'string' || rel === '') throw new BibleError(400, 'Missing path.');
    const full = path.resolve(this.root, rel);
    if (!full.startsWith(this.root + path.sep)) throw new BibleError(400, 'Path is outside the bible.');
    return full;
  }

  toRel(full) {
    return path.relative(this.root, full).split(path.sep).join('/');
  }

  async exists() {
    try {
      return (await fs.stat(this.root)).isDirectory();
    } catch {
      return false;
    }
  }

  // Returns { raw, hash } or null when the file does not exist.
  async readRaw(rel) {
    try {
      const raw = await fs.readFile(this.resolve(rel), 'utf8');
      return { raw, hash: hash(raw) };
    } catch (err) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  // Writes to a temp file in the same folder, then renames it over the target.
  async writeAtomic(rel, content) {
    const full = this.resolve(rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    const tmp = path.join(path.dirname(full), TMP_PREFIX + crypto.randomBytes(4).toString('hex'));
    await fs.writeFile(tmp, content, 'utf8');
    // Windows can refuse a rename briefly while another program has the file open.
    for (let attempt = 0; ; attempt++) {
      try {
        await fs.rename(tmp, full);
        return hash(content);
      } catch (err) {
        if (attempt >= 5 || !['EPERM', 'EBUSY', 'EACCES'].includes(err.code)) {
          await fs.rm(tmp, { force: true });
          throw err;
        }
        await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
      }
    }
  }

  async readJson(rel) {
    const file = await this.readRaw(rel);
    return file ? JSON.parse(file.raw) : null;
  }

  async writeJson(rel, data) {
    return this.writeAtomic(rel, JSON.stringify(data, null, 2) + '\n');
  }
}

export class BibleError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

// Splits a Markdown file into frontmatter and body. Throws if the YAML is broken.
export function parseEntry(raw) {
  const match = raw.match(FRONTMATTER);
  if (!match) return { frontmatter: {}, body: trimOne(raw.replace(/\r\n/g, '\n')) };
  let frontmatter;
  try {
    frontmatter = YAML.parse(match[1]) ?? {};
  } catch (err) {
    throw new BibleError(422, 'The frontmatter in this file can’t be read. Fix it in an editor, then reload.', {
      detail: err.message,
    });
  }
  const body = raw.slice(match[0].length).replace(/\r\n/g, '\n');
  return { frontmatter, body: trimOne(body) };
}

export function serializeEntry(frontmatter, body) {
  const text = body.replace(/\r\n/g, '\n');
  return `---\n${YAML.stringify(frontmatter)}---\n\n${text}${text && !text.endsWith('\n') ? '\n' : ''}`;
}

// Drops the one blank line after the frontmatter and the final newline,
// so the text area shows only what the writer wrote.
function trimOne(body) {
  return body.replace(/^\n/, '').replace(/\n$/, '');
}
