#!/usr/bin/env node
// Sentinel quality gate. Rules and their reasons are documented in INTEGRATION_CHECKLIST.md.
//   --msg <file>        commit-msg hook: message rules plus staged-content rules
//   --full              full-repo scan of HEAD (pre-push hook, or by hand)
//   --report            full scan without the baseline; --write-baseline saves it
//   --install           point git at sentinel-gate/hooks
//   --spec-reviewed     record that docs/SPEC.md was reread today
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GATE_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(GATE_DIR, '..');
const HOOKS_PATH = 'sentinel-gate/hooks';
const HOOK_FILES = ['commit-msg', 'pre-push'];
const EXCEPTIONS_FILE = 'sentinel-gate/exceptions.json';
const BASELINE_FILE = 'sentinel-gate/baseline.json';
const README_MAP_FILE = 'sentinel-gate/readme-map.json';
const KNOWN_EXT_FILE = path.join(GATE_DIR, 'known-extensions.txt');
const SPEC_REVIEW_FILE = path.join(ROOT, 'Sentinel-Notes', 'spec-review.json');
const TODO_FILE = 'Sentinel-Notes/TODO.md';

const SUBJECT_MAX = 100;
const BULLET_LINE_MAX = 80;
const BULLET_TOTAL_MAX = 160;
const BULLETS_MAX = 5;
const TODO_LINE_MAX = 200;
const OVERRIDE_MIN_REASON = 10;
const SPEC_REVIEW_DAYS = 90;
const ALLOWED_TRAILERS = ['Sentinel-Override'];
// Tooling folders, exempt from the SPEC gate's new-top-level-folder trigger only.
const TOOLING_DIRS = ['sentinel-gate', '.claude'];

const AGENT_VOICE = [
  'the user',
  "user's request",
  "user's direction",
  'user requested',
  'as requested',
  'per your request',
  'at your request',
  'per the user',
];
const ATTRIBUTION = [
  /co-authored-by\s*:/i,
  /generated (with|by) .*claude/i,
  /claude-session\s*:/i,
  /noreply@anthropic\.com/i,
  /\u{1F916}/u,
];
const TRAILER_RE = /^[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)*:\s+\S/;

// CSS named colors, minus keywords that aren't colors in practice.
const NAMED_COLORS = new Set(
  `aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood
  cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray
  darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen
  darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue
  firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew
  hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan
  lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray
  lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue
  mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred
  midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid
  palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple
  rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue
  slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white
  whitesmoke yellow yellowgreen`.split(/\s+/),
);
const COLOR_FN_RE = /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
const HEX = '(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})';
const CSS_HEX_RE = new RegExp(`(^|[^\\w&-])#${HEX}(?![\\w-])`, 'i');
const QUOTED_HEX_RE = new RegExp(`['"\`]#${HEX}['"\`]`, 'i');

// ---------- git ----------

function git(args, { input, quiet = false } = {}) {
  const stdio = quiet ? ['pipe', 'pipe', 'ignore'] : undefined;
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, input, stdio });
}

// For lookups where "not found" is an expected answer, so git's own error message stays out of the output.
function gitOrNull(args) {
  try {
    return git(args, { quiet: true });
  } catch {
    return null;
  }
}

const hasHead = () => gitOrNull(['rev-parse', '--verify', '-q', 'HEAD']) !== null;

// Lines added and removed per file, with added line numbers, from a unified diff with no context.
function parseDiff(text) {
  const files = new Map();
  let current = null;
  let next = 0;
  for (const line of text.split('\n')) {
    if (line.startsWith('+++ ')) {
      const p = line.slice(4).replace(/^b\//, '');
      current = { added: new Map(), removed: [] };
      if (p !== '/dev/null') files.set(p, current);
    } else if (line.startsWith('@@')) {
      const m = line.match(/\+(\d+)(?:,(\d+))?/);
      next = Number(m[1]);
    } else if (current && line.startsWith('+')) {
      current.added.set(next++, line.slice(1));
    } else if (current && line.startsWith('-') && !line.startsWith('---')) {
      current.removed.push(line.slice(1));
    }
  }
  return files;
}

// Reads what a commit would contain (the index), never the working tree.
function stagedSource() {
  const head = hasHead();
  const entries = git(['diff', '--cached', '--name-status', '-M', '-z'])
    .split('\0')
    .filter(Boolean);
  const list = [];
  for (let i = 0; i < entries.length; ) {
    const status = entries[i++];
    if (status.startsWith('R') || status.startsWith('C')) list.push({ status: status[0], old: entries[i++], path: entries[i++] });
    else list.push({ status: status[0], path: entries[i++] });
  }
  const diff = parseDiff(git(['diff', '--cached', '-U0', '--no-color', '--no-ext-diff', '-M']));
  return {
    mode: 'staged',
    entries: list,
    files: () => list.filter((e) => e.status !== 'D').map((e) => e.path),
    read: (p) => gitOrNull(['show', `:${p}`]),
    readHead: (p) => (head ? gitOrNull(['show', `HEAD:${p}`]) : null),
    inScope: (p, lineNo) => diff.get(p)?.added.has(lineNo) ?? false,
    diffFor: (p) => diff.get(p) ?? { added: new Map(), removed: [] },
  };
}

function headSource() {
  const files = hasHead() ? git(['ls-tree', '-r', '--name-only', '-z', 'HEAD']).split('\0').filter(Boolean) : [];
  return {
    mode: 'full',
    entries: [],
    files: () => files,
    read: (p) => gitOrNull(['show', `HEAD:${p}`]),
    readHead: (p) => gitOrNull(['show', `HEAD:${p}`]),
    inScope: () => true,
    diffFor: () => ({ added: new Map(), removed: [] }),
  };
}

// ---------- shared helpers ----------

function violation(rule, file, line, content, fix, { overridable = false } = {}) {
  return { rule, file, line, content: (content ?? '').trim(), fix, overridable };
}

function stripQuoted(text) {
  return text.replace(/'[^']*'|"[^"]*"/g, ' ');
}

// Splits CSS into lines with comments blanked out, keeping line numbers.
function cssLines(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .split('\n');
}

// The value part of a CSS line: after the first colon, or the whole line for a wrapped value.
function cssValue(line) {
  const t = line.trim();
  if (!t || t.endsWith('{') || t === '}' || t.startsWith('@')) return null;
  const colon = t.indexOf(':');
  return colon >= 0 ? t.slice(colon + 1) : t;
}

function colorProblems(value) {
  const v = stripQuoted(value);
  const found = [];
  if (CSS_HEX_RE.test(v)) found.push('hex color');
  if (COLOR_FN_RE.test(v)) found.push('color function');
  for (const word of v.toLowerCase().split(/[^a-z-]+/)) {
    if (NAMED_COLORS.has(word)) found.push(`named color "${word}"`);
  }
  return found;
}

const readJson = (src, p) => {
  const text = src.read(p);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`${p} is not valid JSON (${err.message}).`);
  }
};

function sectionIds(json) {
  const list = Array.isArray(json) ? json : Array.isArray(json?.sections) ? json.sections : [];
  return new Set(list.map((s) => s?.id).filter(Boolean));
}

// ---------- content rules ----------

// No color literals outside tokens.css. tokens.css is exempt from this rule only: it is where colors are defined.
function ruleColorLiterals(src) {
  const out = [];
  for (const file of src.files()) {
    if (!/^public\/.+\.(css|html|js)$/.test(file) || file === 'public/css/tokens.css') continue;
    const content = src.read(file);
    if (content === null) continue;
    const fix = 'Use a color token from public/css/tokens.css, or add a new token there.';
    if (file.endsWith('.css')) {
      cssLines(content).forEach((line, i) => {
        const value = cssValue(line);
        if (value === null || !src.inScope(file, i + 1)) return;
        for (const p of colorProblems(value)) out.push(violation('color-literal', file, i + 1, line, `${p}: ${fix}`));
      });
    } else if (file.endsWith('.html')) {
      content
        .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '))
        .split('\n')
        .forEach((line, i) => {
          if (!src.inScope(file, i + 1)) return;
          const attrs = [...line.matchAll(/\b(style|fill|stroke|color|bgcolor)\s*=\s*(["'])(.*?)\2/gi)];
          for (const [, , , value] of attrs) {
            for (const p of colorProblems(value)) out.push(violation('color-literal', file, i + 1, line, `${p}: ${fix}`));
          }
        });
    } else {
      content.split('\n').forEach((line, i) => {
        if (!src.inScope(file, i + 1)) return;
        const code = line.replace(/(^|\s)\/\/.*$/, '');
        if (QUOTED_HEX_RE.test(code)) out.push(violation('color-literal', file, i + 1, line, `hex color: ${fix}`));
        if (/['"`][^'"`]*\b(rgba?|hsla?)\(/i.test(code)) out.push(violation('color-literal', file, i + 1, line, `color function: ${fix}`));
      });
    }
  }
  return out;
}

// No raw px values that equal a rhythm token (--line, --space-N, --border), read from the version of tokens.css being checked.
function ruleRawTokens(src) {
  const tokens = src.read('public/css/tokens.css');
  if (tokens === null) return [];
  const byValue = new Map();
  for (const [, name, value] of tokens.matchAll(/(--(?:line|space-\d+|border))\s*:\s*(\d+px)\s*;/g)) {
    byValue.set(value, [...(byValue.get(value) ?? []), `var(${name})`]);
  }
  const out = [];
  for (const file of src.files()) {
    if (!/^public\/css\/.+\.css$/.test(file) || file === 'public/css/tokens.css') continue;
    const content = src.read(file);
    if (content === null) continue;
    cssLines(content).forEach((line, i) => {
      const value = cssValue(line);
      if (value === null || !src.inScope(file, i + 1)) return;
      for (const [px] of stripQuoted(value).matchAll(/(?<![\w.-])\d+px(?![\w-])/g)) {
        if (byValue.has(px)) {
          out.push(violation('raw-token-value', file, i + 1, line, `${px} has a token: use ${byValue.get(px).join(' or ')}.`));
        }
      }
    });
  }
  return out;
}

function ruleTodoFormat(src) {
  if (!src.files().includes(TODO_FILE)) return [];
  const content = src.read(TODO_FILE);
  if (content === null) return [];
  const out = [];
  content.split('\n').forEach((raw, i) => {
    const line = raw.replace(/\r$/, '');
    if (!src.inScope(TODO_FILE, i + 1)) return;
    if (/^\s+\S/.test(line)) {
      out.push(violation('todo-format', TODO_FILE, i + 1, line, 'TODO items are one line with no sub-lines. Move the detail into a design brief and link it.'));
    } else if (line.startsWith('- ')) {
      if (!/^- \[[ x]\] \S/.test(line)) out.push(violation('todo-format', TODO_FILE, i + 1, line, 'Items start with "- [ ] " or "- [x] ".'));
      if (line.length > TODO_LINE_MAX) {
        out.push(violation('todo-format', TODO_FILE, i + 1, line, `Items are at most ${TODO_LINE_MAX} characters (this one is ${line.length}). Move the detail into a design brief.`));
      }
    }
  });
  return out;
}

function ruleReadmeMap(src) {
  const map = readJson(src, README_MAP_FILE);
  if (map === null) return [];
  if (!Array.isArray(map)) throw new Error(`${README_MAP_FILE} must be an array of { feature, phrase }.`);
  const readme = (src.read('README.md') ?? '').toLowerCase();
  const out = [];
  for (const entry of map) {
    if (!entry?.feature || !entry?.phrase) throw new Error(`${README_MAP_FILE} has an entry without "feature" and "phrase".`);
    if (!readme.includes(entry.phrase.toLowerCase())) {
      out.push(
        violation(
          'readme-map',
          'README.md',
          null,
          entry.feature,
          `README.md doesn't mention "${entry.phrase}" for ${entry.feature}. This is a presence check only: it can't tell whether the description is accurate.`,
          { overridable: true },
        ),
      );
    }
  }
  return out;
}

// ---------- staged-only rules ----------

function ruleDocGates(src) {
  const staged = (p) => src.entries.some((e) => e.path === p || e.old === p);
  const changed = (re) => src.entries.filter((e) => re.test(e.path) || (e.old && re.test(e.old))).map((e) => e.path);
  const added = (re) => src.entries.filter((e) => (e.status === 'A' || e.status === 'C') && re.test(e.path)).map((e) => e.path);
  const addedLinesMatch = (file, re) => [...src.diffFor(file).added.values()].some((l) => re.test(l));
  const jsonPart = (text, keys) => {
    try {
      const j = JSON.parse(text ?? '{}');
      return JSON.stringify(keys.map((k) => j[k] ?? null));
    } catch {
      return null;
    }
  };
  const pkgChanged = (keys) => staged('package.json') && jsonPart(src.read('package.json'), keys) !== jsonPart(src.readHead('package.json'), keys);

  const out = [];
  const gate = (name, companion, triggers, fix) => {
    const hits = [...new Set(triggers.filter(Boolean))];
    if (hits.length && !staged(companion)) {
      out.push(violation(name, companion, null, `triggered by: ${hits.join(', ')}`, fix, { overridable: true }));
    }
  };

  const sectionFiles = changed(/^sections\/[^/]+\.json$/);

  gate(
    'claude-md-gate',
    'CLAUDE.md',
    [
      ...sectionFiles,
      ...added(/^(server|public\/js|skills|scripts)\//),
      staged('server/server.js') && addedLinesMatch('server/server.js', /route === '/) ? 'server/server.js (new route)' : null,
      staged('bin/fletchery.js') && addedLinesMatch('bin/fletchery.js', /'--[a-z][a-z-]*/) ? 'bin/fletchery.js (new flag)' : null,
    ],
    'Record the new section, feature, or decision in CLAUDE.md in this commit. Did anything change that a future session needs to know?',
  );

  gate(
    'readme-gate',
    'README.md',
    [
      staged('bin/fletchery.js') ? 'bin/fletchery.js' : null,
      pkgChanged(['bin', 'engines']) ? 'package.json (bin or engines)' : null,
      ...sectionFiles,
      ...changed(/^(skills|scripts)\//),
    ],
    'Update README.md for the change in what users can run, install, or use. Does the README still describe this accurately?',
  );

  const headHas = (top) => gitOrNull(['ls-tree', '--name-only', 'HEAD', top])?.trim();
  const newTopDirs = added(/\//)
    .map((p) => p.split('/')[0])
    .filter((top) => !TOOLING_DIRS.includes(top) && !headHas(top));
  const bibleDiff = src.diffFor('server/bible.js');
  const formatRe = /serializeEntry|parseEntry|FRONTMATTER|YAML|writeAtomic|TMP_PREFIX/;
  const newSections = [];
  for (const file of sectionFiles) {
    const before = sectionIds(safeJson(src.readHead(file)));
    for (const id of sectionIds(safeJson(src.read(file)))) if (!before.has(id)) newSections.push(`${file} (new section "${id}")`);
  }
  gate(
    'spec-gate',
    'docs/SPEC.md',
    [
      ...newTopDirs.map((d) => `${d}/ (new top-level folder)`),
      ...added(/^server\/[^/]+\.js$/).map((p) => `${p} (new server module)`),
      pkgChanged(['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) ? 'package.json (dependencies)' : null,
      [...bibleDiff.added.values(), ...bibleDiff.removed].some((l) => formatRe.test(l)) ? 'server/bible.js (file format)' : null,
      ...newSections,
    ],
    'Update docs/SPEC.md: it records the architecture, the bible format, and the section lists.',
  );

  // A brief that changes, moves, or is archived needs its TODO line updated in the same commit.
  const briefRe = /^Sentinel-Notes\/(archive\/)?[^/]+-design-brief\.md$/;
  const todoDiff = src.diffFor(TODO_FILE);
  const todoLines = [...todoDiff.added.values(), ...todoDiff.removed].join('\n');
  for (const e of src.entries) {
    const p = briefRe.test(e.path) ? e.path : e.old && briefRe.test(e.old) ? e.old : null;
    if (!p) continue;
    const name = path.posix.basename(p);
    if (!todoLines.includes(name)) {
      out.push(
        violation(
          'todo-sync',
          TODO_FILE,
          null,
          `${e.path} changed`,
          `Update the TODO.md line that links ${name} (status, wording, or move it to Done) in this commit.`,
          { overridable: true },
        ),
      );
    }
  }
  return out;
}

function safeJson(text) {
  try {
    return JSON.parse(text ?? 'null');
  } catch {
    return null;
  }
}

function extKey(p) {
  const base = path.posix.basename(p);
  const ext = path.posix.extname(base).toLowerCase();
  if (ext) return ext;
  return base.startsWith('.') ? base : '(none)';
}

// Standing default: the first file of a new kind gets a short set of questions.
function ruleNewExtensions(src) {
  if (!fs.existsSync(KNOWN_EXT_FILE)) throw new Error('sentinel-gate/known-extensions.txt is missing. Run: node sentinel-gate/check.js --seed-extensions');
  const known = new Set(fs.readFileSync(KNOWN_EXT_FILE, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
  const fresh = new Map();
  for (const e of src.entries) {
    if (e.status === 'D') continue;
    const key = extKey(e.path);
    if (!known.has(key) && !fresh.has(key)) fresh.set(key, e.path);
  }
  if (!fresh.size) return [];
  fs.appendFileSync(KNOWN_EXT_FILE, [...fresh.keys()].map((k) => `${k}\n`).join(''));
  return [...fresh].map(([key, file]) =>
    violation(
      'new-file-type',
      file,
      null,
      `first "${key}" file in this project`,
      [
        'Answer these, then commit again (stage sentinel-gate/known-extensions.txt with it):',
        '  1. What kind of file is this, in plain terms?',
        '  2. Does it need the creative-media check in the design audit (01, Part 7)? If so, raise it at the next 01 run.',
        '  3. Does this kind of file get referenced elsewhere (a registry, rendering, saving)? If so, add a TODO for the next 02 run.',
        '  A one-off with no standing implication needs nothing more.',
      ].join('\n'),
    ),
  );
}

// ---------- commit message ----------

function parseMessage(raw) {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const scissors = lines.findIndex((l) => /^# -+ >8 -+$/.test(l));
  const kept = (scissors >= 0 ? lines.slice(0, scissors) : lines).filter((l) => !l.startsWith('#'));
  while (kept.length && !kept[kept.length - 1].trim()) kept.pop();
  while (kept.length && !kept[0].trim()) kept.shift();
  return kept;
}

function splitParagraphs(lines) {
  const paras = [];
  let cur = [];
  for (const l of lines) {
    if (l.trim()) cur.push(l);
    else if (cur.length) {
      paras.push(cur);
      cur = [];
    }
  }
  if (cur.length) paras.push(cur);
  return paras;
}

function getOverride(lines) {
  const paras = splitParagraphs(lines.slice(1));
  const last = paras[paras.length - 1] ?? [];
  if (!last.every((l) => TRAILER_RE.test(l))) return null;
  for (const l of last) {
    const m = l.match(/^Sentinel-Override:\s*(.*)$/);
    if (m && m[1].trim().length >= OVERRIDE_MIN_REASON) return m[1].trim();
  }
  return null;
}

function ruleMessage(raw, where = 'commit message') {
  const lines = parseMessage(raw);
  const out = [];
  const v = (rule, content, fix, opts) => out.push(violation(rule, where, null, content, fix, opts));
  if (!lines.length) return out;

  const subject = lines[0];
  if (subject.length > SUBJECT_MAX) {
    v('msg-subject', subject, `The subject is ${subject.length} characters; the limit is ${SUBJECT_MAX}. Say it more briefly, or split the commit.`);
  }

  lines.forEach((l) => {
    if (ATTRIBUTION.some((re) => re.test(l))) v('msg-attribution', l, 'Remove tool attribution and co-author lines. Commits read as your own.');
  });
  const lower = lines.join('\n').toLowerCase();
  for (const phrase of AGENT_VOICE) {
    if (lower.includes(phrase)) {
      v('msg-agent-voice', phrase, 'Describe the change itself, not who asked for it. (This is a phrase list and misses wordings it does not contain; CLAUDE.md carries the full rule.)');
    }
  }

  const rest = lines.slice(1);
  if (!rest.some((l) => l.trim())) return out;
  if (rest[0].trim()) v('msg-structure', rest[0], 'Leave a blank line between the subject and the body.');

  const paras = splitParagraphs(rest);
  const last = paras[paras.length - 1];
  const trailers = last.every((l) => TRAILER_RE.test(l)) ? paras.pop() : [];
  for (const t of trailers) {
    const key = t.split(':')[0];
    if (!ALLOWED_TRAILERS.includes(key)) v('msg-trailer', t, `"${key}:" is not an allowed trailer. Allowed: ${ALLOWED_TRAILERS.join(', ')}.`);
  }
  if (paras.length > 1) {
    v('msg-structure', `${paras.length} body paragraphs`, 'The body is one list of "- " bullets, not paragraphs. Split the commit if it covers separate things.');
  }

  const bullets = [];
  for (const l of paras.flat()) {
    if (l.startsWith('- ')) bullets.push([l]);
    else if (/^\s{2,}\S/.test(l) && bullets.length && bullets[bullets.length - 1].length === 1 && bullets[bullets.length - 1][0].startsWith('- ')) {
      bullets[bullets.length - 1].push(l);
    } else if (/^\s{2,}\S/.test(l) && bullets.length) {
      v('msg-structure', l, 'A bullet may wrap onto one indented line, not more.');
    } else {
      v('msg-structure', l, 'Every body line starts with "- " (or is one indented continuation of the bullet above). Prose bodies are not allowed.');
    }
  }
  for (const b of bullets) {
    for (const l of b) {
      if (l.length > BULLET_LINE_MAX) v('msg-bullet', l, `Bullet lines are at most ${BULLET_LINE_MAX} characters (this is ${l.length}).`);
    }
    const total = b.map((l) => l.trim()).join(' ').length;
    if (b.length > 1 && total > BULLET_TOTAL_MAX) {
      v('msg-bullet', b[0], `A wrapped bullet is at most ${BULLET_TOTAL_MAX} characters across both lines (this is ${total}).`);
    }
  }
  if (bullets.length > BULLETS_MAX) {
    v(
      'msg-bullet-count',
      `${bullets.length} bullets`,
      `Does this commit bundle several separate things? Consider splitting it. If it's one coherent change, describe it with ${BULLETS_MAX} or fewer broader bullets. Tim can add "Sentinel-Override: <reason>" if neither works.`,
      { overridable: true },
    );
  }
  return out;
}

// ---------- exceptions and baseline ----------

function loadExceptions(src) {
  const list = readJson(src, EXCEPTIONS_FILE) ?? [];
  if (!Array.isArray(list)) throw new Error(`${EXCEPTIONS_FILE} must be an array.`);
  for (const e of list) {
    for (const k of ['rule', 'file', 'pattern', 'reason', 'owner', 'review_by']) {
      if (!e?.[k] || typeof e[k] !== 'string') throw new Error(`${EXCEPTIONS_FILE}: every entry needs a "${k}" string.`);
    }
    if (/[*?[\]]/.test(e.file)) throw new Error(`${EXCEPTIONS_FILE}: "${e.file}" uses a wildcard. Name one exact file.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.review_by)) throw new Error(`${EXCEPTIONS_FILE}: review_by must be YYYY-MM-DD.`);
  }
  return list;
}

function applyExceptions(violations, exceptions, notes) {
  const today = new Date().toISOString().slice(0, 10);
  return violations.filter((v) => {
    const match = exceptions.find((e) => e.rule === v.rule && e.file === v.file && v.content.includes(e.pattern));
    if (!match) return true;
    if (match.review_by < today) {
      v.fix += ` (An exception for this expired on ${match.review_by}.)`;
      return true;
    }
    notes.push(`Exception applied: ${v.rule} in ${v.file} (${match.reason}; review by ${match.review_by}).`);
    return false;
  });
}

const baselineKey = (v) => `${v.rule}\u0000${v.file}\u0000${v.content}`;

// ---------- full scan ----------

function hookIntegrity() {
  const out = [];
  const configured = gitOrNull(['config', '--get', 'core.hooksPath'])?.trim();
  if (configured !== HOOKS_PATH) {
    out.push(violation('hooks-installed', '.git/config', null, `core.hooksPath is ${configured || 'unset'}`, 'Run: npm run sentinel:install'));
  }
  const modes = gitOrNull(['ls-files', '-s', ...HOOK_FILES.map((h) => `${HOOKS_PATH}/${h}`)]) ?? '';
  for (const h of HOOK_FILES) {
    const file = `${HOOKS_PATH}/${h}`;
    if (!fs.existsSync(path.join(ROOT, file))) out.push(violation('hooks-installed', file, null, 'missing', 'Restore the hook file from git.'));
    else if (!new RegExp(`^100755 .*\\t${file}$`, 'm').test(modes)) {
      out.push(violation('hooks-installed', file, null, 'not executable in git', `Run: git update-index --chmod=+x ${file}`));
    }
  }
  return out;
}

function ruleSectionConsistency(src) {
  const spec = (src.read('docs/SPEC.md') ?? '').toLowerCase();
  const map = safeJson(src.read(README_MAP_FILE)) ?? [];
  const phrases = map.map((e) => String(e?.phrase ?? '').toLowerCase());
  const out = [];
  for (const file of src.files().filter((f) => /^sections\/[^/]+\.json$/.test(f))) {
    for (const id of sectionIds(readJson(src, file))) {
      if (!spec.includes(id.toLowerCase())) out.push(violation('section-consistency', 'docs/SPEC.md', null, `${file}: ${id}`, `docs/SPEC.md doesn't mention section "${id}".`));
      if (!phrases.some((p) => p.includes(id.toLowerCase()))) {
        out.push(violation('section-consistency', README_MAP_FILE, null, `${file}: ${id}`, `${README_MAP_FILE} has no entry for section "${id}".`));
      }
    }
  }
  return out;
}

function pushedCommits(prePushArgs) {
  if (prePushArgs) {
    const stdin = fs.readFileSync(0, 'utf8');
    const shas = [];
    for (const line of stdin.split('\n').filter(Boolean)) {
      const [, localSha, , remoteSha] = line.split(' ');
      if (/^0+$/.test(localSha)) continue;
      const range = /^0+$/.test(remoteSha) ? [localSha, '--not', '--remotes'] : [`${remoteSha}..${localSha}`];
      shas.push(...git(['rev-list', ...range]).split('\n').filter(Boolean));
    }
    return shas;
  }
  return hasHead() ? git(['rev-list', 'HEAD', '--not', '--remotes']).split('\n').filter(Boolean) : [];
}

function specReminder() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const state = fs.existsSync(SPEC_REVIEW_FILE) ? JSON.parse(fs.readFileSync(SPEC_REVIEW_FILE, 'utf8')) : null;
    const days = state ? (Date.now() - Date.parse(state.lastReviewed)) / 86400000 : Infinity;
    if (!state || state.version !== pkg.version || days > SPEC_REVIEW_DAYS) {
      return `Reminder (not blocking): reread docs/SPEC.md against the code${state ? ` (last reviewed ${state.lastReviewed} at version ${state.version})` : ''}, then run: npm run sentinel:spec-reviewed`;
    }
  } catch {
    return 'Reminder (not blocking): could not read the SPEC review record. Run: npm run sentinel:spec-reviewed';
  }
  return null;
}

// ---------- output ----------

function report(violations, notes, heading) {
  for (const n of notes) console.log(n);
  if (!violations.length) return;
  console.error(`\nSentinel: ${heading} (${violations.length})\n`);
  for (const v of violations) {
    console.error(`FAIL [${v.rule}] ${v.file}${v.line ? `:${v.line}` : ''}`);
    if (v.content) console.error(`  ${v.content}`);
    console.error(`  -> ${v.fix.replace(/\n/g, '\n     ')}\n`);
  }
}

// ---------- modes ----------

function runCommitMsg(msgFile) {
  const raw = fs.readFileSync(msgFile, 'utf8');
  const src = stagedSource();
  const notes = [];
  const merging = fs.existsSync(path.join(git(['rev-parse', '--git-dir']).trim(), 'MERGE_HEAD'));
  let found = [
    ...ruleMessage(raw),
    ...ruleColorLiterals(src),
    ...ruleRawTokens(src),
    ...ruleTodoFormat(src),
    ...ruleReadmeMap(src),
    // Merge commits combine work that was already checked commit by commit.
    ...(merging ? [] : [...ruleDocGates(src), ...ruleNewExtensions(src)]),
  ];
  found = applyExceptions(found, loadExceptions(src), notes);
  const override = getOverride(parseMessage(raw));
  if (override) {
    const skipped = found.filter((v) => v.overridable);
    if (skipped.length) notes.push(`Sentinel-Override used ("${override}") for: ${[...new Set(skipped.map((v) => v.rule))].join(', ')}.`);
    found = found.filter((v) => !v.overridable);
  }
  const reminder = src.entries.some((e) => /^(server|public|bin|sections|skills|scripts)\//.test(e.path)) && !src.entries.some((e) => e.path === TODO_FILE);
  if (reminder) notes.push('Reminder (not blocking): does Sentinel-Notes/TODO.md need an update for this change?');
  report(found, notes, 'commit blocked');
  return found.length ? 1 : 0;
}

function runFull({ useBaseline, prePushArgs, writeBaseline }) {
  const src = headSource();
  const notes = [];
  let found = [
    ...hookIntegrity(),
    ...ruleColorLiterals(src),
    ...ruleRawTokens(src),
    ...ruleTodoFormat(src),
    ...ruleReadmeMap(src),
    ...ruleSectionConsistency(src),
  ];
  for (const sha of pushedCommits(prePushArgs)) {
    const msg = git(['log', '-1', '--format=%B', sha]);
    let msgFound = ruleMessage(msg, `commit ${sha.slice(0, 7)}`);
    if (getOverride(parseMessage(msg))) msgFound = msgFound.filter((v) => !v.overridable);
    found.push(...msgFound);
  }
  found = applyExceptions(found, loadExceptions(src), notes);

  if (writeBaseline) {
    const entries = found.filter((v) => v.rule !== 'hooks-installed').map(({ rule, file, content }) => ({ rule, file, content }));
    fs.writeFileSync(path.join(ROOT, BASELINE_FILE), JSON.stringify(entries, null, 2) + '\n');
    console.log(`Wrote ${entries.length} baseline entries to ${BASELINE_FILE}.`);
  }
  if (useBaseline) {
    // Counted, so a new copy of an already-known line still blocks.
    const known = new Map();
    for (const e of readJson(src, BASELINE_FILE) ?? []) known.set(baselineKey(e), (known.get(baselineKey(e)) ?? 0) + 1);
    const before = found.length;
    found = found.filter((v) => {
      const left = known.get(baselineKey(v)) ?? 0;
      if (left > 0) known.set(baselineKey(v), left - 1);
      return left === 0;
    });
    if (before !== found.length) notes.push(`${before - found.length} known backlog item(s) from ${BASELINE_FILE} not blocking (tracked in Sentinel-Notes/TODO.md).`);
  }
  const reminder = specReminder();
  if (reminder) notes.push(reminder);
  report(found, notes, useBaseline ? 'full scan failed' : 'report');
  return found.length && useBaseline ? 1 : 0;
}

function runInstall() {
  if (gitOrNull(['rev-parse', '--is-inside-work-tree'])?.trim() !== 'true') {
    console.log('Sentinel: not a git work tree, so the hooks were not installed.');
    return 0;
  }
  git(['config', 'core.hooksPath', HOOKS_PATH]);
  console.log(`Sentinel: git hooks enabled (core.hooksPath = ${HOOKS_PATH}).`);
  return 0;
}

function runSeedExtensions() {
  const names = [
    ...(gitOrNull(['log', '--all', '--name-only', '--format=']) ?? '').split('\n'),
    ...git(['ls-files']).split('\n'),
    ...git(['ls-files', '--others', '--exclude-standard']).split('\n'),
  ].filter(Boolean);
  const keys = [...new Set(names.map(extKey))].sort();
  fs.writeFileSync(KNOWN_EXT_FILE, keys.join('\n') + '\n');
  console.log(`Seeded ${keys.length} known file types into sentinel-gate/known-extensions.txt.`);
  return 0;
}

function runSpecReviewed() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const state = { lastReviewed: new Date().toISOString().slice(0, 10), version: pkg.version };
  fs.writeFileSync(SPEC_REVIEW_FILE, JSON.stringify(state, null, 2) + '\n');
  console.log(`Recorded SPEC review: ${state.lastReviewed}, version ${state.version}.`);
  return 0;
}

const args = process.argv.slice(2);
try {
  let code;
  if (args[0] === '--msg') code = runCommitMsg(args[1]);
  else if (args[0] === '--full') code = runFull({ useBaseline: true, prePushArgs: args.includes('--pre-push') });
  else if (args[0] === '--report') code = runFull({ useBaseline: false, writeBaseline: args.includes('--write-baseline') });
  else if (args[0] === '--install') code = runInstall();
  else if (args[0] === '--seed-extensions') code = runSeedExtensions();
  else if (args[0] === '--spec-reviewed') code = runSpecReviewed();
  else {
    console.error('Usage: check.js --msg <file> | --full | --report [--write-baseline] | --install | --seed-extensions | --spec-reviewed');
    code = 2;
  }
  process.exit(code);
} catch (err) {
  // Never let a failure inside the gate pass as a clean result.
  console.error(`Sentinel: unable to verify. ${err.message}`);
  process.exit(2);
}
