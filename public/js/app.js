// First-run setup, section navigation, and the section editor, with live sync and conflict handling.
import { normalizeStatus, parseEntry, updateEntry } from './core/entry.js';
import { DEPTHS, deepestFilled, parseLayers, serializeLayers } from './core/layers.js';
import { isImage, parseSidecar, PORTRAIT_FILE, PORTRAIT_SIZE, sidecarPath, updateSidecar } from './core/media.js';
import { LocalServerStore, StoreConflict } from './core/store.js';
import { Settings, SETTINGS_FILE, setupSettingsPanel } from './settings.js';

const store = new LocalServerStore();
const SETTINGS_PATH = 'fletchery.json';
const LEGACY_SETTINGS_PATH = 'fletcherling.json'; // the app's name before 2026-10-30
const SAVE_DELAY_MS = 500;
const WIDE = window.matchMedia('(min-width: 960px)');
// Shown in an empty box: no depth has to be filled, and going deeper never replaces what's above it.
const PLACEHOLDERS = {
  seed: 'One sentence is enough. You can go deeper later.',
  sketch: 'Optional. Your Seed stays as it is; this builds on it.',
  sheet: 'Optional. Your Seed and Sketch stay as they are; this builds on them.',
};
const STATUS = {
  empty: { shape: '○', word: 'Empty' },
  draft: { shape: '◐', word: 'Draft' },
  canon: { shape: '●', word: 'Canon' },
};

const view = document.getElementById('view');
const statusEl = document.getElementById('save-status');
const main = document.getElementById('main');

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const timeNow = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// The footer live region is what screen readers hear; the copy by the editor is for sighted writers on tall pages.
function setStatus(text) {
  statusEl.textContent = text;
  const local = document.getElementById('local-status');
  if (local) local.textContent = text;
}

// A stored file plus its parsed entry. Throws EntryFormatError for broken frontmatter.
function toEntry(file) {
  const parsed = file.exists ? parseEntry(file.content) : { frontmatter: {}, body: '' };
  return { ...file, ...parsed };
}

function showProblem(heading, message) {
  view.innerHTML = `<h1>${esc(heading)}</h1><p>${esc(message)}</p>`;
}

// The writer's settings (fletchery-settings.json). "settings" elsewhere in this file is the bible's own
// fletchery.json.
const prefs = new Settings(store, {
  onSaved: () => setStatus('Settings saved.'),
  onError: (err) => setStatus(`Settings problem: ${err.message}.`),
});

// ---------- Start ----------

async function start() {
  try {
    const info = await store.info();
    document.getElementById('project-path').textContent = info.projectDir;
    const file = await readSettingsFile();
    let settings = null;
    if (file.exists) {
      try {
        settings = JSON.parse(file.content);
      } catch {
        return showProblem('The settings file can’t be read', 'story-bible/fletchery.json isn’t valid JSON. Fix it in an editor, then reload this page.');
      }
    }
    await prefs.load(settings?.font);
    prefs.onChange(applyPrefs);
    setupGridToggle();
    setupSettingsPanel(prefs);
    if (!settings) return showSetup();
    showEditor(settings, file.version);
  } catch (err) {
    showProblem('Fletchery couldn’t start', err.message);
  }
}

// Applies the writer's settings to the page. Runs on load and after every change.
function applyPrefs(v) {
  const root = document.documentElement;
  root.dataset.font = v.interfaceFont;
  root.dataset.writingFont = v.writingFont;
  if (v.fade.scope === 'full') root.dataset.fadeScope = 'full';
  else delete root.dataset.fadeScope;
  if (!v.fade.on) fadeChrome(false);
  root.classList.toggle('show-grid', v.layout.grid);
  document.getElementById('grid-toggle').setAttribute('aria-pressed', String(v.layout.grid));
  if (document.getElementById('entry-meta')) renderStatus(); // the credited name in "Written by"
}

// Bibles made before the rename have fletcherling.json. Move it to fletchery.json, unchanged, on first open.
async function readSettingsFile() {
  const file = await store.read(SETTINGS_PATH);
  if (file.exists) return file;
  const legacy = await store.read(LEGACY_SETTINGS_PATH);
  if (!legacy.exists) return file;
  const version = await store.write(SETTINGS_PATH, legacy.content, null);
  await store.delete(LEGACY_SETTINGS_PATH, legacy.version);
  setStatus('Renamed story-bible/fletcherling.json to fletchery.json.');
  return { exists: true, content: legacy.content, version };
}

function applySettings(settings) {
  document.getElementById('project-title').textContent = settings.title;
  document.title = `${settings.title} · Fletchery`;
}

function setupGridToggle() {
  document.getElementById('grid-toggle').addEventListener('click', () => prefs.update({ layout: { grid: !prefs.values.layout.grid } }));
}

async function loadSectionSet(storyType) {
  const res = await fetch(`/sections/${encodeURIComponent(storyType)}.json`);
  if (!res.ok) throw new Error(`The section list for “${storyType}” is missing.`);
  return res.json();
}

// ---------- First run ----------

function showSetup() {
  view.innerHTML = `
    <h1>Set up this story bible</h1>
    <p>Fletchery keeps the bible in a <code>story-bible</code> folder in this project. These questions are asked once.</p>
    <form id="setup" novalidate>
      <fieldset>
        <legend>What type of story are you writing?</legend>
        ${choice('storyType', 'prose', 'Prose fiction', 'Novel, novella, short story, or series')}
        ${choice('storyType', 'screenplay', 'Screenplay', 'Feature, short, or television')}
        ${choice('storyType', 'game', 'Game narrative', 'Story, quests, and dialogue for a game')}
      </fieldset>
      <div class="field">
        <label for="title">Working title</label>
        <input type="text" id="title" name="title" autocomplete="off" />
      </div>
      <fieldset>
        <legend>Is it a standalone or a series?</legend>
        <div class="choices-inline">
          ${choice('scope', 'standalone', 'Standalone')}
          ${choice('scope', 'series', 'Series')}
        </div>
      </fieldset>
      <p class="form-error" id="setup-error" role="alert"></p>
      <div class="button-row">
        <button type="submit" class="button">Create the bible</button>
      </div>
    </form>`;

  const form = document.getElementById('setup');
  const error = document.getElementById('setup-error');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fd = new FormData(form);
    const input = { storyType: fd.get('storyType'), title: String(fd.get('title') ?? '').trim(), scope: fd.get('scope') };
    const missing = !input.storyType
      ? ['Choose a story type.', form.querySelector('[name=storyType]')]
      : !input.title
        ? ['Enter a working title.', form.querySelector('#title')]
        : !input.scope
          ? ['Choose standalone or series.', form.querySelector('[name=scope]')]
          : null;
    if (missing) {
      error.textContent = missing[0];
      missing[1].focus();
      return;
    }
    const settings = {
      version: 1,
      storyType: input.storyType,
      title: input.title,
      scope: input.scope,
      claudeMdPointer: null,
      sections: {},
      createdAt: new Date().toISOString(),
    };
    let settingsVersion;
    try {
      settingsVersion = await store.write(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n', null);
    } catch (err) {
      error.textContent = err instanceof StoreConflict ? 'This project is already set up. Reload the page.' : err.message;
      return;
    }
    setStatus('Bible created.');
    showEditor(settings, settingsVersion);
    main.focus();
  });
}

function choice(name, value, label, hint) {
  const id = `${name}-${value}`;
  return `
    <div class="choice">
      <input type="radio" id="${id}" name="${name}" value="${value}"${hint ? ` aria-describedby="${id}-hint"` : ''} />
      <label for="${id}">${esc(label)}</label>
      ${hint ? `<span class="hint" id="${id}-hint">${esc(hint)}</span>` : ''}
    </div>`;
}

// ---------- Section editor ----------

const state = {
  settings: null,
  settingsVersion: null,
  sectionSet: null,
  section: null, // the built section being shown
  page: null, // 'entry' (the editor) or 'list' (a section's cards, such as Characters)
  entry: null, // { path, slug } of the entry being edited
  characters: [], // [{ slug, title, status, description, silhouette }] for the sidebar and the cards
  statusCache: {}, // section id -> status word, for single-entry sections shown in the sidebar
  layers: null, // { seed, sketch, sheet: { id: text }, ... }
  depth: 'seed', // the depth being worked on (a page choice; frontmatter depth follows the text)
  mode: 'interview', // 'interview' or 'full'; the last one used is kept in the writer's settings
  step: 0, // current question or Sheet part in Interview mode
  navCollapsed: false, // wide screens only: the section list folded to a strip of status shapes
  contextOpen: false, // shallower depths shown above the question
  focusOpen: false, // the question and fields are in the Focus sheet
  baseVersion: null, // stored version the editor is based on
  baseContent: null, // that version's full file content, frontmatter included
  savedBody: '', // body as last loaded or saved, normalized
  frontmatter: {},
  saving: false,
  timer: null,
  remotePending: false,
  conflict: null, // { disk, confirming }
};

// A Sheet with its own questions is one box, like Seed and Sketch. Otherwise each field is a ### part.
const sheetFields = () => (state.section.depths.sheet.questions ? [] : state.section.depths.sheet.fields);
const composedBody = () => serializeLayers(state.layers, sheetFields());
const isDirty = () => composedBody() !== state.savedBody;
const entryPath = () => state.entry.path;
const template = () => ({ title: state.frontmatter.title ?? state.section.title, type: state.section.id });
const visibleSections = () => state.sectionSet.sections.filter((s) => !s.onlyFor || s.onlyFor === state.settings.scope);
const entryFile = (section, slug) => `${section.folder}/${slug}/${slug}.md`;
const statusOf = () => STATUS[normalizeStatus(state.frontmatter.status)] ?? STATUS.empty;
const skipped = () => Boolean(state.settings.sections?.[state.section.id]?.skipped);

async function showEditor(settings, settingsVersion) {
  applySettings(settings);
  state.settings = settings;
  state.settingsVersion = settingsVersion;
  try {
    state.sectionSet = await loadSectionSet(settings.storyType);
  } catch (err) {
    return showProblem('The sections couldn’t be loaded', err.message);
  }

  // The frame (sidebar and Focus sheet) is built once; each page renders into #page from the address.
  document.body.classList.add('editor-view');
  view.innerHTML = `
    <div class="workspace" id="workspace">
      <nav class="section-nav" aria-label="Sections">
        <div class="nav-head">
          <p class="nav-label" aria-hidden="true">Story bible</p>
          <button type="button" class="button button-quiet nav-toggle" id="nav-toggle" aria-controls="nav-details">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M9 4v16"></path><path class="nav-toggle-chevron" d="M15 10l-2 2 2 2"></path></svg>
          </button>
        </div>
        <details id="nav-details" class="nav-full"${WIDE.matches ? ' open' : ''}>
          <summary>Sections</summary>
          <div id="nav-lists"></div>
        </details>
        <ol class="nav-rail" id="nav-rail"></ol>
      </nav>
      <div class="section-page" id="page"></div>
    </div>
    <dialog class="focus-dialog" id="focus-dialog">
      <div class="focus-slot" id="focus-slot"></div>
    </dialog>
    <dialog class="name-dialog" id="name-dialog" aria-labelledby="name-dialog-title">
      <form method="dialog" id="name-form">
        <h2 id="name-dialog-title"></h2>
        <div class="field">
          <label for="name-input">Name</label>
          <input type="text" id="name-input" autocomplete="off" required />
        </div>
        <p class="form-error" id="name-error" role="alert"></p>
        <div class="button-row">
          <button type="submit" class="button" id="name-submit"></button>
          <button type="button" class="button button-quiet" id="name-cancel">Cancel</button>
        </div>
      </form>
    </dialog>
    <dialog class="image-dialog" id="image-dialog" aria-label="Image">
      <img class="image-dialog-preview" id="image-preview" alt="" />
      <div class="image-dialog-fields">
        <div class="field">
          <label for="image-caption">Caption</label>
          <input type="text" id="image-caption" autocomplete="off" />
        </div>
        <div class="field">
          <label for="image-alt">Alt text</label>
          <input type="text" id="image-alt" autocomplete="off" aria-describedby="image-alt-hint" />
          <p class="hint" id="image-alt-hint">What the image shows, for someone who can’t see it.</p>
        </div>
        <div class="field">
          <label for="image-notice">What to notice</label>
          <textarea id="image-notice" rows="3"></textarea>
        </div>
        <div class="image-actions">
          <button type="button" class="button button-quiet" id="image-duplicate">Duplicate</button>
          <button type="button" class="button button-quiet" id="image-use-portrait">Use as portrait</button>
          <button type="button" class="button button-quiet" id="image-remove" aria-label="Remove">
            <span class="label-swap"><span>Remove</span><span>Remove it from the folder?</span></span>
          </button>
        </div>
      </div>
      <button type="button" class="button image-done" id="image-done">Done</button>
    </dialog>
    <dialog class="crop-dialog" id="crop-dialog" aria-labelledby="crop-title">
      <h2 id="crop-title">Choose the part to use</h2>
      <div class="crop-stage" id="crop-stage" aria-describedby="crop-help">
        <img id="crop-image" alt="" draggable="false" />
      </div>
      <p class="hint" id="crop-help">Drag to move the image. Zoom with the slider or the scroll wheel.</p>
      <div class="field">
        <label for="crop-zoom">Zoom</label>
        <input type="range" id="crop-zoom" min="1" max="4" step="0.01" value="1" />
      </div>
      <div class="button-row">
        <button type="button" class="button" id="crop-save">Use this</button>
        <button type="button" class="button button-quiet" id="crop-cancel">Cancel</button>
      </div>
    </dialog>`;

  WIDE.addEventListener('change', (e) => {
    if (e.matches) document.getElementById('nav-details').open = true;
  });
  state.mode = prefs.values.layout.questionMode;
  setNavOpen(!prefs.values.layout.sectionsFolded, false);
  document.getElementById('nav-toggle').addEventListener('click', () => setNavOpen(state.navCollapsed));
  setupFocus();
  setupNameDialog();
  setupImageDialog();
  setupCropDialog();
  document.addEventListener('paste', onImagePaste);

  await Promise.all([loadCharacters(), loadSingleStatuses()]);
  listen();
  window.addEventListener('hashchange', route);
  await route();
}

// ---------- Pages and addresses ----------
// #/premise, #/characters, #/characters/<slug>. An unknown or unbuilt section opens the first built one.

async function route() {
  const [sectionId, slug] = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const first = visibleSections().find((s) => s.built);
  const section = visibleSections().find((s) => s.id === sectionId && s.built);
  if (!section) {
    history.replaceState(null, '', `#/${first.id}`);
    return route();
  }
  if (state.page === 'entry' && state.conflict) return; // the conflict panel stays until it's resolved
  if (state.page === 'entry' && isDirty()) await save();
  if (state.focusOpen) closeFocus();

  state.section = section;
  if (section.many && !slug) return renderListPage();
  const known = !section.many || state.characters.some((c) => c.slug === slug);
  if (!known) {
    history.replaceState(null, '', `#/${section.id}`);
    return renderListPage();
  }
  await openEntry(section.many ? entryFile(section, slug) : section.file, slug ?? null);
}

async function openEntry(path, slug) {
  const section = state.section;
  state.page = 'entry';
  state.entry = { path, slug };
  state.step = 0;
  state.view = 'text';
  state.contextOpen = false;
  state.frontmatter = {};
  const page = document.getElementById('page');
  page.innerHTML = `
    <div class="section-main">
      ${section.many ? `<a class="crumb" href="#/${section.id}">${esc(section.title)}</a>` : ''}
      <div class="section-head">
        ${
          section.many
            ? `<button type="button" class="portrait-button" id="portrait" popovertarget="portrait-menu">
                 <span class="portrait-face"></span>
                 <span class="portrait-badge" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg></span>
               </button>
               <div class="portrait-menu" id="portrait-menu" popover></div>`
            : ''
        }
        <div class="title-group">
          <h1 id="section-title"></h1>
          ${
            section.many
              ? `<button type="button" class="rename-button" id="rename" aria-label="Rename" title="Rename">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>
                 </button>`
              : ''
          }
        </div>
        <div class="depth-steps" id="depth-steps" role="group" aria-label="Depth"></div>
        <p class="status-badge" id="status-badge"></p>
        <button type="button" class="button button-quiet focus-open" id="focus-open">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"></path></svg>
          Focus
        </button>
      </div>
      <div id="conflict-slot"></div>
      <div id="work-home"><div id="work"></div></div>
      ${hasImages(section) ? '<div class="images-home" id="images-home" hidden></div>' : ''}
      <div class="button-row section-actions">
        <button type="button" class="button button-quiet" id="canon"></button>
        ${section.many ? '' : '<button type="button" class="button button-soft" id="skip">Skip for now</button>'}
        <button type="button" class="button button-quiet" id="ask-ai" disabled aria-describedby="ask-ai-note">Ask AI</button>
        <p class="local-status" id="local-status" aria-hidden="true"></p>
        <button type="button" class="button" id="next-depth"></button>
      </div>
    </div>
    <p class="hint" id="ask-ai-note">Ask AI turns on once you choose an AI in Settings, in a later version.</p>
    <dl class="entry-meta" id="entry-meta"></dl>
    <p class="hint file-note">Saved to <code>story-bible/${esc(path)}</code> as you type. Changes made to that file in another editor appear here.</p>`;

  document.getElementById('next-depth').addEventListener('click', goForward);
  document.getElementById('focus-open').addEventListener('click', openFocus);
  document.getElementById('canon').addEventListener('click', toggleCanon);
  document.getElementById('skip')?.addEventListener('click', skipSection);
  document.getElementById('rename')?.addEventListener('click', () => openNameDialog('rename'));
  setupPortraitMenu();

  try {
    load(toEntry(await store.read(path)), { firstLoad: true });
  } catch (err) {
    if (err.detail) console.error(`${path}: ${err.detail}`);
    setStatus(err.message);
    page.querySelectorAll('textarea, button, input').forEach((el) => (el.disabled = true));
  }
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

// The forward button: the next depth, or from the Sheet the next section.
function goForward() {
  const next = DEPTHS[DEPTHS.indexOf(state.depth) + 1];
  if (next) return setDepth(next, true);
  const sections = visibleSections();
  const after = sections[sections.findIndex((s) => s.id === state.section.id) + 1];
  if (after?.built) location.hash = `#/${after.id}`;
}

// ---------- Characters ----------

async function loadCharacters() {
  const section = state.sectionSet.sections.find((s) => s.id === 'characters' && s.built);
  if (!section) return;
  const folders = (await store.list(section.folder)).filter((e) => e.type === 'dir');
  const read = await Promise.all(
    folders.map(async ({ name: slug }) => {
      const file = await store.read(entryFile(section, slug));
      if (!file.exists) return null;
      try {
        const { frontmatter } = parseEntry(file.content);
        return {
          slug,
          title: frontmatter.title || slug,
          status: normalizeStatus(frontmatter.status),
          description: frontmatter.description ?? '',
          silhouette: frontmatter.silhouette ?? 'neutral',
          photo: frontmatter.portrait ? store.mediaUrl(`${section.folder}/${slug}/${PORTRAIT_FILE}`, frontmatter.updated) : '',
        };
      } catch {
        return { slug, title: slug, status: 'empty', description: '', silhouette: 'neutral' };
      }
    }),
  );
  // The writer's order, kept in fletchery.json, comes first; characters not in it follow alphabetically.
  const order = state.settings.order?.characters ?? [];
  const rank = (c) => (order.includes(c.slug) ? order.indexOf(c.slug) : order.length);
  state.characters = read.filter(Boolean).sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
}

// Statuses for single-entry sections, so the sidebar can show them from any page.
async function loadSingleStatuses() {
  for (const s of visibleSections().filter((s) => s.built && !s.many)) {
    try {
      const file = await store.read(s.file);
      state.statusCache[s.id] = file.exists ? normalizeStatus(parseEntry(file.content).frontmatter.status) : 'empty';
    } catch {
      state.statusCache[s.id] = 'empty';
    }
  }
}

// Head-and-shoulders placeholders for characters with no photo yet. Each is a head, hair, and shoulders in one fill,
// so a style has to show in the outline. Labels are for screen readers; the menu shows only the drawings.
const HEAD = '<circle cx="52" cy="40" r="15"/>';
const WIDE_HEAD = '<ellipse cx="52" cy="41" rx="17" ry="16"/>';
const SHOULDERS = 'M24 100c0-19 12-30 28-30s28 11 28 30z';
const BROAD = 'M20 100c0-20 14-32 32-32s32 12 32 32z';
const NEUTRAL_HAIR = 'M38 34c0-9 7-15 14-15s14 6 14 15c0 3-1 5-2 7-2-6-6-9-12-9s-10 3-12 9c-1-2-2-4-2-7z';
const MALE_HAIR = 'M38 32c0-8 6-13 14-13s14 5 14 13c0 2 0 4-1 5-2-4-6-6-13-6s-11 2-13 6c-1-1-1-3-1-5z';
const widen = (d) => `<g transform="translate(52 41) scale(1.13 1.07) translate(-52 -40)"><path d="${d}"/></g>`;
const SILHOUETTES = {
  neutral: { label: 'Neutral', head: HEAD, hair: `<path d="${NEUTRAL_HAIR}"/>`, body: SHOULDERS },
  female: {
    label: 'Female',
    head: HEAD,
    hair: '<path d="M33 46c-2-16 6-27 19-27s21 11 19 27c-1 6-3 11-6 14l-2-14c-2-7-6-10-11-10s-9 3-11 10l-2 14c-3-3-5-8-6-14z"/>',
    body: SHOULDERS,
  },
  male: { label: 'Male', head: HEAD, hair: `<path d="${MALE_HAIR}"/>`, body: BROAD },
  'long-hair': {
    label: 'Long hair',
    head: HEAD,
    hair: '<path d="M35 40c0-14 7-22 17-22s17 8 17 22c0 12 3 23 8 32l-4 6H31l-4-6c5-9 8-20 8-32z"/>',
    body: SHOULDERS,
  },
  combed: {
    label: 'Combed hair',
    head: HEAD,
    hair: '<path d="M36 38c-2-10 0-20 7-24 2 2 3 5 3 8 4-6 12-8 17-5 5 3 7 8 6 15-6-4-14-6-21-4-6 2-9 5-12 10z"/>',
    body: BROAD,
  },
  afro: { label: 'Afro', head: '<circle cx="52" cy="46" r="14"/>', hair: '<circle cx="52" cy="29" r="23"/>', body: SHOULDERS },
  heavyset: { label: 'Heavyset', head: WIDE_HEAD, hair: widen(NEUTRAL_HAIR), body: 'M10 100c0-22 17-34 42-34s42 12 42 34z' },
  'heavyset-male': { label: 'Heavyset male', head: WIDE_HEAD, hair: widen(MALE_HAIR), body: 'M8 100c0-23 18-35 44-35s44 12 44 35z' },
  'heavyset-female': {
    label: 'Heavyset female',
    head: WIDE_HEAD,
    hair: '<path d="M32 47c-2-17 6-28 20-28s22 11 20 28c-1 6-3 10-6 13l-2-13c-2-7-6-10-12-10s-10 3-12 10l-2 13c-3-3-5-7-6-13z"/>',
    body: 'M10 100c0-22 17-34 42-34s42 12 42 34z',
  },
  'heavyset-bald': { label: 'Heavyset, bald', head: WIDE_HEAD, hair: '', body: 'M8 100c0-23 18-35 44-35s44 12 44 35z' },
};

function silhouetteSvg(kind) {
  const s = SILHOUETTES[kind] ?? SILHOUETTES.neutral;
  return `<svg viewBox="0 0 104 100" aria-hidden="true" class="silhouette">${s.head}${s.hair}<path d="${s.body}"/></svg>`;
}

function renderListPage() {
  const section = state.section;
  state.page = 'list';
  state.entry = null;
  const cards = state.characters
    .map(
      (c) => `
      <li data-slug="${esc(c.slug)}">
        <a class="character-card" href="#/${section.id}/${encodeURIComponent(c.slug)}" aria-describedby="reorder-help">
          <span class="card-portrait${c.photo ? ' has-photo' : ''}">${c.photo ? `<img src="${c.photo}" alt="" />` : silhouetteSvg(c.silhouette)}</span>
          <span class="card-body">
            <span class="card-name">${esc(c.title)}</span>
            ${c.description ? `<span class="card-seed">${esc(c.description)}</span>` : ''}
            <span class="card-status"><span aria-hidden="true">${STATUS[c.status]?.shape ?? '○'}</span> ${STATUS[c.status]?.word ?? 'Empty'}</span>
          </span>
        </a>
      </li>`,
    )
    .join('');
  document.getElementById('page').innerHTML = `
    <div class="section-main list-page">
      <div class="section-head">
        <h1>${esc(section.title)}</h1>
        <button type="button" class="button add-button" id="add-entry">Add a character</button>
      </div>
      ${
        cards
          ? `<ul class="card-grid" id="card-grid">${cards}</ul>
             <p class="visually-hidden" id="reorder-help">Drag to reorder, or press Alt with an arrow key.</p>`
          : '<p class="empty-note">No characters yet. Add the first one, and start with a single sentence.</p>'
      }
      <div class="button-row section-actions">
        <button type="button" class="button button-soft" id="skip">Skip for now</button>
      </div>
    </div>`;
  setupCardReorder(document.getElementById('card-grid'), {
    attr: 'slug',
    current: () => state.characters.map((c) => c.slug),
    save: saveCharacterOrder,
    label: (slug) => state.characters.find((c) => c.slug === slug)?.title ?? '',
  });
  document.getElementById('add-entry').addEventListener('click', () => openNameDialog('add'));
  document.getElementById('skip').addEventListener('click', skipSection);
  renderNav();
  main.focus({ preventScroll: true });
}

// ---------- Reordering the cards ----------
// Drag a card, or press Alt with an arrow key on it. The other cards slide aside, and the order is saved:
// characters in fletchery.json, a character's images in its own frontmatter.

// Moves elements with a FLIP animation: note where each item was, make the change, then glide each one from its
// old spot to its new one.
function flip(list, change, exclude = null, easing = undefined) {
  const items = [...list.children].filter((el) => el !== exclude);
  const before = new Map(items.map((el) => [el, el.getBoundingClientRect()]));
  change();
  items.forEach((el, i) => {
    const a = before.get(el);
    const b = el.getBoundingClientRect();
    const dx = a.left - b.left;
    const dy = a.top - b.top;
    if (dx || dy) animate(el, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 240, delay: Math.min(i, 6) * 12, ...(easing ? { easing } : {}) });
  });
}

const cardOrder = (grid, attr) => [...grid.children].map((li) => li.dataset[attr]).filter(Boolean);

// Dragging is drawn by hand rather than with the browser's drag and drop, which always shows a faint ghost copy.
// The real card lifts, follows the pointer with a little lag, tilts with the drag's direction and speed, and
// springs into its slot. The gap it leaves is plain space that the other cards flow around.
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)'; // a small overshoot
const LIFT = 1.03;
const DRAG_START_PX = 6;
const TOUCH_HOLD_MS = 250; // on touch screens, press and hold to pick a card up, so a swipe still scrolls

// options: attr names the data attribute holding each card's key; current() gives the saved order;
// save(order, message) stores a new one; label(key) names a card for the screen reader message.
const reorderListeners = {}; // one set of window listeners per kind of card, replaced each time the cards are redrawn

function setupCardReorder(grid, { attr, current, save, label }) {
  reorderListeners[attr]?.abort();
  if (!grid) return;
  const listeners = new AbortController();
  reorderListeners[attr] = listeners;
  const { signal } = listeners;
  let press = null; // { li, x, y, pointerId, timer, touch }
  let drag = null; // the card being dragged and its motion
  let suppressClick = false;

  const cards = () => [...grid.children].filter((el) => el !== drag?.li); // the cards, and the slot while dragging

  grid.addEventListener('pointerdown', (e) => {
    const card = e.target.closest('.character-card');
    if (!card || e.button !== 0 || drag) return;
    press = { li: card.closest('li'), x: e.clientX, y: e.clientY, pointerId: e.pointerId, touch: e.pointerType === 'touch' };
    if (press.touch) press.timer = setTimeout(() => press && beginDrag(press.x, press.y), TOUCH_HOLD_MS);
  });
  window.addEventListener('pointermove', (e) => {
    if (drag) return drag.ending || moveDrag(e);
    if (!press || e.pointerId !== press.pointerId) return;
    const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y) > DRAG_START_PX;
    if (!moved) return;
    if (press.touch) {
      clearTimeout(press.timer); // a swipe before the hold ends is a scroll
      press = null;
      return;
    }
    beginDrag(e.clientX, e.clientY);
    moveDrag(e);
  }, { signal });
  window.addEventListener('pointerup', () => {
    if (press?.timer) clearTimeout(press.timer);
    press = null;
    if (drag && !drag.ending) endDrag(false);
  }, { signal });
  window.addEventListener('pointercancel', () => {
    press = null;
    if (drag && !drag.ending) endDrag(true);
  }, { signal });
  // While a touch drag is under way, the page mustn't scroll.
  grid.addEventListener('touchmove', (e) => drag && e.preventDefault(), { passive: false });
  window.addEventListener('keydown', (e) => {
    if (drag && !drag.ending && e.key === 'Escape') endDrag(true);
  }, { signal });
  // A drag ends with a click on the card; it shouldn't open the character.
  grid.addEventListener(
    'click',
    (e) => {
      if (!suppressClick) return;
      e.preventDefault();
      e.stopPropagation();
      suppressClick = false;
    },
    true,
  );
  grid.addEventListener('dragstart', (e) => e.preventDefault()); // links are natively draggable

  function beginDrag(x, y) {
    const li = press.li;
    press = null;
    const r = li.getBoundingClientRect();
    const slot = document.createElement('li');
    slot.className = 'card-slot';
    slot.style.height = `${r.height}px`;
    grid.insertBefore(slot, li);
    const reduced = reducedMotion.matches;
    drag = { li, slot, startIndex: cards().indexOf(slot), offsetX: x - r.left, offsetY: y - r.top, x: r.left, y: r.top, tx: r.left, ty: r.top, tilt: 0, reduced, raf: 0, px: x, py: y };
    Object.assign(li.style, { position: 'fixed', left: '0', top: '0', width: `${r.width}px`, height: `${r.height}px`, zIndex: '20', pointerEvents: 'none' });
    li.classList.add('is-lifted');
    suppressClick = true;
    step();
  }

  function moveDrag(e) {
    drag.px = e.clientX;
    drag.py = e.clientY;
    drag.tx = e.clientX - drag.offsetX;
    drag.ty = e.clientY - drag.offsetY;
    // Make room: the slot moves before or after whichever card the pointer is over, by which half it's on.
    const over = cards().find((el) => {
      if (el === drag.slot) return false;
      const r = el.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    });
    if (!over) return;
    const r = over.getBoundingClientRect();
    const target = e.clientX > r.left + r.width / 2 ? over.nextElementSibling : over;
    if (target === drag.slot || target === drag.slot.nextElementSibling) return;
    flip(grid, () => grid.insertBefore(drag.slot, target), drag.li);
  }

  // Each frame the card eases toward the pointer, and its tilt follows its sideways speed.
  function step() {
    if (!drag) return;
    const ease = drag.reduced ? 1 : 0.3;
    const lastX = drag.x;
    drag.x += (drag.tx - drag.x) * ease;
    drag.y += (drag.ty - drag.y) * ease;
    const lean = drag.reduced ? 0 : Math.max(-8, Math.min(8, (drag.x - lastX) * 0.6));
    drag.tilt += (lean - drag.tilt) * 0.2;
    drag.li.style.transform = `translate(${drag.x}px, ${drag.y}px) rotate(${drag.tilt}deg) scale(${drag.reduced ? 1 : LIFT})`;
    // Near the window's top or bottom edge, the page scrolls along.
    const edge = 64;
    if (drag.py < edge) window.scrollBy(0, -8);
    else if (drag.py > window.innerHeight - edge) window.scrollBy(0, 8);
    drag.raf = requestAnimationFrame(step);
  }

  // Once a drag is ending, its spring runs to the end; later releases or keys don't start it again.
  function endDrag(cancelled) {
    drag.ending = true;
    const { li, slot, startIndex } = drag;
    cancelAnimationFrame(drag.raf);
    if (cancelled) {
      // Spring back to where it started.
      const others = cards().filter((el) => el !== slot);
      flip(grid, () => grid.insertBefore(slot, others[startIndex] ?? null), li);
    }
    const to = slot.getBoundingClientRect();
    const from = li.style.transform;
    const settle = () => {
      li.removeAttribute('style');
      li.classList.remove('is-lifted');
      grid.insertBefore(li, slot);
      slot.remove();
      drag = null;
      setTimeout(() => (suppressClick = false), 0);
      const order = cardOrder(grid, attr);
      if (!cancelled && order.join() !== current().join()) save(order);
    };
    if (drag.reduced) return settle();
    const anim = li.animate([{ transform: from }, { transform: `translate(${to.left}px, ${to.top}px) rotate(0deg) scale(1)` }], {
      duration: 320,
      easing: SPRING,
      fill: 'forwards',
    });
    li.classList.remove('is-lifted');
    anim.onfinish = () => {
      anim.cancel();
      settle();
    };
  }

  grid.addEventListener('keydown', (e) => {
    if (!e.altKey || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const li = e.target.closest('li');
    if (!li) return;
    e.preventDefault();
    const back = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
    if (back && !li.previousElementSibling) return;
    if (!back && !li.nextElementSibling) return;
    const target = back ? li.previousElementSibling : li.nextElementSibling.nextElementSibling;
    flip(grid, () => grid.insertBefore(li, target), null, SPRING);
    li.querySelector('a, button').focus();
    const order = cardOrder(grid, attr);
    const key = li.dataset[attr];
    save(order, `Moved ${label(key)} to position ${order.indexOf(key) + 1} of ${order.length}.`);
  });
}

async function saveCharacterOrder(order, message = 'Saved the new order.') {
  state.characters.sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
  renderNav();
  const saved = await updateBibleRecord((settings) => ({ ...settings, order: { ...(settings.order ?? {}), characters: order } }));
  if (saved) setStatus(message);
}

const slugify = (name) =>
  name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'character';

function freeSlug(name, except = null) {
  const base = slugify(name);
  const taken = new Set(state.characters.map((c) => c.slug).filter((s) => s !== except));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

// One small dialog asks for a name, both to add a character and to rename one.
function setupNameDialog() {
  const dialog = document.getElementById('name-dialog');
  document.getElementById('name-cancel').addEventListener('click', () => dialog.close());
  document.getElementById('name-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('name-input').value.trim();
    const error = document.getElementById('name-error');
    if (!name) {
      error.textContent = 'Enter a name.';
      return;
    }
    try {
      if (dialog.dataset.mode === 'add') await addCharacter(name);
      else await renameCharacter(name);
      dialog.close();
    } catch (err) {
      error.textContent = err.message;
    }
  });
}

function openNameDialog(mode) {
  const dialog = document.getElementById('name-dialog');
  dialog.dataset.mode = mode;
  document.getElementById('name-dialog-title').textContent = mode === 'add' ? 'Add a character' : 'Rename this character';
  document.getElementById('name-submit').textContent = mode === 'add' ? 'Add' : 'Rename';
  document.getElementById('name-input').value = mode === 'add' ? '' : (state.frontmatter.title ?? '');
  document.getElementById('name-error').textContent = '';
  dialog.showModal();
  document.getElementById('name-input').select();
}

async function addCharacter(name) {
  const section = state.section;
  const slug = freeSlug(name);
  const { content } = updateEntry(null, { body: '' }, { title: name, type: section.id });
  await store.write(entryFile(section, slug), content, null);
  await loadCharacters();
  setStatus(`Added ${name}.`);
  location.hash = `#/${section.id}/${encodeURIComponent(slug)}`;
}

// Renames the character, its folder, and its file together, so the folder stays readable for writers who
// work in it directly. Rewriting links in other entries arrives with the media library's link rewriting.
async function renameCharacter(name) {
  if (isDirty()) await save();
  const section = state.section;
  const old = state.entry.slug;
  const slug = freeSlug(name, old);
  if (slug !== old) {
    await store.moveFolder(`${section.folder}/${old}`, `${section.folder}/${slug}`);
    await store.move(`${section.folder}/${slug}/${old}.md`, entryFile(section, slug), state.baseVersion);
    state.entry = { path: entryFile(section, slug), slug };
    // Keep the renamed character's place in the card order.
    const order = state.settings.order?.characters ?? [];
    if (order.includes(old)) {
      await updateBibleRecord((settings) => ({ ...settings, order: { ...settings.order, characters: order.map((s) => (s === old ? slug : s)) } }));
    }
  }
  await writeEntry({ set: { title: name } });
  await loadCharacters();
  setStatus(`Renamed to ${name}.`);
  history.replaceState(null, '', `#/${section.id}/${encodeURIComponent(slug)}`);
  await openEntry(state.entry.path, slug);
}

// The portrait's menu: the photo if there is one, every placeholder silhouette, and the photo options.
function setupPortraitMenu() {
  const button = document.getElementById('portrait');
  const menu = document.getElementById('portrait-menu');
  if (!button || !menu) return;
  menu.addEventListener('beforetoggle', (e) => {
    if (e.newState !== 'open') return;
    renderPortraitMenu(menu);
    const r = button.getBoundingClientRect();
    menu.style.left = `${r.left}px`;
    menu.style.top = `${r.bottom + 8}px`;
  });
  // It's placed once when it opens, so a scroll closes it rather than leaving it behind.
  const closeOnScroll = () => menu.hidePopover();
  menu.addEventListener('toggle', (e) => {
    if (e.newState !== 'open') return window.removeEventListener('scroll', closeOnScroll);
    menu.querySelector('[aria-pressed="true"]')?.focus();
    window.addEventListener('scroll', closeOnScroll, { passive: true });
  });
  menu.addEventListener('click', async (e) => {
    if (e.target.closest('#portrait-upload')) return document.getElementById('portrait-input').click();
    if (e.target.closest('#portrait-crop')) {
      menu.hidePopover();
      return openCrop(`${entryFolder()}/${state.frontmatter.portrait.image}`);
    }
    const choice = e.target.closest('[data-kind]');
    if (!choice) return;
    menu.hidePopover();
    button.focus();
    if (choice.getAttribute('aria-pressed') === 'true') return;
    // A silhouette replaces the photo. The photo itself stays in Images.
    await writeEntry({ set: { silhouette: choice.dataset.kind, portrait: undefined } });
    await store.deleteMedia(`${entryFolder()}/${PORTRAIT_FILE}`).catch(() => {});
    renderHead();
    refreshCharactersSoon();
  });
  menu.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    // The menu stays open until the upload works, so a problem shows where the writer is looking.
    try {
      const path = await store.upload(entryFolder(), file.name, file);
      menu.hidePopover();
      openCrop(path);
    } catch (err) {
      menu.querySelector('#portrait-error').textContent = `Couldn’t add the photo. ${err.message}`;
    }
  });
  // Arrow keys move through the grid, five to a row.
  menu.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -5, ArrowDown: 5 }[e.key];
    if (!step) return;
    const choices = [...menu.querySelectorAll('[data-kind]')];
    const next = choices[choices.indexOf(document.activeElement) + step];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  });
}

function renderPortraitMenu(menu) {
  const photo = state.frontmatter.portrait;
  const current = photo ? 'photo' : (state.frontmatter.silhouette ?? 'neutral');
  const choice = (kind, label, art) =>
    `<button type="button" class="silhouette-choice" data-kind="${kind}" aria-label="${label}" aria-pressed="${kind === current}">${art}</button>`;
  menu.innerHTML = `
    <div class="silhouette-grid" role="group" aria-label="Portrait">
      ${photo ? choice('photo', 'Photo', `<img src="${portraitUrl()}" alt="" />`) : ''}
      ${Object.entries(SILHOUETTES).map(([kind, s]) => choice(kind, s.label, silhouetteSvg(kind))).join('')}
    </div>
    <div class="portrait-actions">
      <button type="button" class="link-button" id="portrait-upload">Upload a photo</button>
      ${photo ? '<button type="button" class="link-button" id="portrait-crop">Choose the part to use</button>' : ''}
      <input type="file" id="portrait-input" accept="${IMAGE_ACCEPT}" hidden />
      <p class="form-error" id="portrait-error" role="alert"></p>
    </div>`;
}

// ---------- Images ----------
// A character's images live in its folder, each with an optional sidecar. The portrait is a small cropped copy of
// one of them, with the crop kept in the frontmatter so it can be redone.

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const hasImages = (section) => Boolean(section.many && section.folder);
const entryFolder = () => `${state.section.folder}/${state.entry.slug}`;
const portraitUrl = () => store.mediaUrl(`${entryFolder()}/${PORTRAIT_FILE}`, state.frontmatter.updated);

function setView(view, depth = state.depth) {
  const toImages = view === 'images';
  state.view = view;
  if (!toImages) {
    state.depth = depth;
    state.step = 0;
  }
  document.getElementById('work-home').hidden = toImages;
  document.querySelector('.section-actions').hidden = toImages;
  document.getElementById('focus-open').hidden = toImages;
  const home = document.getElementById('images-home');
  home.hidden = !toImages;
  renderDepth();
  // Images sits after Sheet, so it slides in from the right and the text comes back from the left.
  if (toImages) {
    renderImages();
    animate(home, [{ opacity: 0, transform: 'translateX(16px)' }, { opacity: 1, transform: 'none' }]);
  } else {
    renderWork();
    animate(document.getElementById('work'), [{ opacity: 0, transform: 'translateX(-16px)' }, { opacity: 1, transform: 'none' }]);
  }
}

async function renderImages() {
  const home = document.getElementById('images-home');
  if (!home || state.view !== 'images') return;
  const dir = entryFolder();
  // The writer's order, kept as `images` in the frontmatter, comes first; anything not in it follows by name.
  const order = state.frontmatter.images ?? [];
  const rank = (name) => (order.includes(name) ? order.indexOf(name) : order.length);
  const files = (await store.list(dir))
    .filter((e) => e.type === 'file' && isImage(e.name) && e.name !== PORTRAIT_FILE)
    .sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
  state.images = await Promise.all(
    files.map(async ({ name }) => {
      const path = `${dir}/${name}`;
      let meta;
      try {
        meta = parseSidecar((await store.read(sidecarPath(path))).content);
      } catch {
        meta = parseSidecar(null);
      }
      return { path, name, ...meta };
    }),
  );
  // Cards like the character cards, each image at its own proportions.
  const grid = state.images.length
    ? `<ul class="image-grid">${state.images
        .map(
          (img) => `
        <li data-name="${esc(img.name)}"><button type="button" class="character-card image-card" data-path="${esc(img.path)}" aria-label="${esc(img.caption || img.name)}. Open it larger." aria-describedby="image-reorder-help">
          <img src="${store.mediaUrl(img.path)}" alt="${esc(img.alt)}" loading="lazy" />
          <span class="card-body">
            <span class="card-name">${esc(img.caption || img.name)}</span>
            ${img.notice ? `<span class="card-seed">${esc(img.notice)}</span>` : ''}
          </span>
        </button></li>`,
        )
        .join('')}</ul>`
    : '';
  home.innerHTML = `
    <button type="button" class="image-drop" id="image-drop">
      <span>Drop images here, paste them, or click to choose files.</span>
      <span class="hint">JPEG, PNG, WebP, or GIF, up to 25 MB each.</span>
    </button>
    <input type="file" id="image-input" accept="${IMAGE_ACCEPT}" multiple hidden />
    <p class="form-error" id="images-error" role="alert"></p>
    ${grid}
    <p class="visually-hidden" id="image-reorder-help">Drag to reorder, or press Alt with an arrow key.</p>`;
  home.querySelectorAll('.image-grid li').forEach((li, i) => riseIn(li, { delay: i * 30, fill: 'backwards' }));
  setupCardReorder(home.querySelector('.image-grid'), {
    attr: 'name',
    current: () => state.images.map((i) => i.name),
    save: saveImageOrder,
    label: (name) => state.images.find((i) => i.name === name)?.caption || name,
  });
  if (!home.dataset.ready) setupImagesHome(home);
}

// Listeners on the images area itself, which stays put while its contents are redrawn.
function setupImagesHome(home) {
  home.dataset.ready = '1';
  home.addEventListener('click', (e) => {
    if (e.target.closest('#image-drop')) return document.getElementById('image-input').click();
    const thumb = e.target.closest('.image-card');
    if (thumb) openImage(thumb.dataset.path);
  });
  home.addEventListener('change', (e) => {
    if (e.target.id !== 'image-input') return;
    uploadImages(e.target.files);
    e.target.value = '';
  });
  home.addEventListener('dragover', (e) => {
    if (![...e.dataTransfer.types].includes('Files')) return;
    e.preventDefault();
    home.classList.add('is-dropping');
  });
  home.addEventListener('dragleave', (e) => {
    if (!home.contains(e.relatedTarget)) home.classList.remove('is-dropping');
  });
  home.addEventListener('drop', (e) => {
    e.preventDefault();
    home.classList.remove('is-dropping');
    uploadImages(e.dataTransfer.files);
  });
}

async function saveImageOrder(order, message = 'Saved the new order.') {
  state.images.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  if (await writeEntry({ set: { images: order } })) setStatus(message);
}

let imagesTimer = null;
function refreshImagesSoon() {
  clearTimeout(imagesTimer);
  imagesTimer = setTimeout(() => !state.imageOpen && renderImages(), 300);
}

// Problems show in the tab itself, since the status line under the writing is hidden here.
async function uploadImages(files) {
  const images = [...files].filter((f) => IMAGE_ACCEPT.split(',').includes(f.type));
  if (!images.length) return showImagesError('Fletchery takes JPEG, PNG, WebP, and GIF images.');
  let added = 0;
  let problem = '';
  for (const file of images) {
    try {
      await store.upload(entryFolder(), file.name || `pasted.${file.type.split('/')[1]}`, file);
      added++;
    } catch (err) {
      problem = `Couldn’t add ${file.name}. ${err.message}`;
    }
  }
  if (added) setStatus(added === 1 ? 'Added an image.' : `Added ${added} images.`);
  await renderImages();
  if (problem) showImagesError(problem);
}

function showImagesError(text) {
  setStatus(text);
  const line = document.getElementById('images-error');
  if (line) line.textContent = text;
}

// Pasting an image while the Images tab is open adds it, unless the writer is pasting into a field.
function onImagePaste(e) {
  if (state.page !== 'entry' || state.view !== 'images' || e.target.closest?.('input, textarea')) return;
  const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;
  e.preventDefault();
  uploadImages(files);
}

let imageTimer = null;
const IMAGE_FIELDS = { caption: 'image-caption', alt: 'image-alt', notice: 'image-notice' };
const imageValues = () => Object.fromEntries(Object.entries(IMAGE_FIELDS).map(([k, id]) => [k, document.getElementById(id).value.trim()]));

function setupImageDialog() {
  const dialog = document.getElementById('image-dialog');
  Object.values(IMAGE_FIELDS).forEach((id) =>
    document.getElementById(id).addEventListener('input', () => {
      clearTimeout(imageTimer);
      imageTimer = setTimeout(saveImageDetails, 600);
    }),
  );
  document.getElementById('image-done').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', async () => {
    const path = state.imageOpen?.path;
    await saveImageDetails();
    state.imageOpen = null;
    await renderImages();
    document.querySelector(`.image-card[data-path="${CSS.escape(path ?? '')}"]`)?.focus();
  });
  document.getElementById('image-duplicate').addEventListener('click', duplicateImage);
  document.getElementById('image-use-portrait').addEventListener('click', async () => {
    const { path } = state.imageOpen;
    dialog.close();
    openCrop(path);
  });
  // Removing takes a second click, so a slip doesn't delete a file.
  const remove = document.getElementById('image-remove');
  remove.addEventListener('click', async () => {
    if (!remove.dataset.armed) {
      remove.dataset.armed = '1';
      remove.setAttribute('aria-label', 'Remove it from the folder?');
      return;
    }
    const { path } = state.imageOpen;
    try {
      await store.deleteMedia(path);
      const side = await store.read(sidecarPath(path));
      if (side.exists) await store.delete(sidecarPath(path), side.version);
      setStatus('Removed the image.');
    } catch (err) {
      setStatus(`Couldn’t remove the image. ${err.message}`);
    }
    state.imageOpen = null;
    dialog.close();
  });
}

// A copy of the open image and its sidecar, placed right after it. The server gives the copy a free name.
async function duplicateImage() {
  const { path } = state.imageOpen;
  const dialog = document.getElementById('image-dialog');
  try {
    await saveImageDetails();
    const blob = await (await fetch(store.mediaUrl(path))).blob();
    const copy = await store.upload(entryFolder(), path.split('/').pop(), blob);
    const side = await store.read(sidecarPath(path));
    if (side.exists) await store.write(sidecarPath(copy), side.content, null);
    const names = state.images.map((i) => i.name);
    const name = path.split('/').pop();
    names.splice(names.indexOf(name) + 1, 0, copy.split('/').pop());
    await writeEntry({ set: { images: names } });
    setStatus('Duplicated the image.');
  } catch (err) {
    return setStatus(`Couldn’t duplicate the image. ${err.message}`);
  }
  dialog.close();
}

async function openImage(path) {
  const img = state.images.find((i) => i.path === path);
  const side = await store.read(sidecarPath(path));
  state.imageOpen = { path, raw: side.content, version: side.version, saved: { caption: img.caption, alt: img.alt, notice: img.notice } };
  for (const [key, id] of Object.entries(IMAGE_FIELDS)) document.getElementById(id).value = img[key];
  const preview = document.getElementById('image-preview');
  preview.src = store.mediaUrl(path);
  preview.alt = img.alt;
  const remove = document.getElementById('image-remove');
  delete remove.dataset.armed;
  remove.setAttribute('aria-label', 'Remove');
  document.getElementById('image-dialog').showModal();
}

// Writes the sidecar if anything changed. If it changed on disk meanwhile, the writer's fields go over the new copy.
async function saveImageDetails() {
  clearTimeout(imageTimer);
  const open = state.imageOpen;
  if (!open) return;
  const values = imageValues();
  if (Object.keys(values).every((k) => values[k] === open.saved[k])) return;
  for (let attempt = 0; attempt < 2; attempt++) {
    const content = updateSidecar(open.raw, values);
    try {
      open.version = await store.write(sidecarPath(open.path), content, open.version);
      open.raw = content;
      open.saved = values;
      return;
    } catch (err) {
      if (!(err instanceof StoreConflict)) return setStatus(`Couldn’t save the image details. ${err.message}`);
      open.raw = err.current.content;
      open.version = err.current.version;
    }
  }
}

// The crop view: a circle over the image, which moves and scales under it. k is screen pixels per image pixel,
// and x and y are the image's offset in the stage.
const crop = { path: '', k: 1, min: 1, x: 0, y: 0, drag: null };

function setupCropDialog() {
  const dialog = document.getElementById('crop-dialog');
  const stage = document.getElementById('crop-stage');
  const zoom = document.getElementById('crop-zoom');
  stage.tabIndex = 0;
  stage.addEventListener('pointerdown', (e) => {
    stage.setPointerCapture(e.pointerId);
    crop.drag = { x: e.clientX, y: e.clientY };
  });
  stage.addEventListener('pointermove', (e) => {
    if (!crop.drag) return;
    crop.x += e.clientX - crop.drag.x;
    crop.y += e.clientY - crop.drag.y;
    crop.drag = { x: e.clientX, y: e.clientY };
    placeCrop();
  });
  stage.addEventListener('pointerup', () => (crop.drag = null));
  stage.addEventListener('pointercancel', () => (crop.drag = null));
  stage.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      zoomCrop(Number(zoom.value) * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
    },
    { passive: false },
  );
  stage.addEventListener('keydown', (e) => {
    const move = { ArrowLeft: [8, 0], ArrowRight: [-8, 0], ArrowUp: [0, 8], ArrowDown: [0, -8] }[e.key];
    if (move) {
      e.preventDefault();
      crop.x += move[0];
      crop.y += move[1];
      placeCrop();
    } else if (['+', '=', '-'].includes(e.key)) {
      e.preventDefault();
      zoomCrop(Number(zoom.value) * (e.key === '-' ? 1 / 1.08 : 1.08));
    }
  });
  zoom.addEventListener('input', () => zoomCrop(Number(zoom.value)));
  document.getElementById('crop-cancel').addEventListener('click', () => dialog.close());
  document.getElementById('crop-save').addEventListener('click', saveCrop);
  dialog.addEventListener('close', () => document.getElementById('portrait')?.focus());
}

async function openCrop(path) {
  const img = document.getElementById('crop-image');
  img.src = store.mediaUrl(path);
  try {
    await img.decode();
  } catch {
    return setStatus('That image can’t be opened. It may have been moved or removed.');
  }
  crop.path = path;
  document.getElementById('crop-dialog').showModal();
  const S = document.getElementById('crop-stage').clientWidth;
  crop.min = S / Math.min(img.naturalWidth, img.naturalHeight);
  // Reopening the same image starts from the saved crop.
  const saved = state.frontmatter.portrait;
  if (saved?.image === path.split('/').pop() && saved.size) {
    crop.k = S / saved.size;
    crop.x = -saved.x * crop.k;
    crop.y = -saved.y * crop.k;
  } else {
    crop.k = crop.min;
    crop.x = (S - img.naturalWidth * crop.k) / 2;
    crop.y = (S - img.naturalHeight * crop.k) / 2;
  }
  document.getElementById('crop-zoom').value = String(crop.k / crop.min);
  placeCrop();
}

// Zooms around the middle of the circle, so the part being looked at stays put.
function zoomCrop(z) {
  const zoom = document.getElementById('crop-zoom');
  const clamped = Math.min(Number(zoom.max), Math.max(1, z));
  zoom.value = String(clamped);
  const middle = document.getElementById('crop-stage').clientWidth / 2;
  const k = crop.min * clamped;
  crop.x = middle - ((middle - crop.x) / crop.k) * k;
  crop.y = middle - ((middle - crop.y) / crop.k) * k;
  crop.k = k;
  placeCrop();
}

// The image always covers the circle's square.
function placeCrop() {
  const img = document.getElementById('crop-image');
  const S = document.getElementById('crop-stage').clientWidth;
  const w = img.naturalWidth * crop.k;
  const h = img.naturalHeight * crop.k;
  crop.x = Math.min(0, Math.max(S - w, crop.x));
  crop.y = Math.min(0, Math.max(S - h, crop.y));
  img.style.width = `${w}px`;
  img.style.transform = `translate(${crop.x}px, ${crop.y}px)`;
}

async function saveCrop() {
  const img = document.getElementById('crop-image');
  const S = document.getElementById('crop-stage').clientWidth;
  const area = { x: Math.round(-crop.x / crop.k), y: Math.round(-crop.y / crop.k), size: Math.round(S / crop.k) };
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = PORTRAIT_SIZE;
  canvas.getContext('2d').drawImage(img, area.x, area.y, area.size, area.size, 0, 0, PORTRAIT_SIZE, PORTRAIT_SIZE);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
  try {
    await store.upload(entryFolder(), PORTRAIT_FILE, blob, { replace: true });
    await writeEntry({ set: { portrait: { image: crop.path.split('/').pop(), ...area } } });
  } catch (err) {
    return setStatus(`Couldn’t save the portrait. ${err.message}`);
  }
  document.getElementById('crop-dialog').close();
  renderHead();
  refreshCharactersSoon();
}

function renderHead() {
  const many = state.section.many;
  document.getElementById('section-title').textContent = many ? (state.frontmatter.title ?? state.entry.slug) : state.section.title;
  const portrait = document.getElementById('portrait');
  if (portrait) {
    const kind = state.frontmatter.silhouette ?? 'neutral';
    const photo = state.frontmatter.portrait;
    portrait.querySelector('.portrait-face').innerHTML = photo ? `<img src="${portraitUrl()}" alt="" />` : silhouetteSvg(kind);
    portrait.setAttribute('aria-label', photo ? 'Portrait: photo. Change it.' : `Portrait: ${(SILHOUETTES[kind] ?? SILHOUETTES.neutral).label} silhouette. Change it.`);
    portrait.title = 'Change the portrait';
  }
}

function load(entry, { firstLoad = false } = {}) {
  state.baseVersion = entry.version;
  state.baseContent = entry.exists ? entry.content : null;
  state.frontmatter = entry.frontmatter;
  state.layers = parseLayers(entry.body, sheetFields());
  state.savedBody = composedBody();
  if (firstLoad) state.depth = deepestFilled(state.layers);
  noteEntryStatus();
  renderAll();
}

// Keeps the sidebar and the cards current with the entry being edited.
function noteEntryStatus() {
  const status = normalizeStatus(state.frontmatter.status);
  if (!state.section.many) {
    state.statusCache[state.section.id] = status;
    return;
  }
  const c = state.characters.find((x) => x.slug === state.entry.slug);
  if (c) Object.assign(c, { title: state.frontmatter.title ?? c.title, status, description: state.frontmatter.description ?? '', silhouette: state.frontmatter.silhouette ?? 'neutral' });
}

function renderAll() {
  renderHead();
  renderNav();
  renderStatus();
  renderDepth();
  renderWork();
}

// The sidebar: built sections link to their pages, and Characters opens like a folder to list every character.
function renderNav() {
  const current = state.section?.id;
  const sectionState = (s) => {
    if (state.settings.sections?.[s.id]?.skipped) return { shape: '–', word: 'Skipped' };
    if (s.many) {
      const n = state.characters.length;
      return { shape: n ? '◐' : '○', word: n ? `${n} ${n === 1 ? 'character' : 'characters'}` : 'None yet' };
    }
    return STATUS[state.statusCache[s.id]] ?? STATUS.empty;
  };
  const item = (s) => {
    if (!s.built) {
      return `<li><span class="nav-item-off"><span class="nav-title">${esc(s.title)}</span>
        <span class="nav-state">Not built yet</span></span></li>`;
    }
    const st = sectionState(s);
    const isPage = s.id === current && (state.page === 'list' || !s.many);
    const link = `<a href="#/${s.id}"${isPage ? ' aria-current="page"' : ''}><span class="nav-title">${esc(s.title)}</span>
        <span class="nav-state"><span aria-hidden="true">${st.shape}</span> ${st.word}</span></a>`;
    if (!s.many || !state.characters.length) return `<li>${link}</li>`;
    const open = prefs.values.layout.charactersOpen;
    const names = state.characters
      .map((c) => {
        const here = s.id === current && state.entry?.slug === c.slug;
        return `<li><a href="#/${s.id}/${encodeURIComponent(c.slug)}"${here ? ' aria-current="page"' : ''}><span aria-hidden="true">${STATUS[c.status]?.shape ?? '○'}</span> ${esc(c.title)}</a></li>`;
      })
      .join('');
    return `<li class="nav-folder${open ? ' is-open' : ''}">
        <div class="nav-folder-row">${link}
          <button type="button" class="nav-folder-toggle" data-folder="${s.id}" aria-expanded="${open}" aria-controls="nav-folder-${s.id}" aria-label="${open ? 'Hide' : 'Show'} the ${esc(s.title.toLowerCase())}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>
          </button>
        </div>
        <div class="nav-folder-body" id="nav-folder-${s.id}"${open ? '' : ' inert'}><ul class="nav-sublist">${names}</ul></div>
      </li>`;
  };
  const sections = visibleSections();
  document.getElementById('nav-lists').innerHTML = `
    <ol class="nav-list">${sections.map(item).join('')}</ol>
    <ul class="nav-list nav-areas">${(state.sectionSet.areas ?? []).map(item).join('')}</ul>`;
  // The folder opens and closes in place, so its height can animate; redrawing the sidebar would make it snap.
  document.querySelectorAll('[data-folder]').forEach((b) =>
    b.addEventListener('click', () => {
      const open = !prefs.values.layout.charactersOpen;
      prefs.update({ layout: { charactersOpen: open } });
      const folder = b.closest('.nav-folder');
      folder.classList.toggle('is-open', open);
      folder.querySelector('.nav-folder-body').inert = !open;
      b.setAttribute('aria-expanded', String(open));
      b.setAttribute('aria-label', `${open ? 'Hide' : 'Show'} the ${b.dataset.folder}`);
    }),
  );

  // The folded list: one status shape per section, with the name for screen readers and as a tooltip.
  const railItem = (s) => {
    if (!s.built) {
      return `<li><span class="nav-item-off" title="${esc(s.title)}, not built yet"><span aria-hidden="true">○</span><span class="visually-hidden">${esc(s.title)}, not built yet</span></span></li>`;
    }
    const st = sectionState(s);
    return `<li><a href="#/${s.id}"${s.id === current ? ' aria-current="page"' : ''} title="${esc(s.title)}"><span aria-hidden="true">${st.shape}</span><span class="visually-hidden">${esc(s.title)}, ${st.word.toLowerCase()}</span></a></li>`;
  };
  document.getElementById('nav-rail').innerHTML = sections.map(railItem).join('');
}

// Wide screens only; below 960px the list is a disclosure menu and this has no visible effect.
function setNavOpen(open, save = true) {
  state.navCollapsed = !open;
  if (save) prefs.update({ layout: { sectionsFolded: !open } });
  document.getElementById('workspace').classList.toggle('nav-collapsed', !open);
  const toggle = document.getElementById('nav-toggle');
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Hide sections' : 'Show sections');
  document.getElementById('nav-details').inert = !open && WIDE.matches;
  document.getElementById('nav-rail').inert = open || !WIDE.matches;
}

function setContextOpen(open) {
  state.contextOpen = open;
  const toggle = document.getElementById('context-toggle');
  if (!toggle) return;
  document.getElementById('context').dataset.open = String(open);
  document.getElementById('context-inner').inert = !open;
  toggle.setAttribute('aria-expanded', String(open));
  toggle.textContent = contextLinkText();
}

const contextLinkText = () => `${state.contextOpen ? 'Hide' : 'Show'} ${shallowerLabels()}`;

// The link beside the layout tabs that shows or hides the earlier depths.
function contextLink() {
  if (state.depth === DEPTHS[0]) return '';
  return `<button type="button" class="link-button context-link" id="context-toggle" aria-controls="context" aria-expanded="${state.contextOpen}">${contextLinkText()}</button>`;
}

// The earlier depths, on a cream strip that slides open across the top of the paper, each with a way back to edit it.
function contextStrip() {
  const shallower = DEPTHS.slice(0, DEPTHS.indexOf(state.depth));
  if (!shallower.length) return '';
  const label = (d) => state.section.depths[d].label;
  const empty = (d) => `No ${label(d).toLowerCase()} yet.`;
  const layers = shallower
    .map(
      (d) => `
        <section class="context-layer" aria-labelledby="context-${d}">
          <h3 id="context-${d}">${esc(label(d))}</h3>
          <p>${state.layers[d] ? esc(state.layers[d]) : `<span class="hint">${empty(d)}</span>`}</p>
          <button type="button" class="link-button" data-goto="${d}">Edit ${label(d).toLowerCase()}</button>
        </section>`,
    )
    .join('');
  const open = state.contextOpen;
  return `
    <div class="context" id="context" data-open="${open}">
      <div class="context-inner" id="context-inner"${open ? '' : ' inert'}>
        <div class="context-strip">${layers}</div>
      </div>
    </div>`;
}

function shallowerLabels() {
  const labels = DEPTHS.slice(0, DEPTHS.indexOf(state.depth)).map((d) => state.section.depths[d].label.toLowerCase());
  return labels.join(' and ');
}

function renderStatus() {
  const st = statusOf();
  const badge = document.getElementById('status-badge');
  // The label flips over when the status changes, not on first draw.
  const changed = badge.dataset.word && badge.dataset.word !== st.word;
  badge.dataset.word = st.word;
  badge.innerHTML = `<span aria-hidden="true">${st.shape}</span> ${st.word}`;
  if (changed) animate(badge, [{ transform: 'rotateX(90deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260 });
  const button = document.getElementById('canon');
  const isCanon = normalizeStatus(state.frontmatter.status) === 'canon';
  button.textContent = isCanon ? 'Back to draft' : 'Mark as canon';
  button.disabled = !isCanon && !composedBody().trim();
  const fm = state.frontmatter;
  const updated = fm.updated ? new Date(fm.updated).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'never';
  const row = (label, value) => `<div><dt>${label}</dt><dd>${esc(value ?? 'not set')}</dd></div>`;
  const depthLabel = state.section.depths[fm.depth]?.label ?? fm.depth;
  document.getElementById('entry-meta').innerHTML =
    row('Depth', depthLabel) + row('Status', st.word) + row('Written by', writtenBy(fm.author)) + row('Updated', updated);
}

// Frontmatter `author` records who wrote the text (writer, ai-draft, ai-reviewed), not a name. Shown with the
// writer's credited name from Settings.
function writtenBy(provenance) {
  const { name, coAuthors } = prefs.values.author;
  const writer = [name, coAuthors].filter(Boolean).join(', ') || 'you';
  if (provenance === 'ai-draft') return 'AI draft';
  if (provenance === 'ai-reviewed') return `AI draft, reviewed by ${writer}`;
  return writer;
}

function renderDepth() {
  // The steps are built once and then only re-marked, so the orange indicator can glide between them.
  const steps = document.getElementById('depth-steps');
  if (!steps.children.length) {
    steps.innerHTML =
      DEPTHS.map(
        (d) => `<button type="button" class="depth-step" data-depth="${d}">${esc(state.section.depths[d].label)}</button>`,
      ).join('') +
      (hasImages(state.section) ? '<button type="button" class="depth-step" data-view="images">Images</button>' : '') +
      '<span class="depth-indicator" aria-hidden="true"></span>';
    steps.querySelectorAll('[data-depth]').forEach((b) => b.addEventListener('click', () => setDepth(b.dataset.depth, false)));
    steps.querySelector('[data-view="images"]')?.addEventListener('click', () => setView('images'));
    new ResizeObserver(placeDepthIndicator).observe(steps);
    requestAnimationFrame(() => steps.classList.add('is-ready'));
  }
  steps.querySelectorAll('.depth-step').forEach((b) => {
    const current = state.view === 'images' ? b.dataset.view === 'images' : b.dataset.depth === state.depth;
    if (current) b.setAttribute('aria-current', 'step');
    else b.removeAttribute('aria-current');
  });
  placeDepthIndicator();

  // The forward button goes to the next depth, and from the Sheet to the next section, disabled until it's built.
  const next = DEPTHS[DEPTHS.indexOf(state.depth) + 1];
  const nextButton = document.getElementById('next-depth');
  const sections = state.sectionSet.sections.filter((s) => !s.onlyFor || s.onlyFor === state.settings.scope);
  const nextSection = next ? null : sections[sections.findIndex((s) => s.id === state.section.id) + 1];
  nextButton.hidden = !next && !nextSection;
  nextButton.textContent = next ? `Go to ${state.section.depths[next].label}` : `Go to ${nextSection?.title ?? ''}`;
  nextButton.disabled = !next && !nextSection?.built;
  nextButton.title = nextButton.disabled ? `${nextSection.title} isn’t built yet.` : '';
  document.getElementById('focus-dialog').setAttribute('aria-label', `Focus: ${state.section.title}, ${state.section.depths[state.depth].label}`);
}

// The question card and answer fields, laid out the same way at every depth. A Sheet of separate fields takes its
// questions from them.
function renderWork() {
  const def = state.section.depths[state.depth];
  const work = document.getElementById('work');
  const isSheet = state.depth === 'sheet' && !def.questions; // a Sheet of separate fields
  const interview = state.mode === 'interview';
  const questions = isSheet ? def.fields.map((f) => f.question) : def.questions;
  const step = Math.min(state.step, questions.length - 1);
  // The two layouts are folder tabs over the question panel; the open tab joins the panel.
  const tab = (mode, label) => {
    const open = state.mode === mode;
    return `<button type="button" role="tab" class="question-tab" id="tab-${mode}" data-mode="${mode}" aria-selected="${open}" aria-controls="question-panel" tabindex="${open ? 0 : -1}">${label}</button>`;
  };
  const arrow = (delta, label, disabled, path) =>
    `<button type="button" class="question-arrow" data-step="${delta}" aria-label="${label}"${disabled ? ' disabled' : ''}>
       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"></path></svg>
     </button>`;
  const steps = `
    <div class="question-steps" role="group" aria-label="Questions">
      ${arrow(-1, 'Previous question', step === 0, 'M15 6l-6 6 6 6')}
      ${questions
        .map(
          (q, i) =>
            `<button type="button" class="question-number" data-question="${i}" aria-label="Question ${i + 1} of ${questions.length}"${i === step ? ' aria-current="step"' : ''}>${i + 1}</button>`,
        )
        .join('')}
      ${arrow(1, 'Next question', step >= questions.length - 1, 'M9 6l6 6-6 6')}
    </div>`;
  // A depth with one prompt, or a Sheet laid out as a form, needs no tabs or numbers: just the guide and the prompt.
  const form = isSheet && def.form;
  const simple = form || questions.length === 1;
  const done = state.focusOpen ? '<button type="button" class="button focus-done" id="focus-done">Done</button>' : '';
  const simpleCard = () => {
    const row = contextLink() + done;
    return `
    <div class="question-card">
      ${row ? `<div class="question-tabs-row">${row}</div>` : ''}
      <section class="question-panel" id="question-panel" aria-label="Prompt">
        ${form ? `<p class="question-guide">${esc(def.guide)}</p>` : `<p class="question" id="question-text">${esc(questions[0])}</p>`}
      </section>
    </div>`;
  };
  const card = simple
    ? simpleCard()
    : `
    <div class="question-card">
      <div class="question-tabs-row">
        <div class="question-tabs" role="tablist" aria-label="Question layout">
          ${tab('interview', 'One at a time')}${tab('full', 'All questions')}
        </div>
        ${contextLink()}
        ${state.focusOpen ? '<button type="button" class="button focus-done" id="focus-done">Done</button>' : ''}
      </div>
      <section class="question-panel${interview ? ' first-tab-open' : ''}" id="question-panel" role="tabpanel" aria-labelledby="tab-${state.mode}">
        <div class="question-nav">
          ${interview ? steps : ''}
          <p class="question-guide">${interview ? '' : `${questions.length} questions. `}${esc(def.guide)}</p>
        </div>
        ${
          interview
            ? `<p class="question" id="question-text" aria-live="polite">${esc(questions[step])}</p>`
            : `<ol class="question-list" id="question-text">${questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>`
        }
      </section>
    </div>`;
  // One field fills the page; the Sheet's full form stacks its parts at a fixed height.
  const fields = form ? def.fields : isSheet ? (interview ? [def.fields[step]] : def.fields) : [def.fields[0]];
  const single = fields.length === 1;
  // A short field (Age, Type) stays two lines tall instead of filling the page; Archetype adds a picker.
  // In a form, each field shows its label and a short description in place of a question.
  const fieldHtml = (f) => {
    const fill = single && !f.kind;
    const rows = fill ? '' : f.kind ? ' rows="2"' : form ? ' rows="4"' : ' rows="6"';
    const described = form ? `desc-${f.id}` : 'question-text';
    return `
      <div class="field writing-field${fill ? ' fill' : ''}${f.kind ? ` field-${f.kind}` : ''}${form ? ' form-field' : ''}">
        <label for="field-${f.id}"${single ? ' class="visually-hidden"' : ''}>${esc(f.label)}</label>
        ${form ? `<span class="field-description" id="desc-${f.id}">${esc(f.question)}</span>` : ''}
        ${f.kind === 'archetype' ? archetypeChips(f) : ''}
        <textarea id="field-${f.id}" data-field="${f.id}" spellcheck="true" aria-describedby="${described}"${single ? ` placeholder="${PLACEHOLDERS[state.depth]}"` : ''}${rows}></textarea>
      </div>`;
  };
  // The paper hangs from the question panel with no gap, the earlier depths clipped across its top.
  work.innerHTML = `${card}
    <div class="paper">
      ${contextStrip()}
      ${fields.map(fieldHtml).join('')}
    </div>`;
  work.querySelectorAll('[data-archetype]').forEach((chip) => chip.addEventListener('click', () => toggleArchetype(chip)));
  document.getElementById('context-toggle')?.addEventListener('click', () => setContextOpen(!state.contextOpen));
  document.getElementById('focus-done')?.addEventListener('click', () => closeFocus());
  work.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => setDepth(b.dataset.goto, true)));
  work.querySelectorAll('[data-mode]').forEach((b) => {
    b.addEventListener('click', () => setMode(b.dataset.mode));
    // Tab pattern: the arrow keys, Home, and End move between the two tabs.
    b.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const other = b.dataset.mode === 'interview' ? 'full' : 'interview';
      setMode(e.key === 'Home' ? 'interview' : e.key === 'End' ? 'full' : other);
    });
  });
  work.querySelectorAll('textarea[data-field]').forEach((t) => {
    t.value = fieldValue(t.dataset.field);
    t.addEventListener('input', () => {
      onInput(t);
      fadeChrome(true);
    });
    t.addEventListener('paste', onPaste);
    t.addEventListener('blur', () => {
      fadeChrome(false);
      save();
    });
  });
  work.querySelectorAll('[data-step]').forEach((b) =>
    b.addEventListener('click', () => {
      state.step = step + Number(b.dataset.step);
      renderWork();
      riseIn(document.getElementById('question-text'), { duration: 180 });
      // Keep focus on the same arrow, or on the other one when this end of the list disables it.
      const same = work.querySelector(`[data-step="${b.dataset.step}"]:not([disabled])`);
      (same ?? work.querySelector('[data-step]:not([disabled])'))?.focus();
    }),
  );
  work.querySelectorAll('[data-question]').forEach((b) =>
    b.addEventListener('click', () => {
      state.step = Number(b.dataset.question);
      renderWork();
      riseIn(document.getElementById('question-text'), { duration: 180 });
      work.querySelector(`[data-question="${b.dataset.question}"]`).focus();
    }),
  );
}

// Archetypes are kept as plain text in the file ("Sage, Trickster"). The chips add or remove names from that
// text, and anything typed by hand counts as the writer's own archetype.
const splitList = (text) => text.split(',').map((s) => s.trim()).filter(Boolean);

function archetypeChips(f) {
  const chosen = splitList(fieldValue(f.id)).map((s) => s.toLowerCase());
  return `<div class="archetype-chips" role="group" aria-label="Archetypes to add">
    ${f.options
      .map((o) => `<button type="button" class="chip" data-archetype="${esc(o)}" data-for="${f.id}" aria-pressed="${chosen.includes(o.toLowerCase())}">${esc(o)}</button>`)
      .join('')}
  </div>`;
}

function toggleArchetype(chip) {
  const t = document.getElementById(`field-${chip.dataset.for}`);
  const names = splitList(t.value);
  const name = chip.dataset.archetype;
  const i = names.findIndex((n) => n.toLowerCase() === name.toLowerCase());
  if (i >= 0) names.splice(i, 1);
  else names.push(name);
  t.value = names.join(', ');
  t.dispatchEvent(new Event('input'));
  chip.setAttribute('aria-pressed', String(i < 0));
}

function fieldValue(id) {
  if (id === 'sheet') return state.layers.sheetExtra;
  return id === 'seed' || id === 'sketch' ? state.layers[id] : (state.layers.sheet[id] ?? '');
}

function setFieldValue(id, value) {
  if (id === 'seed' || id === 'sketch') state.layers[id] = value;
  else if (id === 'sheet') state.layers.sheetExtra = value;
  else state.layers.sheet[id] = value;
}

function placeDepthIndicator() {
  const current = document.querySelector('#depth-steps [aria-current]');
  const indicator = document.querySelector('#depth-steps .depth-indicator');
  if (!current || !indicator) return;
  indicator.style.width = `${current.offsetWidth}px`;
  indicator.style.transform = `translateX(${current.offsetLeft}px)`;
}

// ---------- Motion ----------
// The house style is modern and fluid: indicators glide, content slides in the direction of travel, heights
// ease, lists stagger in, and swapped text cross-fades. Animations started from script don't see the CSS
// reduced-motion rule, so they all go through animate().

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const EASE_OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

function animate(el, keyframes, options = {}) {
  if (!el || reducedMotion.matches) return;
  el.animate(keyframes, { duration: 220, easing: EASE_OUT, ...options });
}

const riseIn = (el, options) => animate(el, [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], options);

function setDepth(depth, focusField) {
  if (state.view === 'images') return setView('text', depth);
  const direction = Math.sign(DEPTHS.indexOf(depth) - DEPTHS.indexOf(state.depth));
  state.depth = depth;
  state.step = 0;
  renderDepth();
  renderWork();
  // Deeper slides in from the right, shallower from the left, like turning the pages of one document.
  if (direction) {
    animate(document.getElementById('work'), [
      { opacity: 0, transform: `translateX(${direction * 16}px)` },
      { opacity: 1, transform: 'none' },
    ]);
  }
  if (focusField) document.querySelector('#work textarea')?.focus();
}

function setMode(mode) {
  const before = document.querySelector('#work .question-panel')?.offsetHeight;
  state.mode = mode;
  state.step = 0;
  prefs.update({ layout: { questionMode: mode } });
  renderWork();
  const panel = document.querySelector('#work .question-panel');
  if (before) {
    animate(panel, [
      { height: `${before}px`, overflow: 'hidden' },
      { height: `${panel.offsetHeight}px`, overflow: 'hidden' },
    ]);
  }
  if (mode === 'full') panel.querySelectorAll('.question-list li').forEach((li, i) => riseIn(li, { delay: i * 40, fill: 'backwards' }));
  else riseIn(document.getElementById('question-text'));
  document.querySelector(`#work [data-mode="${mode}"]`).focus();
}

// Focus opens the question and fields as a sheet over the page. The same #work element moves in and back,
// so its listeners, values, and cursor survive.
let closeFocus = () => {};

// The writer's place in the box: a text box keeps its selection even after it loses focus, so read it first.
function caretSnapshot() {
  const t = document.querySelector('#work textarea');
  return t ? { field: t.dataset.field, start: t.selectionStart, end: t.selectionEnd, scroll: t.scrollTop } : null;
}

function restoreCaret(snap) {
  const t = document.querySelector('#work textarea');
  if (!t) return;
  t.focus();
  if (snap && t.dataset.field === snap.field) {
    t.setSelectionRange(snap.start, snap.end);
    t.scrollTop = snap.scroll;
  }
}

// Each entry page's Focus button calls this; the dialog itself is set up once.
function openFocus() {
  const dialog = document.getElementById('focus-dialog');
  const snap = caretSnapshot();
  state.focusOpen = true;
  document.getElementById('focus-slot').append(document.getElementById('work'));
  dialog.showModal();
  renderWork(); // Done appears beside the tabs
  restoreCaret(snap);
  requestAnimationFrame(() => dialog.classList.add('is-open'));
}

function setupFocus() {
  const dialog = document.getElementById('focus-dialog');
  closeFocus = () => {
    if (!dialog.open || !dialog.classList.contains('is-open')) return;
    dialog.classList.remove('is-open');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      dialog.removeEventListener('transitionend', onEnd);
      const snap = caretSnapshot();
      state.focusOpen = false;
      dialog.close();
      document.getElementById('work-home').append(document.getElementById('work'));
      renderWork();
      restoreCaret(snap);
    };
    // Children's transitions bubble up too, so wait for the dialog's own. The timer covers reduced motion.
    const onEnd = (e) => {
      if (e.target === dialog) finish();
    };
    dialog.addEventListener('transitionend', onEnd);
    setTimeout(finish, 400);
  };
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeFocus();
  });
}

// Google Docs and most word processors copy paragraphs with single line breaks, which Markdown reads as one
// paragraph. A multi-line paste gets a blank line between paragraphs.
function onPaste(event) {
  const text = event.clipboardData?.getData('text/plain');
  if (prefs.values.paste === 'lines' || !text || !text.includes('\n')) return;
  event.preventDefault();
  const paragraphs = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim());
  const joined = paragraphs.join('\n\n');
  // insertText keeps the paste in the undo history. setRangeText is the fallback where it's unsupported.
  if (!document.execCommand('insertText', false, joined)) {
    const t = event.target;
    t.setRangeText(joined, t.selectionStart, t.selectionEnd, 'end');
    t.dispatchEvent(new Event('input'));
  }
}

// While the writer types, the section list fades back (base.css says what fades). A pause, a pointer movement,
// or leaving the field brings it back at full contrast.
let fadeTimer = null;
function fadeChrome(on) {
  const { fade } = prefs.values;
  clearTimeout(fadeTimer);
  document.documentElement.classList.toggle('is-writing', on && fade.on);
  if (on && fade.on) fadeTimer = setTimeout(() => fadeChrome(false), fade.pauseSeconds * 1000);
}
document.addEventListener('pointermove', (e) => {
  if (Math.abs(e.movementX) + Math.abs(e.movementY) > 4 && document.documentElement.classList.contains('is-writing')) {
    fadeChrome(false);
  }
});

function onInput(textarea) {
  setFieldValue(textarea.dataset.field, textarea.value);
  if (state.conflict) {
    // Saving waits until the conflict is resolved. Keep "Your version" current.
    document.getElementById('conflict-mine').value = composedBody();
    return;
  }
  if (statusEl.textContent !== 'Unsaved changes') setStatus('Unsaved changes');
  clearTimeout(state.timer);
  state.timer = setTimeout(save, SAVE_DELAY_MS);
}

// Writes the entry on top of baseVersion. Returns the update result, or null after a conflict or error.
async function writeEntry(change, baseVersion = state.baseVersion, baseContent = state.baseContent) {
  const body = composedBody();
  const description = state.section.descriptionFrom ? (state.layers[state.section.descriptionFrom] ?? '').split('\n')[0].trim() : undefined;
  const result = updateEntry(baseContent, { body, depth: deepestFilled(state.layers), description, ...change }, template());
  try {
    const version = await store.write(entryPath(), result.content, baseVersion);
    state.baseVersion = version;
    state.baseContent = result.content;
    state.savedBody = body;
    state.frontmatter = result.frontmatter;
    noteEntryStatus();
    renderStatus();
    renderNav();
    if (skipped() && body.trim()) await setSkipped(false);
    return result;
  } catch (err) {
    if (!(err instanceof StoreConflict)) {
      setStatus(`Couldn’t save. ${err.message}`);
      return null;
    }
    try {
      showConflict(toEntry(err.current));
    } catch (parseErr) {
      setStatus(`Not saved. The file changed on disk and can’t be read. ${parseErr.message}`);
    }
    return null;
  }
}

async function save() {
  clearTimeout(state.timer);
  if (state.saving || state.conflict || !isDirty()) return;
  state.saving = true;
  setStatus('Saving…');
  const result = await writeEntry({});
  state.saving = false;
  if (!result) return;
  if (isDirty()) setStatus('Unsaved changes');
  else setStatus(result.reverted ? `Saved at ${timeNow()}. Back to draft because you edited it.` : `Saved at ${timeNow()}`);
  if (state.remotePending) return checkRemote();
  if (isDirty()) state.timer = setTimeout(save, SAVE_DELAY_MS);
}

async function toggleCanon() {
  if (state.conflict || state.saving) return;
  clearTimeout(state.timer);
  const makingCanon = normalizeStatus(state.frontmatter.status) !== 'canon';
  state.saving = true;
  const result = await writeEntry({ canon: makingCanon });
  state.saving = false;
  if (!result) return;
  setStatus(makingCanon ? `${state.section.title} is now canon.` : `${state.section.title} is back to draft.`);
  document.getElementById('canon').focus();
}

// Skips live in fletchery.json.
function setSkipped(value) {
  return updateBibleRecord((settings) => {
    const next = { ...settings, sections: { ...(settings.sections ?? {}) } };
    next.sections[state.section.id] = { ...(next.sections[state.section.id] ?? {}), skipped: value };
    if (!value) delete next.sections[state.section.id].skipped;
    if (!Object.keys(next.sections[state.section.id]).length) delete next.sections[state.section.id];
    return next;
  });
}

// Writes a change to fletchery.json, the bible's own record. A conflicting write rereads the file and tries once more.
async function updateBibleRecord(change) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const next = change(state.settings);
    try {
      state.settingsVersion = await store.write(SETTINGS_PATH, JSON.stringify(next, null, 2) + '\n', state.settingsVersion);
      state.settings = next;
      renderNav();
      return true;
    } catch (err) {
      if (!(err instanceof StoreConflict) || !err.current.exists) {
        setStatus(`Couldn’t update the settings. ${err.message}`);
        return false;
      }
      state.settings = JSON.parse(err.current.content);
      state.settingsVersion = err.current.version;
    }
  }
  setStatus('Couldn’t update the settings because they keep changing on disk.');
  return false;
}

async function skipSection() {
  if (await setSkipped(true)) {
    setStatus(`${state.section.title} skipped for now. It shows as skipped in the section list until you write in it.`);
  }
}

// Characters added, renamed, or edited outside the app show up in the sidebar and on the cards.
let charactersTimer = null;
function refreshCharactersSoon() {
  clearTimeout(charactersTimer);
  charactersTimer = setTimeout(async () => {
    await loadCharacters();
    if (state.page === 'list') renderListPage();
    else renderNav();
  }, 200);
}

function listen() {
  store.changes((change) => {
    if (change.path === SETTINGS_FILE) return prefs.reload(change.version);
    if (change.path.startsWith('characters/')) refreshCharactersSoon();
    if (state.page === 'entry' && state.view === 'images' && change.path.startsWith(`${entryFolder()}/`)) refreshImagesSoon();
    if (state.page !== 'entry' || change.path !== entryPath() || change.version === state.baseVersion) return;
    if (state.saving) state.remotePending = true;
    else checkRemote();
  });
}

// Something changed the file on disk. Take the new version if nothing here is
// unsaved. Otherwise ask.
async function checkRemote() {
  state.remotePending = false;
  let data;
  try {
    data = toEntry(await store.read(entryPath()));
  } catch (err) {
    setStatus(`The file changed on disk but couldn’t be read. ${err.message}`);
    return;
  }
  if (data.version === state.baseVersion) return;
  if (state.conflict) {
    state.conflict.disk = data;
    renderConflict();
    return;
  }
  if (isDirty()) {
    showConflict(data);
    return;
  }
  const active = document.activeElement;
  const field = active?.dataset?.field;
  const selection = field ? [active.selectionStart, active.selectionEnd] : null;
  load(data);
  if (field) {
    const again = document.getElementById(`field-${field}`);
    again?.focus();
    again?.setSelectionRange(...selection);
  }
  setStatus(data.exists ? `Updated from disk at ${timeNow()}` : 'The file was deleted on disk. Typing here creates it again.');
}

// ---------- Conflicts ----------

function showConflict(disk) {
  clearTimeout(state.timer);
  state.conflict = { disk, confirming: false };
  renderConflict();
  setStatus('Not saved. The file changed on disk.');
  document.getElementById('conflict-heading').focus();
}

function renderConflict() {
  const slot = document.getElementById('conflict-slot');
  const { disk, confirming } = state.conflict;
  slot.innerHTML = `
    <section class="conflict" aria-labelledby="conflict-heading">
      <h2 id="conflict-heading" tabindex="-1">This file changed on disk</h2>
      <p>The file was edited outside Fletchery while you had unsaved changes here. Nothing has been overwritten. Choose which version to keep.</p>
      <div class="conflict-columns">
        <div>
          <label for="conflict-disk">Version on disk</label>
          <textarea id="conflict-disk" readonly rows="5"></textarea>
        </div>
        <div>
          <label for="conflict-mine">Your version</label>
          <textarea id="conflict-mine" readonly rows="5"></textarea>
        </div>
      </div>
      ${
        confirming
          ? `<p><strong>This replaces the version on disk with yours.</strong></p>
             <div class="button-row">
               <button type="button" class="button" data-action="overwrite">Replace the disk version</button>
               <button type="button" class="button button-quiet" data-action="cancel">Cancel</button>
             </div>`
          : `<div class="button-row">
               <button type="button" class="button" data-action="disk">Use the disk version</button>
               <button type="button" class="button button-quiet" data-action="mine">Keep my version</button>
               <button type="button" class="button button-quiet" data-action="copy">Copy mine, then use the disk version</button>
             </div>`
      }
    </section>`;
  document.getElementById('conflict-disk').value = disk.body;
  document.getElementById('conflict-mine').value = composedBody();
  slot.querySelectorAll('[data-action]').forEach((b) => b.addEventListener('click', () => resolveConflict(b.dataset.action)));
}

async function resolveConflict(action) {
  const { disk } = state.conflict;
  if (action === 'mine' || action === 'cancel') {
    state.conflict.confirming = action === 'mine';
    renderConflict();
    document.querySelector('#conflict-slot [data-action]').focus();
    return;
  }
  if (action === 'copy') {
    try {
      await navigator.clipboard.writeText(composedBody());
    } catch {
      setStatus('Couldn’t copy your version, so the disk version wasn’t loaded.');
      return;
    }
  }
  if (action === 'disk' || action === 'copy') {
    load(disk); // before closeConflict, which focuses the freshly rendered field
    closeConflict();
    setStatus(action === 'copy' ? 'Your version is on the clipboard. Using the disk version.' : 'Using the disk version.');
    return;
  }
  if (action === 'overwrite') {
    const open = state.conflict;
    state.conflict = null; // lets writeEntry reopen the panel if the file changed again
    if (!(await writeEntry({}, disk.version, disk.exists ? disk.content : null))) {
      if (state.conflict) setStatus('The file changed on disk again. Nothing was overwritten.');
      else state.conflict = open; // a non-conflict failure: the panel stays as it was
      return;
    }
    closeConflict();
    setStatus(`Saved your version at ${timeNow()}`);
  }
}

function closeConflict() {
  state.conflict = null;
  document.getElementById('conflict-slot').innerHTML = '';
  document.querySelector('#work textarea')?.focus();
}

start();
