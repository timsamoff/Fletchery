// Links between files in the bible: image references in frontmatter, Markdown links in entry text, and the
// rewriting that keeps both working when a file or folder moves. Runs in the browser and in Node.
import { FRONTMATTER, parseEntry, serializeEntry } from './entry.js';
import { sidecarPath } from './media.js';

export const LIBRARY_DIR = 'media'; // images that belong to no entry

export const dirOf = (path) => path.split('/').slice(0, -1).join('/');
export const baseOf = (path) => path.split('/').pop();

// A reference is a bare file name for an image in the entry's folder, or a path from the bible root for one
// anywhere else.
export const refToPath = (ref, entryDir) => (ref.includes('/') ? ref : `${entryDir}/${ref}`);
export const pathToRef = (path, entryDir) => (dirOf(path) === entryDir ? baseOf(path) : path);

// The first name not already taken: photo.jpg, photo-2.jpg, photo-3.jpg.
export function freeName(taken, name) {
  const dot = name.lastIndexOf('.');
  const [stem, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
  let out = name;
  for (let n = 2; taken.includes(out); n++) out = `${stem}-${n}${ext}`;
  return out;
}

// moves: [{ from, to }]. Each covers the path itself and, for a folder, everything under it.
export function moveMap(moves) {
  return (path) => {
    for (const { from, to } of moves) {
      if (path === from) return to;
      if (path.startsWith(`${from}/`)) return to + path.slice(from.length);
    }
    return path;
  };
}

// A link's target as a path from the bible root, or null when it leaves the bible.
function resolve(dir, target) {
  const parts = dir ? dir.split('/') : [];
  for (const seg of target.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg !== '..') parts.push(seg);
    else if (!parts.length) return null;
    else parts.pop();
  }
  return parts.join('/');
}

function relative(fromDir, toPath) {
  const a = fromDir ? fromDir.split('/') : [];
  const b = toPath.split('/');
  let i = 0;
  while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
  return [...a.slice(i).map(() => '..'), ...b.slice(i)].join('/');
}

const decode = (s) => {
  try {
    return decodeURI(s);
  } catch {
    return s;
  }
};

// Markdown links and images: ](target) or ](target "title"). Web addresses, anchors, and site-root paths are left alone.
const LINK = /(\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g;
const isOutside = (target) => /^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith('#') || target.startsWith('/');

// Calls visit(path, target) for each link in the text that points inside the bible, and swaps in whatever it returns.
function eachLink(text, dir, visit) {
  return text.replace(LINK, (whole, open, target, close) => {
    if (isOutside(target)) return whole;
    const [file, ...anchor] = target.split('#');
    const path = resolve(dir, decode(file));
    if (path === null) return whole;
    const next = visit(path, file);
    return next === undefined ? whole : open + [encodeURI(next), ...anchor].join('#') + close;
  });
}

function imageRefs(frontmatter) {
  const refs = Array.isArray(frontmatter.images) ? frontmatter.images.filter((r) => typeof r === 'string') : [];
  if (typeof frontmatter.portrait?.image === 'string') refs.push(frontmatter.portrait.image);
  return refs;
}

// Every path in the bible that an entry points to, from its frontmatter and its text. Throws on broken frontmatter.
export function linkedPaths(raw, entryPath) {
  const { frontmatter, body } = parseEntry(raw);
  const dir = dirOf(entryPath);
  const paths = new Set(imageRefs(frontmatter).map((ref) => refToPath(ref, dir)));
  eachLink(body, dir, (path) => void paths.add(path));
  return paths;
}

// The entry's content after files moved, or null when nothing in it changes. oldPath and newPath are the entry's
// place before and after (the same unless the entry moved too). mapPath gives any path's new place.
export function rewriteEntry(raw, oldPath, newPath, mapPath) {
  const text = raw.replace(/^﻿/, '');
  const oldDir = dirOf(oldPath);
  const newDir = dirOf(newPath);
  const head = text.match(FRONTMATTER)?.[0] ?? '';
  const rest = text.slice(head.length);

  const newRest = eachLink(rest, oldDir, (path, written) => {
    const moved = mapPath(path);
    if (moved === path && newDir === oldDir) return undefined;
    const next = relative(newDir, moved);
    return next === decode(written) ? undefined : next;
  });

  let newHead = head;
  if (head) {
    const { frontmatter } = parseEntry(head);
    const fix = (ref) => pathToRef(mapPath(refToPath(ref, oldDir)), newDir);
    let changed = false;
    if (Array.isArray(frontmatter.images)) {
      const images = frontmatter.images.map((ref) => (typeof ref === 'string' ? fix(ref) : ref));
      changed = images.some((ref, i) => ref !== frontmatter.images[i]);
      frontmatter.images = images;
    }
    if (typeof frontmatter.portrait?.image === 'string' && fix(frontmatter.portrait.image) !== frontmatter.portrait.image) {
      frontmatter.portrait = { ...frontmatter.portrait, image: fix(frontmatter.portrait.image) };
      changed = true;
    }
    // serializeEntry ends with a blank line, which the untouched rest of the file already starts with.
    if (changed) newHead = serializeEntry(frontmatter, '').replace(/\n$/, '');
  }
  return newHead === head && newRest === rest ? null : newHead + newRest;
}

// Every file in the bible, as paths from its root. Folders whose names start with a dot are skipped.
export async function listAll(store, dir = '') {
  const out = [];
  for (const entry of await store.list(dir)) {
    const path = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.type !== 'dir') out.push(path);
    else if (!entry.name.startsWith('.')) out.push(...(await listAll(store, path)));
  }
  return out;
}

// Rewrites every Markdown file whose links or image references a move broke. skip names files to leave alone.
// Returns { changed: [paths], failed: [paths] }, so the caller can tell the writer what it couldn't update.
export async function rewriteAll(store, mapPath, { skip = [] } = {}) {
  const changed = [];
  const failed = [];
  for (const path of (await listAll(store)).filter((p) => p.endsWith('.md') && !skip.includes(p))) {
    try {
      const file = await store.read(path);
      const next = file.exists ? rewriteEntry(file.content, path, path, mapPath) : null;
      if (next === null) continue;
      await store.write(path, next, file.version);
      changed.push(path);
    } catch {
      failed.push(path);
    }
  }
  return { changed, failed };
}

// Moves an image and its sidecar into a folder, under a free name, and repairs every reference to it.
// Returns { to, changed, failed }.
export async function moveImage(store, from, toDir) {
  const taken = (await store.list(toDir)).map((e) => e.name);
  const to = `${toDir}/${freeName(taken, baseOf(from))}`;
  await store.moveMedia(from, to);
  const side = await store.read(sidecarPath(from));
  if (side.exists) await store.move(sidecarPath(from), sidecarPath(to), side.version);
  return { to, ...(await rewriteAll(store, moveMap([{ from, to }]))) };
}
