// The writer's settings, kept on disk in story-bible/fletchery-settings.json (never in browser storage), and the
// Settings panel that edits them. Changes apply at once and save a moment later.
import { StoreConflict } from './core/store.js';

export const SETTINGS_FILE = 'fletchery-settings.json';
const SAVE_DELAY_MS = 300;

const DEFAULTS = {
  version: 1,
  author: { name: '', coAuthors: '' }, // as credited, so a pen name works
  interfaceFont: 'source-sans-3', // or 'atkinson-hyperlegible'
  writingFont: 'literata', // or 'interface'
  paste: 'paragraphs', // or 'lines'
  fade: { on: true, scope: 'sidebar', pauseSeconds: 2 }, // scope 'sidebar' or 'full'
  layout: { questionMode: 'interview', sectionsFolded: false, charactersOpen: false, grid: false },
};

const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);
function merge(base, patch) {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch ?? {})) out[k] = isObject(v) && isObject(base[k]) ? merge(base[k], v) : v;
  return out;
}

// Before 2026-10-30 a few layout choices lived in browser storage. Read them once as starting values.
function legacyLayout() {
  try {
    const get = (k) => localStorage.getItem(k);
    const layout = {};
    if (get('fl-mode')) layout.questionMode = get('fl-mode');
    if (get('fl-nav')) layout.sectionsFolded = get('fl-nav') === 'collapsed';
    if (get('fl-grid')) layout.grid = get('fl-grid') === '1';
    return layout;
  } catch {
    return {};
  }
}

export class Settings {
  #store;
  #version = null; // version of the file on disk, or null when it doesn't exist yet
  #disk = {}; // the file's contents as last read
  #pending = {}; // changes not yet written
  #timer = null;
  #listeners = new Set();
  values = DEFAULTS;

  constructor(store, { onSaved, onError } = {}) {
    this.#store = store;
    this.onSaved = onSaved ?? (() => {});
    this.onError = onError ?? (() => {});
  }

  // bibleFont: the font stored in fletchery.json before settings had their own file.
  async load(bibleFont) {
    const file = await this.#store.read(SETTINGS_FILE);
    this.#version = file.version;
    this.#disk = file.exists ? this.#parse(file.content) : {};
    const seed = file.exists ? {} : { layout: legacyLayout(), ...(bibleFont ? { interfaceFont: bibleFont } : {}) };
    this.values = merge(merge(DEFAULTS, seed), this.#disk);
    this.#emit();
  }

  // Merges a partial change, applies it at once, and saves shortly after.
  update(patch) {
    this.values = merge(this.values, patch);
    this.#pending = merge(this.#pending, patch);
    this.#emit();
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.#save(), SAVE_DELAY_MS);
  }

  onChange(listener) {
    this.#listeners.add(listener);
    listener(this.values);
  }

  // The file changed on disk outside Fletchery: take it, keeping any change not yet saved here.
  async reload(version) {
    if (version === this.#version) return;
    const file = await this.#store.read(SETTINGS_FILE);
    this.#version = file.version;
    this.#disk = file.exists ? this.#parse(file.content) : {};
    this.values = merge(merge(DEFAULTS, this.#disk), this.#pending);
    this.#emit();
  }

  get version() {
    return this.#version;
  }

  async #save() {
    // A conflicting write rereads the file and tries once more, so outside edits to other settings survive.
    for (let attempt = 0; attempt < 2; attempt++) {
      const next = merge(merge(DEFAULTS, this.#disk), this.#pending);
      try {
        this.#version = await this.#store.write(SETTINGS_FILE, JSON.stringify(next, null, 2) + '\n', this.#version);
        this.#disk = next;
        this.#pending = {};
        this.onSaved();
        return;
      } catch (err) {
        if (!(err instanceof StoreConflict)) return this.onError(err);
        this.#version = err.current.exists ? err.current.version : null;
        this.#disk = err.current.exists ? this.#parse(err.current.content) : {};
      }
    }
    this.onError(new Error('the settings file keeps changing on disk'));
  }

  #parse(content) {
    try {
      return JSON.parse(content);
    } catch {
      this.onError(new Error(`story-bible/${SETTINGS_FILE} isn’t valid JSON, so the defaults are in use`));
      return {};
    }
  }

  #emit() {
    for (const listener of this.#listeners) listener(this.values);
  }
}

// ---------- The Settings panel ----------

const escAttr = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const radio = (name, value, label, current, hint) => `
  <div class="choice">
    <input type="radio" id="set-${name}-${value}" name="${name}" value="${value}"${current === value ? ' checked' : ''}${hint ? ` aria-describedby="set-${name}-${value}-hint"` : ''} />
    <label for="set-${name}-${value}">${label}</label>
    ${hint ? `<span class="hint" id="set-${name}-${value}-hint">${hint}</span>` : ''}
  </div>`;

function formHtml(v) {
  const off = v.fade.on ? '' : ' disabled';
  return `
    <fieldset>
      <legend>Credit</legend>
      <div class="field settings-text">
        <label for="set-author-name">Author</label>
        <span class="hint" id="set-author-name-hint">As the story is credited. A pen name works.</span>
        <input type="text" id="set-author-name" aria-describedby="set-author-name-hint" autocomplete="name" value="${escAttr(v.author.name)}" />
      </div>
      <div class="field settings-text">
        <label for="set-author-co">Co-authors</label>
        <span class="hint" id="set-author-co-hint">Optional. Separate names with commas.</span>
        <input type="text" id="set-author-co" aria-describedby="set-author-co-hint" autocomplete="off" value="${escAttr(v.author.coAuthors)}" />
      </div>
    </fieldset>
    <fieldset>
      <legend>Your writing</legend>
      <p class="settings-question">Font for your text</p>
      ${radio('writingFont', 'literata', 'Literata', v.writingFont, 'A serif made for long reading on screen.')}
      ${radio('writingFont', 'interface', 'The interface font', v.writingFont)}
      <p class="settings-question">When you paste several lines</p>
      ${radio('paste', 'paragraphs', 'Make each line a paragraph', v.paste, 'Best for text from Google Docs and most word processors.')}
      ${radio('paste', 'lines', 'Keep the line breaks as pasted', v.paste)}
    </fieldset>
    <fieldset>
      <legend>Interface</legend>
      <p class="settings-question">Interface font</p>
      ${radio('interfaceFont', 'source-sans-3', 'Source Sans 3', v.interfaceFont)}
      ${radio('interfaceFont', 'atkinson-hyperlegible', 'Atkinson Hyperlegible', v.interfaceFont, 'Designed for readers with low vision.')}
    </fieldset>
    <fieldset>
      <legend>Fade while typing</legend>
      <div class="choice">
        <input type="checkbox" id="set-fade-on"${v.fade.on ? ' checked' : ''} />
        <label for="set-fade-on">Fade parts of the page while you type</label>
      </div>
      <p class="settings-question">What fades</p>
      ${radio('fadeScope', 'sidebar', 'The sidebar', v.fade.scope).replace('/>', `${off} />`)}
      ${radio('fadeScope', 'full', 'Everything but your writing', v.fade.scope).replace('/>', `${off} />`)}
      <div class="field settings-select">
        <label for="set-fade-pause">Fade back in after a pause of</label>
        <select id="set-fade-pause"${off}>
          ${[1, 2, 3, 5].map((s) => `<option value="${s}"${v.fade.pauseSeconds === s ? ' selected' : ''}>${s} second${s === 1 ? '' : 's'}</option>`).join('')}
        </select>
      </div>
    </fieldset>
    <fieldset class="settings-preview" aria-describedby="set-ai-note">
      <legend>AI</legend>
      <p class="hint" id="set-ai-note">Choosing an AI arrives in a later version. Until then, Ask AI stays off.</p>
      <p class="settings-question">AI for Ask AI</p>
      ${radio('ai', 'none', 'None', 'none', 'Fletchery works fully without AI.').replace('/>', 'disabled />')}
      ${radio('ai', 'claude-code', 'Claude Code on this computer', 'none', 'Uses your Claude Code session. No key needed.').replace('/>', 'disabled />')}
      ${radio('ai', 'anthropic', 'Anthropic API', 'none', 'Reaches Claude with your Anthropic API key. Works in the web edition too.').replace('/>', 'disabled />')}
      ${radio('ai', 'gemini', 'Google Gemini API', 'none', 'Uses your Gemini API key from Google AI Studio.').replace('/>', 'disabled />')}
      ${radio('ai', 'openrouter', 'OpenRouter', 'none', 'Reaches models from OpenAI, Google, and others with one key.').replace('/>', 'disabled />')}
      <div class="field settings-select">
        <label for="set-ai-key">API key</label>
        <input type="text" id="set-ai-key" disabled autocomplete="off" />
      </div>
    </fieldset>
    <p class="hint">Saved to <code>story-bible/${SETTINGS_FILE}</code>. These settings belong to this story.</p>`;
}

// Wires the header button to a panel that slides in from the right.
export function setupSettingsPanel(settings) {
  const dialog = document.getElementById('settings-dialog');
  const body = document.getElementById('settings-body');
  const opener = document.getElementById('settings-open');

  const render = () => {
    body.innerHTML = formHtml(settings.values);
    body.querySelectorAll('input[type=radio]').forEach((r) =>
      r.addEventListener('change', () => {
        if (r.name === 'fadeScope') settings.update({ fade: { scope: r.value } });
        else settings.update({ [r.name]: r.value });
      }),
    );
    body.querySelector('#set-fade-on').addEventListener('change', (e) => {
      settings.update({ fade: { on: e.target.checked } });
      body.querySelectorAll('[name=fadeScope], #set-fade-pause').forEach((el) => (el.disabled = !e.target.checked));
    });
    body.querySelector('#set-fade-pause').addEventListener('change', (e) => settings.update({ fade: { pauseSeconds: Number(e.target.value) } }));
    body.querySelector('#set-author-name').addEventListener('input', (e) => settings.update({ author: { name: e.target.value.trim() } }));
    body.querySelector('#set-author-co').addEventListener('input', (e) => settings.update({ author: { coAuthors: e.target.value.trim() } }));
  };

  opener.addEventListener('click', () => {
    render();
    dialog.showModal();
    requestAnimationFrame(() => dialog.classList.add('is-open'));
  });
  const close = () => {
    if (!dialog.open || !dialog.classList.contains('is-open')) return;
    dialog.classList.remove('is-open');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      dialog.close();
      opener.focus();
    };
    dialog.addEventListener('transitionend', (e) => e.target === dialog && finish());
    setTimeout(finish, 400); // covers reduced motion, where no transition runs
  };
  document.getElementById('settings-close').addEventListener('click', close);
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  // A click on the backdrop lands on the dialog itself.
  dialog.addEventListener('click', (e) => e.target === dialog && close());

  // An outside edit to the file shows in an open panel.
  settings.onChange(() => {
    if (dialog.open && !body.contains(document.activeElement)) render();
  });
}
