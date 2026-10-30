// First-run setup, section navigation, and the section editor, with live sync and conflict handling.
import { parseEntry, updateEntry } from './core/entry.js';
import { DEPTHS, deepestFilled, parseLayers, serializeLayers } from './core/layers.js';
import { LocalServerStore, StoreConflict } from './core/store.js';

const store = new LocalServerStore();
const SETTINGS_PATH = 'fletcherling.json';
const SAVE_DELAY_MS = 500;
const WIDE = window.matchMedia('(min-width: 960px)');
const STATUS = {
  empty: { shape: '○', word: 'Empty' },
  draft: { shape: '◐', word: 'Draft' },
  settled: { shape: '●', word: 'Settled' },
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

function readPref(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writePref(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

// ---------- Start ----------

async function start() {
  setupGridToggle();
  try {
    const info = await store.info();
    document.getElementById('project-path').textContent = info.projectDir;
    const file = await store.read(SETTINGS_PATH);
    if (!file.exists) return showSetup();
    let settings;
    try {
      settings = JSON.parse(file.content);
    } catch {
      return showProblem('The settings file can’t be read', 'story-bible/fletcherling.json isn’t valid JSON. Fix it in an editor, then reload this page.');
    }
    showEditor(settings, file.version);
  } catch (err) {
    showProblem('Fletcherling couldn’t start', err.message);
  }
}

function applySettings(settings) {
  document.documentElement.dataset.font = settings.font ?? 'source-sans-3';
  document.getElementById('project-title').textContent = settings.title;
  document.title = `${settings.title} · Fletcherling`;
}

function setupGridToggle() {
  const button = document.getElementById('grid-toggle');
  const set = (on) => {
    document.documentElement.classList.toggle('show-grid', on);
    button.setAttribute('aria-pressed', String(on));
    writePref('fl-grid', on ? '1' : '0');
  };
  set(readPref('fl-grid', '0') === '1');
  button.addEventListener('click', () => set(button.getAttribute('aria-pressed') !== 'true'));
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
    <p>Fletcherling keeps the bible in a <code>story-bible</code> folder in this project. These questions are asked once.</p>
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
      font: 'source-sans-3',
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
  mode: readPref('fl-mode', 'interview'), // 'interview' or 'full'
  step: 0, // current question or Sheet part in Interview mode
  baseVersion: null, // stored version the editor is based on
  baseContent: null, // that version's full file content, frontmatter included
  savedBody: '', // body as last loaded or saved, normalized
  frontmatter: {},
  saving: false,
  timer: null,
  remotePending: false,
  conflict: null, // { disk, confirming }
};

const sheetFields = () => state.section.depths.sheet.fields;
const composedBody = () => serializeLayers(state.layers, sheetFields());
const isDirty = () => composedBody() !== state.savedBody;
const entryPath = () => state.section.file;
const template = () => ({ title: state.section.title, type: state.section.id });
const statusOf = () => STATUS[state.frontmatter.status] ?? STATUS.empty;
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

  view.innerHTML = `
    <div class="workspace">
      <nav class="section-nav" aria-label="Sections">
        <details id="nav-details"${WIDE.matches ? ' open' : ''}>
          <summary>Sections</summary>
          <div id="nav-lists"></div>
        </details>
      </nav>
      <div class="section-page">
        <div class="section-head">
          <h1 id="section-title"></h1>
          <p class="status-badge" id="status-badge"></p>
        </div>
        <p class="why" id="section-why"></p>
        <div id="conflict-slot"></div>
        <fieldset class="depth-control">
          <legend>Depth</legend>
          <div class="choices-inline" id="depth-choices"></div>
        </fieldset>
        <p class="hint guide" id="depth-guide"></p>
        <div class="mode-toggle" role="group" aria-label="Question layout">
          <button type="button" class="button button-quiet" data-mode="interview">Interview me</button>
          <button type="button" class="button button-quiet" data-mode="full">Full form</button>
        </div>
        <div id="context"></div>
        <div id="work"></div>
        <p class="local-status" id="local-status" aria-hidden="true"></p>
        <div class="button-row section-actions">
          <button type="button" class="button" id="settle"></button>
          <button type="button" class="button button-quiet" id="skip">Skip for now</button>
          <button type="button" class="button button-quiet" id="ask-claude" disabled aria-describedby="ask-claude-note">Ask Claude</button>
        </div>
        <p class="hint" id="ask-claude-note">Ask Claude arrives with the Claude Code bridge.</p>
        <dl class="entry-meta" id="entry-meta"></dl>
        <p class="hint file-note" id="file-note"></p>
      </div>
    </div>`;

  document.getElementById('section-title').textContent = state.section.title;
  document.getElementById('section-why').textContent = state.section.why;
  document.getElementById('file-note').innerHTML =
    `Saved to <code>story-bible/${esc(entryPath())}</code> as you type. Changes made to that file in another editor appear here.`;
  WIDE.addEventListener('change', (e) => {
    if (e.matches) document.getElementById('nav-details').open = true;
  });
  document.getElementById('depth-choices').innerHTML = DEPTHS.map(
    (d) => `
      <div class="choice">
        <input type="radio" id="depth-${d}" name="depth" value="${d}" />
        <label for="depth-${d}">${esc(state.section.depths[d].label)}</label>
      </div>`,
  ).join('');
  document.querySelectorAll('[name=depth]').forEach((r) => r.addEventListener('change', () => setDepth(r.value, false)));
  document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  document.getElementById('settle').addEventListener('click', toggleSettled);
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
}

function renderStatus() {
  const st = statusOf();
  document.getElementById('status-badge').innerHTML = `<span aria-hidden="true">${st.shape}</span> ${st.word}`;
  const settle = document.getElementById('settle');
  const settled = state.frontmatter.status === 'settled';
  settle.textContent = settled ? 'Back to draft' : 'Mark settled';
  settle.disabled = !settled && !composedBody().trim();
  const fm = state.frontmatter;
  const updated = fm.updated ? new Date(fm.updated).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'never';
  const row = (label, value) => `<div><dt>${label}</dt><dd>${esc(value ?? 'not set')}</dd></div>`;
  const depthLabel = state.section.depths[fm.depth]?.label ?? fm.depth;
  document.getElementById('entry-meta').innerHTML =
    row('Depth', depthLabel) + row('Status', st.word) + row('Author', fm.author) + row('Updated', updated);
}

function renderDepth() {
  document.getElementById(`depth-${state.depth}`).checked = true;
  document.getElementById('depth-guide').textContent = state.section.depths[state.depth].guide;
  document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)));

  // Shallower layers stay in view as read-only context, each with a way back to edit it.
  const shallower = DEPTHS.slice(0, DEPTHS.indexOf(state.depth));
  document.getElementById('context').innerHTML = shallower
    .map((d) => {
      const label = state.section.depths[d].label;
      const text = d === 'sheet' ? '' : state.layers[d];
      return `
        <section class="context-layer" aria-labelledby="context-${d}">
          <h2 id="context-${d}">${esc(label)}</h2>
          <p>${text ? esc(text) : `<span class="hint">No ${label.toLowerCase()} yet.</span>`}</p>
          <button type="button" class="link-button" data-goto="${d}">Edit ${label.toLowerCase()}</button>
        </section>`;
    })
    .join('');
  document.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => setDepth(b.dataset.goto, true)));
}

// The questions and answer fields for the current depth and mode.
function renderWork() {
  const def = state.section.depths[state.depth];
  const work = document.getElementById('work');
  if (state.depth === 'sheet') {
    const fields = def.fields;
    const shown = state.mode === 'interview' ? [fields[Math.min(state.step, fields.length - 1)]] : fields;
    work.innerHTML =
      (state.mode === 'interview' ? stepper(state.step, fields.length, 'Part') : '') +
      shown
        .map(
          (f) => `
          <div class="field">
            <label for="field-${f.id}">${esc(f.label)}</label>
            <span class="hint" id="hint-${f.id}">${esc(f.question)}</span>
            <textarea id="field-${f.id}" data-field="${f.id}" rows="6" spellcheck="true" aria-describedby="hint-${f.id}"></textarea>
          </div>`,
        )
        .join('');
  } else {
    const field = def.fields[0];
    const questions = def.questions;
    const prompt =
      state.mode === 'interview'
        ? `<div class="question-card">
             <p class="question-count">Question ${state.step + 1} of ${questions.length}</p>
             <p class="question" id="question-text" aria-live="polite">${esc(questions[state.step])}</p>
             ${stepButtons(state.step, questions.length)}
           </div>`
        : `<ol class="question-list" id="question-text">${questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>`;
    work.innerHTML = `${prompt}
      <div class="field">
        <label for="field-${field.id}">${esc(field.label)}</label>
        <textarea id="field-${field.id}" data-field="${field.id}"${state.depth === 'seed' ? ' class="short" rows="2"' : ' rows="8"'} spellcheck="true" aria-describedby="question-text"></textarea>
      </div>`;
  }
  work.querySelectorAll('textarea[data-field]').forEach((t) => {
    t.value = fieldValue(t.dataset.field);
    t.addEventListener('input', () => onInput(t));
    t.addEventListener('blur', () => save());
  });
  work.querySelectorAll('[data-step]').forEach((b) =>
    b.addEventListener('click', () => {
      state.step += Number(b.dataset.step);
      renderWork();
      // Keep focus on the same button, or on the other one when this end of the list disables it.
      const same = work.querySelector(`[data-step="${b.dataset.step}"]:not([disabled])`);
      (same ?? work.querySelector('[data-step]:not([disabled])'))?.focus();
    }),
  );
}

function stepper(step, count, noun) {
  return `<div class="question-card stepper">
    <p class="question-count" aria-live="polite">${noun} ${step + 1} of ${count}</p>
    ${stepButtons(step, count)}
  </div>`;
}

function stepButtons(step, count) {
  return `<div class="button-row step-buttons">
    <button type="button" class="button button-quiet" data-step="-1"${step === 0 ? ' disabled' : ''}>Back</button>
    <button type="button" class="button button-quiet" data-step="1"${step >= count - 1 ? ' disabled' : ''}>Next</button>
  </div>`;
}

function fieldValue(id) {
  return id === 'seed' || id === 'sketch' ? state.layers[id] : (state.layers.sheet[id] ?? '');
}

function setFieldValue(id, value) {
  if (id === 'seed' || id === 'sketch') state.layers[id] = value;
  else state.layers.sheet[id] = value;
}

function setDepth(depth, focusField) {
  state.depth = depth;
  state.step = 0;
  renderDepth();
  renderWork();
  if (focusField) document.querySelector('#work textarea')?.focus();
}

function setMode(mode) {
  state.mode = mode;
  state.step = 0;
  writePref('fl-mode', mode);
  renderDepth();
  renderWork();
}

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

async function toggleSettled() {
  if (state.conflict || state.saving) return;
  clearTimeout(state.timer);
  const settling = state.frontmatter.status !== 'settled';
  state.saving = true;
  const result = await writeEntry({ settle: settling });
  state.saving = false;
  if (!result) return;
  setStatus(settling ? `${state.section.title} settled.` : `${state.section.title} is back to draft.`);
  document.getElementById('settle').focus();
}

// Skips live in fletcherling.json. A conflicting write rereads the file and tries once more.
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
      <p>The file was edited outside Fletcherling while you had unsaved changes here. Nothing has been overwritten. Choose which version to keep.</p>
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
