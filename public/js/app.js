// First-run setup, section navigation, and the section editor, with live sync and conflict handling.
import { normalizeStatus, parseEntry, updateEntry } from './core/entry.js';
import { DEPTHS, deepestFilled, parseLayers, serializeLayers } from './core/layers.js';
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
    </dialog>`;

  WIDE.addEventListener('change', (e) => {
    if (e.matches) document.getElementById('nav-details').open = true;
  });
  state.mode = prefs.values.layout.questionMode;
  setNavOpen(!prefs.values.layout.sectionsFolded, false);
  document.getElementById('nav-toggle').addEventListener('click', () => setNavOpen(state.navCollapsed));
  setupFocus();
  setupNameDialog();

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
  state.contextOpen = false;
  state.frontmatter = {};
  const page = document.getElementById('page');
  page.innerHTML = `
    <div class="section-main">
      ${section.many ? `<a class="crumb" href="#/${section.id}">${esc(section.title)}</a>` : ''}
      <div class="section-head">
        ${section.many ? `<button type="button" class="portrait-button" id="portrait"></button>` : ''}
        <h1 id="section-title"></h1>
        ${section.many ? `<button type="button" class="button button-quiet rename-button" id="rename">Rename</button>` : ''}
        <div class="depth-steps" id="depth-steps" role="group" aria-label="Depth"></div>
        <p class="status-badge" id="status-badge"></p>
        <button type="button" class="button button-quiet focus-open" id="focus-open">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"></path></svg>
          Focus
        </button>
      </div>
      <div id="conflict-slot"></div>
      <div id="work-home"><div id="work"></div></div>
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
  document.getElementById('portrait')?.addEventListener('click', cycleSilhouette);

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
        return { slug, title: frontmatter.title || slug, status: normalizeStatus(frontmatter.status), description: frontmatter.description ?? '', silhouette: frontmatter.silhouette ?? 'neutral' };
      } catch {
        return { slug, title: slug, status: 'empty', description: '', silhouette: 'neutral' };
      }
    }),
  );
  state.characters = read.filter(Boolean).sort((a, b) => a.title.localeCompare(b.title));
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

const SILHOUETTES = ['neutral', 'female', 'male'];
const SILHOUETTE_LABELS = { neutral: 'neutral', female: 'female', male: 'male' };

// Head-and-shoulders placeholders for characters with no photo yet.
function silhouetteSvg(kind) {
  const hair = {
    neutral: '<path d="M38 34c0-9 7-15 14-15s14 6 14 15c0 3-1 5-2 7-2-6-6-9-12-9s-10 3-12 9c-1-2-2-4-2-7z"/>',
    female: '<path d="M33 46c-2-16 6-27 19-27s21 11 19 27c-1 6-3 11-6 14l-2-14c-2-7-6-10-11-10s-9 3-11 10l-2 14c-3-3-5-8-6-14z"/>',
    male: '<path d="M38 32c0-8 6-13 14-13s14 5 14 13c0 2 0 4-1 5-2-4-6-6-13-6s-11 2-13 6c-1-1-1-3-1-5z"/>',
  }[kind];
  const shoulders = kind === 'male' ? 'M20 100c0-20 14-32 32-32s32 12 32 32z' : 'M24 100c0-19 12-30 28-30s28 11 28 30z';
  return `<svg viewBox="0 0 104 100" aria-hidden="true" class="silhouette"><circle cx="52" cy="40" r="15"/>${hair}<path d="${shoulders}"/></svg>`;
}

function renderListPage() {
  const section = state.section;
  state.page = 'list';
  state.entry = null;
  const cards = state.characters
    .map(
      (c) => `
      <li>
        <a class="character-card" href="#/${section.id}/${encodeURIComponent(c.slug)}">
          <span class="card-portrait">${silhouetteSvg(c.silhouette)}</span>
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
      ${cards ? `<ul class="card-grid">${cards}</ul>` : '<p class="empty-note">No characters yet. Add the first one, and start with a single sentence.</p>'}
      <div class="button-row section-actions">
        <button type="button" class="button button-soft" id="skip">Skip for now</button>
      </div>
    </div>`;
  document.getElementById('add-entry').addEventListener('click', () => openNameDialog('add'));
  document.getElementById('skip').addEventListener('click', skipSection);
  renderNav();
  main.focus({ preventScroll: true });
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
  }
  await writeEntry({ set: { title: name } });
  await loadCharacters();
  setStatus(`Renamed to ${name}.`);
  history.replaceState(null, '', `#/${section.id}/${encodeURIComponent(slug)}`);
  await openEntry(state.entry.path, slug);
}

// The placeholder portrait cycles neutral, female, male. A photo replaces it in a later step.
async function cycleSilhouette() {
  const current = state.frontmatter.silhouette ?? 'neutral';
  const next = SILHOUETTES[(SILHOUETTES.indexOf(current) + 1) % SILHOUETTES.length];
  await writeEntry({ set: { silhouette: next } });
  renderHead();
  document.getElementById('portrait').focus();
}

function renderHead() {
  const many = state.section.many;
  document.getElementById('section-title').textContent = many ? (state.frontmatter.title ?? state.entry.slug) : state.section.title;
  const portrait = document.getElementById('portrait');
  if (portrait) {
    const kind = state.frontmatter.silhouette ?? 'neutral';
    portrait.innerHTML = silhouetteSvg(kind);
    portrait.setAttribute('aria-label', `Placeholder portrait: ${SILHOUETTE_LABELS[kind]}. Change it.`);
    portrait.title = 'Change the placeholder portrait';
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
  document.querySelectorAll('[data-folder]').forEach((b) =>
    b.addEventListener('click', () => {
      prefs.update({ layout: { charactersOpen: !prefs.values.layout.charactersOpen } });
      renderNav();
      document.querySelector(`[data-folder="${b.dataset.folder}"]`)?.focus();
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
      ).join('') + '<span class="depth-indicator" aria-hidden="true"></span>';
    steps.querySelectorAll('[data-depth]').forEach((b) => b.addEventListener('click', () => setDepth(b.dataset.depth, false)));
    new ResizeObserver(placeDepthIndicator).observe(steps);
    requestAnimationFrame(() => steps.classList.add('is-ready'));
  }
  steps.querySelectorAll('[data-depth]').forEach((b) => {
    if (b.dataset.depth === state.depth) b.setAttribute('aria-current', 'step');
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
  const card = `
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
  const fields = isSheet ? (interview ? [def.fields[step]] : def.fields) : [def.fields[0]];
  const single = fields.length === 1;
  // A short field (Age, Type) stays two lines tall instead of filling the page; Archetype adds a picker.
  const fieldHtml = (f) => {
    const fill = single && !f.kind;
    const rows = fill ? '' : f.kind ? ' rows="2"' : ' rows="6"';
    return `
      <div class="field writing-field${fill ? ' fill' : ''}${f.kind ? ` field-${f.kind}` : ''}">
        <label for="field-${f.id}"${single ? ' class="visually-hidden"' : ''}>${esc(f.label)}</label>
        ${f.kind === 'archetype' ? archetypeChips(f) : ''}
        <textarea id="field-${f.id}" data-field="${f.id}" spellcheck="true" aria-describedby="question-text"${single ? ` placeholder="${PLACEHOLDERS[state.depth]}"` : ''}${rows}></textarea>
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

// Skips live in fletchery.json. A conflicting write rereads the file and tries once more.
async function setSkipped(value) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const next = { ...state.settings, sections: { ...(state.settings.sections ?? {}) } };
    next.sections[state.section.id] = { ...(next.sections[state.section.id] ?? {}), skipped: value };
    if (!value) delete next.sections[state.section.id].skipped;
    if (!Object.keys(next.sections[state.section.id]).length) delete next.sections[state.section.id];
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
