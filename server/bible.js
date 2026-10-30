// File storage inside one story-bible directory. Entry logic lives in public/js/core/.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

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
  resolve(rel, { allowRoot = false } = {}) {
    if (typeof rel !== 'string' || (rel === '' && !allowRoot)) throw new BibleError(400, 'Missing path.');
    const full = path.resolve(this.root, rel);
    if (allowRoot && full === this.root) return full;
    if (!full.startsWith(this.root + path.sep)) throw new BibleError(400, 'Path is outside the bible.');
    if (path.basename(full).startsWith(TMP_PREFIX)) throw new BibleError(400, 'That name is reserved.');
    return full;
  }

  async exists() {
    try {
      return (await fs.stat(this.root)).isDirectory();
    } catch {
      return false;
    }
  }

  // Returns { exists, content, version }.
  async read(rel) {
    try {
      const content = await fs.readFile(this.resolve(rel), 'utf8');
      return { exists: true, content, version: hash(content) };
    } catch (err) {
      if (err.code === 'ENOENT') return { exists: false, content: null, version: null };
      if (err.code === 'EISDIR') throw new BibleError(400, 'That path is a folder.');
      throw err;
    }
  }

  async list(dir) {
    try {
      const entries = await fs.readdir(this.resolve(dir, { allowRoot: true }), { withFileTypes: true });
      return entries
        .filter((e) => !e.name.startsWith(TMP_PREFIX))
        .map((e) => ({ name: e.name, type: e.isDirectory() ? 'dir' : 'file' }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  // Writes to a temp file in the same folder, then renames it over the target.
  async writeAtomic(rel, content) {
    const full = this.resolve(rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    const tmp = path.join(path.dirname(full), TMP_PREFIX + crypto.randomBytes(4).toString('hex'));
    await fs.writeFile(tmp, content, 'utf8');
    try {
      await retryOnWindowsLock(() => fs.rename(tmp, full));
    } catch (err) {
      await fs.rm(tmp, { force: true });
      throw err;
    }
    return hash(content);
  }

  async remove(rel) {
    await retryOnWindowsLock(() => fs.rm(this.resolve(rel)));
  }

  async move(fromRel, toRel) {
    const from = this.resolve(fromRel);
    const to = this.resolve(toRel);
    if ((await this.read(toRel)).exists) throw new BibleError(409, 'A file already exists there.', { current: await this.read(toRel) });
    await fs.mkdir(path.dirname(to), { recursive: true });
    await retryOnWindowsLock(() => fs.rename(from, to));
  }
}

// Windows can refuse a rename or delete briefly while another program has the file open.
async function retryOnWindowsLock(op) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await op();
    } catch (err) {
      if (attempt >= 5 || !['EPERM', 'EBUSY', 'EACCES'].includes(err.code)) throw err;
      await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
    }
  }
}

export class BibleError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}
