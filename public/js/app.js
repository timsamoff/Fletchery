// First-run setup and the entry editor, with live sync and conflict handling.
import { parseEntry, withBody } from './core/entry.js';
import { LocalServerStore, StoreConflict } from './core/store.js';

const store = new LocalServerStore();
const SETTINGS_PATH = 'fletcherling.json';
const ENTRY_PATH = 'premise/premise.md';
const ENTRY_TEMPLATE = { title: 'Premise', type: 'premise' };
const SAVE_DELAY_MS = 500;

const view = document.getElementById('view');
const statusEl = document.getElementById('save-status');
const main = document.getElementById('main');

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const timeNow = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function setStatus(text) {
  statusEl.textContent = text;
}

// A stored file plus its parsed entry. Throws EntryFormatError for broken frontmatter.
function toEntry(file) {
  const parsed = file.exists ? parseEntry(file.content) : { frontmatter: {}, body: '' };
  return { ...file, ...parsed };
}

function showProblem(heading, message) {
  view.innerHTML = `<h1>${esc(heading)}</h1><p>${esc(message)}</p>`;
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
    showEditor(settings);
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
    try {
      localStorage.setItem('fl-grid', on ? '1' : '0');
    } catch {}
  };
  let saved = false;
  try {
    saved = localStorage.getItem('fl-grid') === '1';
  } catch {}
  set(saved);
  button.addEventListener('click', () => set(button.getAttribute('aria-pressed') !== 'true'));
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
      createdAt: new Date().toISOString(),
    };
    try {
      await store.write(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n', null);
      const entry = await store.read(ENTRY_PATH);
      if (!entry.exists) await store.write(ENTRY_PATH, withBody(null, '', ENTRY_TEMPLATE), null);
    } catch (err) {
      error.textContent = err instanceof StoreConflict ? 'This project is already set up. Reload the page.' : err.message;
      return;
    }
    setStatus('Bible created.');
    showEditor(settings);
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

// ---------- Editor ----------

const state = {
  baseVersion: null, // stored version the text area is based on
  baseContent: null, // that version's full file content, frontmatter included
  savedBody: '', // body as last loaded or saved
  frontmatter: {},
  saving: false,
  timer: null,
  remotePending: false,
  conflict: null, // { disk, confirming }
};

let textarea;

async function showEditor(settings) {
  applySettings(settings);
  view.innerHTML = `
    <h1>Premise</h1>
    <p>Saved to <code>story-bible/${ENTRY_PATH}</code> as you type. Changes made to that file in another editor appear here.</p>
    <div id="conflict-slot"></div>
    <div class="field">
      <label for="entry-body">Premise text</label>
      <textarea id="entry-body" rows="8" spellcheck="true"></textarea>
    </div>
    <dl class="entry-meta" id="entry-meta"></dl>`;
  textarea = document.getElementById('entry-body');
  textarea.addEventListener('input', onInput);
  textarea.addEventListener('blur', () => save());

  try {
    load(toEntry(await store.read(ENTRY_PATH)));
  } catch (err) {
    if (err.detail) console.error(`${ENTRY_PATH}: ${err.detail}`);
    setStatus(err.message);
    textarea.disabled = true;
    return;
  }
  listen();
}

const isDirty = () => textarea.value !== state.savedBody;

function load(entry) {
  state.baseVersion = entry.version;
  state.baseContent = entry.exists ? entry.content : null;
  state.savedBody = entry.body;
  state.frontmatter = entry.frontmatter;
  textarea.value = entry.body;
  renderMeta();
}

// Writes the body on top of baseVersion. Returns true when saved; shows the conflict panel otherwise.
async function writeBody(body, baseVersion, baseContent) {
  const content = withBody(baseContent, body, ENTRY_TEMPLATE);
  try {
    const version = await store.write(ENTRY_PATH, content, baseVersion);
    state.baseVersion = version;
    state.baseContent = content;
    state.savedBody = body;
    state.frontmatter = parseEntry(content).frontmatter;
    renderMeta();
    return true;
  } catch (err) {
    if (!(err instanceof StoreConflict)) {
      setStatus(`Couldn’t save. ${err.message}`);
      return false;
    }
    try {
      showConflict(toEntry(err.current));
    } catch (parseErr) {
      setStatus(`Not saved. The file changed on disk and can’t be read. ${parseErr.message}`);
    }
    return false;
  }
}

function renderMeta() {
  const fm = state.frontmatter;
  const updated = fm.updated ? new Date(fm.updated).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'never';
  const item = (label, value) => `<div><dt>${label}</dt><dd>${esc(value ?? 'not set')}</dd></div>`;
  document.getElementById('entry-meta').innerHTML =
    item('Depth', fm.depth) + item('Status', fm.status) + item('Author', fm.author) + item('Updated', updated);
}

function onInput() {
  if (state.conflict) {
    // Saving waits until the conflict is resolved. Keep "Your version" current.
    document.getElementById('conflict-mine').value = textarea.value;
    return;
  }
  if (statusEl.textContent !== 'Unsaved changes') setStatus('Unsaved changes');
  clearTimeout(state.timer);
  state.timer = setTimeout(save, SAVE_DELAY_MS);
}

async function save() {
  clearTimeout(state.timer);
  if (state.saving || state.conflict || !isDirty()) return;
  state.saving = true;
  const body = textarea.value;
  setStatus('Saving…');
  const saved = await writeBody(body, state.baseVersion, state.baseContent);
  state.saving = false;
  if (!saved) return;
  setStatus(isDirty() ? 'Unsaved changes' : `Saved at ${timeNow()}`);

  if (state.remotePending) return checkRemote();
  if (isDirty()) state.timer = setTimeout(save, SAVE_DELAY_MS);
}

function listen() {
  store.changes((change) => {
    if (change.path !== ENTRY_PATH || change.version === state.baseVersion) return;
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
    data = toEntry(await store.read(ENTRY_PATH));
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
  const { selectionStart, selectionEnd } = textarea;
  const hadFocus = document.activeElement === textarea;
  load(data);
  if (hadFocus) textarea.setSelectionRange(selectionStart, selectionEnd);
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
  document.getElementById('conflict-mine').value = textarea.value;
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
      await navigator.clipboard.writeText(textarea.value);
    } catch {
      setStatus('Couldn’t copy your version, so the disk version wasn’t loaded.');
      return;
    }
  }
  if (action === 'disk' || action === 'copy') {
    closeConflict();
    load(disk);
    setStatus(action === 'copy' ? 'Your version is on the clipboard. Using the disk version.' : 'Using the disk version.');
    return;
  }
  if (action === 'overwrite') {
    const open = state.conflict;
    state.conflict = null; // lets writeBody reopen the panel if the file changed again
    if (!(await writeBody(textarea.value, disk.version, disk.exists ? disk.content : null))) {
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
  textarea.focus();
}

start();
