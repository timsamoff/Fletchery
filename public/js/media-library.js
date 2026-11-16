// The media library: every image in the bible on one page, wherever it's stored, and the picker that puts one
// of them on an entry. Images in media/ belong to no entry. app.js owns the page frame and the image dialog.
import { parseEntry } from './core/entry.js';
import { baseOf, dirOf, LIBRARY_DIR, linkedPaths, listAll } from './core/links.js';
import { isImage, parseSidecar, PORTRAIT_FILE, sidecarPath } from './core/media.js';

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

// ui: { esc, setStatus, riseIn, openImage(image), page() (the element to draw in), isOpen() (the page is showing) }.
export function createMediaLibrary(store, ui) {
  const { esc, setStatus, riseIn } = ui;
  let data = { images: [], folders: [] };
  let filter = '';

  // Reads the whole bible: each image with its sidecar, where it is, and which entries show it.
  // Returns { images: [{ path, name, dir, where, caption, alt, notice, usedBy }], folders: [{ dir, title }] }.
  async function load() {
    const files = await listAll(store);
    const entries = await Promise.all(
      files
        .filter((p) => p.endsWith('.md') && !p.endsWith('.meta.md'))
        .map(async (path) => {
          const { content } = await store.read(path);
          try {
            return { path, title: String(parseEntry(content ?? '').frontmatter.title ?? baseOf(dirOf(path))), links: linkedPaths(content ?? '', path) };
          } catch {
            return { path, title: baseOf(dirOf(path)), links: new Set() };
          }
        }),
    );
    // A folder that holds an entry named after it is that entry's folder, and takes the entry's title.
    const owner = (dir) => entries.find((e) => e.path === `${dir}/${baseOf(dir)}.md`);
    const where = (dir) => (dir === LIBRARY_DIR ? 'the library' : owner(dir) ? `${owner(dir).title}’s folder` : `story-bible/${dir}`);
    const images = await Promise.all(
      files
        .filter((p) => isImage(p) && baseOf(p) !== PORTRAIT_FILE)
        .map(async (path) => {
          let meta;
          try {
            meta = parseSidecar((await store.read(sidecarPath(path))).content);
          } catch {
            meta = parseSidecar(null);
          }
          const dir = dirOf(path);
          const usedBy = entries.filter((e) => e.links.has(path) && e !== owner(dir)).map((e) => e.title);
          return { path, name: baseOf(path), dir, where: where(dir), usedBy, ...meta };
        }),
    );
    const folders = entries.filter((e) => owner(dirOf(e.path)) === e).map((e) => ({ dir: dirOf(e.path), title: e.title }));
    data = { images, folders };
    return data;
  }

  const matches = (img) => !filter || [img.caption, img.name, img.notice, img.where].some((s) => s.toLowerCase().includes(filter));

  function card(img) {
    return `
      <li data-path="${esc(img.path)}"><button type="button" class="character-card image-card" data-path="${esc(img.path)}" aria-label="${esc(img.caption || img.name)}. Open it larger.">
        <img src="${store.mediaUrl(img.path)}" alt="${esc(img.alt)}" loading="lazy" />
        <span class="card-body">
          <span class="card-name">${esc(img.caption || img.name)}</span>
          ${img.notice ? `<span class="card-seed">${esc(img.notice)}</span>` : ''}
        </span>
      </button></li>`;
  }

  // Groups in a fixed order: the library first, then each folder by where it is.
  function groups(images) {
    const byDir = new Map();
    for (const img of images) byDir.set(img.dir, [...(byDir.get(img.dir) ?? []), img]);
    return [...byDir].sort(([a], [b]) => (a === LIBRARY_DIR ? -1 : b === LIBRARY_DIR ? 1 : a.localeCompare(b)));
  }

  function groupsHtml(images) {
    return groups(images)
      .map(([dir, list]) => {
        const title = dir === LIBRARY_DIR ? 'Library' : list[0].where.replace(/^the /, '');
        return `<section class="media-group"><h2>${esc(title)}</h2><ul class="image-grid">${list.map(card).join('')}</ul></section>`;
      })
      .join('');
  }

  // The page at #/media. Draws into the page element app.js gives it.
  async function renderPage() {
    const page = ui.page();
    if (!page.querySelector('.media-page')) page.innerHTML = '<div class="section-main list-page media-page"><h1>Media library</h1><p>Loading…</p></div>';
    try {
      await load();
    } catch (err) {
      return setStatus(`The media library couldn’t be read. ${err.message}`);
    }
    if (!ui.isOpen()) return; // the writer moved on while it loaded
    const refocus = document.activeElement?.id === 'media-filter';
    const shown = data.images.filter(matches);
    const count = data.images.length;
    page.innerHTML = `
      <div class="section-main list-page media-page">
        <div class="section-head">
          <h1>Media library</h1>
        </div>
        <p class="media-intro">Every image in this story bible, wherever it’s stored. Images in the library belong to no entry, and any entry can show them.</p>
        <button type="button" class="image-drop" id="media-drop">
          <span>Drop images here to add them to the library, or click to choose files.</span>
          <span class="hint">JPEG, PNG, WebP, or GIF, up to 25 MB each.</span>
        </button>
        <input type="file" id="media-input" accept="${IMAGE_ACCEPT}" multiple hidden />
        <p class="form-error" id="media-error" role="alert"></p>
        ${
          count
            ? `<div class="field media-filter">
                 <label for="media-filter">Find an image</label>
                 <input type="text" id="media-filter" autocomplete="off" value="${esc(filter)}" />
               </div>
               <p class="hint" id="media-count" role="status"></p>
               <div id="media-groups">${groupsHtml(shown)}</div>`
            : '<p class="empty-note">No images yet. Add some here, or on a character’s Images tab.</p>'
        }
      </div>`;
    page.querySelectorAll('.image-grid li').forEach((li, i) => riseIn(li, { delay: Math.min(i, 12) * 30, fill: 'backwards' }));
    showCount(shown.length);
    if (refocus) page.querySelector('#media-filter')?.focus();

    const drop = page.querySelector('#media-drop');
    const input = page.querySelector('#media-input');
    drop.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      upload(input.files);
      input.value = '';
    });
    const zone = page.querySelector('.media-page');
    zone.addEventListener('dragover', (e) => {
      if (![...e.dataTransfer.types].includes('Files')) return;
      e.preventDefault();
      drop.classList.add('is-dropping');
    });
    zone.addEventListener('dragleave', (e) => {
      if (!zone.contains(e.relatedTarget)) drop.classList.remove('is-dropping');
    });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('is-dropping');
      upload(e.dataTransfer.files);
    });
    zone.addEventListener('click', (e) => {
      const thumb = e.target.closest('.image-card');
      if (thumb) ui.openImage(imageFor(thumb.dataset.path));
    });
    page.querySelector('#media-filter')?.addEventListener('input', (e) => {
      filter = e.target.value.trim().toLowerCase();
      const list = data.images.filter(matches);
      const box = page.querySelector('#media-groups');
      box.innerHTML = groupsHtml(list);
      riseIn(box, { duration: 180 });
      showCount(list.length);
    });
  }

  function showCount(shown) {
    const line = document.getElementById('media-count');
    if (!line) return;
    const total = data.images.length;
    line.textContent = filter ? `${shown} of ${total} ${total === 1 ? 'image' : 'images'}` : `${total} ${total === 1 ? 'image' : 'images'}`;
  }

  // An image as the dialog needs it: where it is, who shows it, and the folders it could move to.
  function imageFor(path) {
    const img = data.images.find((i) => i.path === path);
    const used = img.usedBy.length ? ` Shown on ${img.usedBy.join(', ')}.` : '';
    return { ...img, note: `In ${img.where}.${used}`, targets: data.folders.filter((f) => f.dir !== img.dir) };
  }

  async function upload(files) {
    const images = [...files].filter((f) => IMAGE_ACCEPT.split(',').includes(f.type));
    const error = (text) => {
      setStatus(text);
      const line = document.getElementById('media-error');
      if (line) line.textContent = text;
    };
    if (!images.length) return error('Fletchery takes JPEG, PNG, WebP, and GIF images.');
    let added = 0;
    let problem = '';
    for (const file of images) {
      try {
        await store.upload(LIBRARY_DIR, file.name || `pasted.${file.type.split('/')[1]}`, file);
        added++;
      } catch (err) {
        problem = `Couldn’t add ${file.name}. ${err.message}`;
      }
    }
    if (added) setStatus(added === 1 ? 'Added an image to the library.' : `Added ${added} images to the library.`);
    await renderPage();
    if (problem) error(problem);
  }

  // Opens the picker: every image the entry doesn't already show. onPick(path) gets the chosen one.
  async function openPicker({ exclude, onPick }) {
    const dialog = document.getElementById('picker-dialog');
    const body = document.getElementById('picker-body');
    body.innerHTML = '<p>Loading…</p>';
    dialog.showModal();
    try {
      await load();
    } catch (err) {
      body.innerHTML = `<p class="form-error">${esc(`The images couldn’t be read. ${err.message}`)}</p>`;
      return;
    }
    const images = data.images.filter((img) => !exclude.includes(img.path));
    body.innerHTML = images.length ? groupsHtml(images) : '<p class="empty-note">There are no other images in this story bible yet.</p>';
    body.onclick = (e) => {
      const thumb = e.target.closest('.image-card');
      if (!thumb) return;
      dialog.close();
      onPick(thumb.dataset.path);
    };
    body.querySelector('.image-card')?.focus();
  }

  return { load, renderPage, openPicker, upload };
}
