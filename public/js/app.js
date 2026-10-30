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
  section: null, // the built section being edited
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
const entryPath = () => state.section.file;
const template = () => ({ title: state.section.title, type: state.section.id });
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
  state.section = state.sectionSet.sections.find((s) => s.built);

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
      <div class="section-page">
        <div class="section-main">
        <div class="section-head">
          <h1 id="section-title"></h1>
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
          <button type="button" class="button button-soft" id="skip">Skip for now</button>
          <button type="button" class="button button-quiet" id="ask-ai" disabled aria-describedby="ask-ai-note">Ask AI</button>
          <p class="local-status" id="local-status" aria-hidden="true"></p>
          <button type="button" class="button" id="next-depth"></button>
        </div>
        </div>
        <p class="hint" id="ask-ai-note">Ask AI turns on once you choose an AI in Settings, in a later version.</p>
        <dl class="entry-meta" id="entry-meta"></dl>
        <p class="hint file-note" id="file-note"></p>
      </div>
    </div>
    <dialog class="focus-dialog" id="focus-dialog">
      <div class="focus-slot" id="focus-slot"></div>
    </dialog>`;

  document.getElementById('section-title').textContent = state.section.title;
  document.getElementById('file-note').innerHTML =
    `Saved to <code>story-bible/${esc(entryPath())}</code> as you type. Changes made to that file in another editor appear here.`;
  WIDE.addEventListener('change', (e) => {
    if (e.matches) document.getElementById('nav-details').open = true;
  });
  state.mode = prefs.values.layout.questionMode;
  setNavOpen(!prefs.values.layout.sectionsFolded, false);
  document.getElementById('nav-toggle').addEventListener('click', () => setNavOpen(state.navCollapsed));
  document.getElementById('next-depth').addEventListener('click', () => setDepth(DEPTHS[DEPTHS.indexOf(state.depth) + 1], true));
  setupFocus();
  document.getElementById('canon').addEventListener('click', toggleCanon);
  document.getElementById('skip').addEventListener('click', skipSection);

  try {
    load(toEntry(await store.read(entryPath())), { firstLoad: true });
  } catch (err) {
    if (err.detail) console.error(`${entryPath()}: ${err.detail}`);
    setStatus(err.message);
    document.querySelectorAll('.section-page textarea, .section-page button, .section-page input').forEach((el) => (el.disabled = true));
    return;
  }
  listen();
}

function load(entry, { firstLoad = false } = {}) {
  state.baseVersion = entry.version;
  state.baseContent = entry.exists ? entry.content : null;
  state.frontmatter = entry.frontmatter;
  state.layers = parseLayers(entry.body, sheetFields());
  state.savedBody = composedBody();
  if (firstLoad) state.depth = deepestFilled(state.layers);
  renderAll();
}

function renderAll() {
  renderNav();
  renderStatus();
  renderDepth();
  renderWork();
}

function renderNav() {
  const scope = state.settings.scope;
  const item = (s) => {
    if (s.id === state.section.id) {
      const st = statusOf();
      const note = skipped() ? 'Skipped' : st.word;
      return `<li><a href="#" aria-current="page"><span class="nav-title">${esc(s.title)}</span>
        <span class="nav-state"><span aria-hidden="true">${skipped() ? '–' : st.shape}</span> ${note}</span></a></li>`;
    }
    return `<li><span class="nav-item-off"><span class="nav-title">${esc(s.title)}</span>
      <span class="nav-state">Not built yet</span></span></li>`;
  };
  const sections = state.sectionSet.sections.filter((s) => !s.onlyFor || s.onlyFor === scope);
  document.getElementById('nav-lists').innerHTML = `
    <ol class="nav-list">${sections.map(item).join('')}</ol>
    <ul class="nav-list nav-areas">${(state.sectionSet.areas ?? []).map(item).join('')}</ul>`;

  // The folded list: one status shape per section, with the name for screen readers and as a tooltip.
  const railItem = (s) => {
    if (s.id === state.section.id) {
      const st = statusOf();
      const note = skipped() ? 'skipped' : st.word.toLowerCase();
      return `<li><a href="#" aria-current="page" title="${esc(s.title)}"><span aria-hidden="true">${skipped() ? '–' : st.shape}</span><span class="visually-hidden">${esc(s.title)}, ${note}</span></a></li>`;
    }
    return `<li><span class="nav-item-off" title="${esc(s.title)}, not built yet"><span aria-hidden="true">○</span><span class="visually-hidden">${esc(s.title)}, not built yet</span></span></li>`;
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
    row('Depth', depthLabel) + row('Status', st.word) + row('Author', fm.author) + row('Updated', updated);
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

  const next = DEPTHS[DEPTHS.indexOf(state.depth) + 1];
  const nextButton = document.getElementById('next-depth');
  nextButton.hidden = !next;
  if (next) nextButton.textContent = `Go to ${state.section.depths[next].label}`;
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
          ${tab('interview', 'Interview me')}${tab('full', 'Full form')}
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
  const fill = fields.length === 1;
  // The paper hangs from the question panel with no gap, the earlier depths clipped across its top.
  work.innerHTML = `${card}
    <div class="paper">
      ${contextStrip()}
      ${fields
        .map(
          (f) => `
          <div class="field writing-field${fill ? ' fill' : ''}">
            <label for="field-${f.id}"${fill ? ' class="visually-hidden"' : ''}>${esc(f.label)}</label>
            <textarea id="field-${f.id}" data-field="${f.id}" spellcheck="true" aria-describedby="question-text"${fill ? '' : ' rows="6"'}></textarea>
          </div>`,
        )
        .join('')}
    </div>`;
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

function setupFocus() {
  const dialog = document.getElementById('focus-dialog');
  const opener = document.getElementById('focus-open');
  opener.addEventListener('click', () => {
    const snap = caretSnapshot();
    state.focusOpen = true;
    document.getElementById('focus-slot').append(document.getElementById('work'));
    dialog.showModal();
    renderWork(); // Done appears beside the tabs
    restoreCaret(snap);
    requestAnimationFrame(() => dialog.classList.add('is-open'));
  });
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

function listen() {
  store.changes((change) => {
    if (change.path === SETTINGS_FILE) return prefs.reload(change.version);
    if (change.path !== entryPath() || change.version === state.baseVersion) return;
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
