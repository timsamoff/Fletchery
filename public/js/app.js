// First-run setup and the entry editor, with live sync and conflict handling.

const ENTRY_PATH = 'premise/premise.md';
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

async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// ---------- Start ----------

async function start() {
  setupGridToggle();
  const { data } = await api('GET', '/api/project');
  document.getElementById('project-path').textContent = data.projectDir;
  if (data.settings) showEditor(data.settings);
  else showSetup();
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
    const res = await api('POST', '/api/setup', input);
    if (!res.ok) {
      error.textContent = res.data.error ?? 'The bible couldn’t be created.';
      return;
    }
    setStatus('Bible created.');
    showEditor(res.data.settings);
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
  baseHash: null, // hash of the file version the text area is based on
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

  const { ok, data } = await api('GET', `/api/entry?path=${encodeURIComponent(ENTRY_PATH)}`);
  if (!ok) {
    setStatus(data.error ?? 'The file couldn’t be read.');
    textarea.disabled = true;
    return;
  }
  load(data);
  listen();
}

const isDirty = () => textarea.value !== state.savedBody;

function load(entry) {
  state.baseHash = entry.hash;
  state.savedBody = entry.body;
  state.frontmatter = entry.frontmatter;
  textarea.value = entry.body;
  renderMeta();
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
  const res = await api('PUT', '/api/entry', { path: ENTRY_PATH, body, baseHash: state.baseHash });
  state.saving = false;

  if (res.ok) {
    state.baseHash = res.data.hash;
    state.savedBody = body;
    state.frontmatter = res.data.frontmatter;
    renderMeta();
    setStatus(isDirty() ? 'Unsaved changes' : `Saved at ${timeNow()}`);
  } else if (res.status === 409) {
    showConflict(res.data.disk);
    return;
  } else {
    setStatus(`Couldn’t save. ${res.data.error ?? ''}`.trim());
    return;
  }

  if (state.remotePending) return checkRemote();
  if (isDirty()) state.timer = setTimeout(save, SAVE_DELAY_MS);
}

function listen() {
  const source = new EventSource('/api/events');
  source.addEventListener('change', (event) => {
    const change = JSON.parse(event.data);
    if (change.path !== ENTRY_PATH || change.hash === state.baseHash) return;
    if (state.saving) state.remotePending = true;
    else checkRemote();
  });
}

// Something changed the file on disk. Take the new version if nothing here is
// unsaved. Otherwise ask.
async function checkRemote() {
  state.remotePending = false;
  const { ok, data } = await api('GET', `/api/entry?path=${encodeURIComponent(ENTRY_PATH)}`);
  if (!ok) {
    setStatus(data.error ?? 'The file changed on disk but couldn’t be read.');
    return;
  }
  if (data.hash === state.baseHash) return;
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
    load({ ...disk, body: disk.body ?? '' });
    setStatus(action === 'copy' ? 'Your version is on the clipboard. Using the disk version.' : 'Using the disk version.');
    return;
  }
  if (action === 'overwrite') {
    const body = textarea.value;
    const res = await api('PUT', '/api/entry', { path: ENTRY_PATH, body, baseHash: disk.hash });
    if (res.status === 409) {
      state.conflict = { disk: res.data.disk, confirming: false };
      renderConflict();
      setStatus('The file changed on disk again. Nothing was overwritten.');
      document.getElementById('conflict-heading').focus();
      return;
    }
    if (!res.ok) {
      setStatus(`Couldn’t save. ${res.data.error ?? ''}`.trim());
      return;
    }
    closeConflict();
    state.baseHash = res.data.hash;
    state.savedBody = body;
    state.frontmatter = res.data.frontmatter;
    renderMeta();
    setStatus(`Saved your version at ${timeNow()}`);
  }
}

function closeConflict() {
  state.conflict = null;
  document.getElementById('conflict-slot').innerHTML = '';
  textarea.focus();
}

start();
