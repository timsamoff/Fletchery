// Watches the bible directory and reports files whose content actually changed.
import fs from 'node:fs';
import path from 'node:path';
import { hash, TMP_PREFIX } from './bible.js';

const DEBOUNCE_MS = 150;

export class Watcher {
  constructor(bible, onChange) {
    this.bible = bible;
    this.onChange = onChange;
    this.known = new Map(); // rel path -> last hash seen or written (null = deleted)
    this.timers = new Map();
    this.fsWatcher = null;
  }

  start() {
    if (this.fsWatcher) return;
    this.fsWatcher = fs.watch(this.bible.root, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      const rel = filename.split(path.sep).join('/');
      if (path.basename(rel).startsWith(TMP_PREFIX)) return;
      clearTimeout(this.timers.get(rel));
      this.timers.set(rel, setTimeout(() => this.check(rel), DEBOUNCE_MS));
    });
    this.fsWatcher.on('error', (err) => console.error('Watcher error:', err.message));
  }

  // Called before the server writes a file, so its own write isn't reported back.
  expect(rel, contentHash) {
    this.known.set(rel, contentHash);
  }

  async check(rel) {
    this.timers.delete(rel);
    const full = path.join(this.bible.root, rel);
    let current = null;
    try {
      const stat = await fs.promises.stat(full);
      if (stat.isDirectory()) return;
      current = hash(await fs.promises.readFile(full, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') return;
    }
    if (this.known.has(rel) && this.known.get(rel) === current) return;
    this.known.set(rel, current);
    this.onChange({ path: rel, hash: current, deleted: current === null });
  }
}
