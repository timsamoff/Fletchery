# Integration checklist: Fletcherling

Sentinel `02-integration-audit.md` 1.6.1, run 2026-10-29 against commit `79f62a0`. The recurring unit of work is **a bible section** (Premise, Characters, Factions, and so on).

**How this was grounded.** The project has three commits and one partly built section (Premise), so it has little history to mine. Each item is marked by its source:
- **[code]**: the skeleton's code hardcodes or depends on it today.
- **[history]**: something actually broke or drifted during development, even if it's fixed now.
- **[plan]**: the approved plan or `docs/SPEC.md` commits to it, but it isn't built yet. Revisit these items once the Characters phase exists.

**Coverage.** No hooks, CI, scripts, or tests exist, so every item below is **Not covered** (see Part 0). Failure modes are **silent** (looks fine, behaves wrong) or **loud** (error, crash, visible break).

## Surfaces

1. **App** (`bin/`, `server/`, `public/`): one process, one API, one token file.
2. **Skills** (`skills/`, `scripts/`): planned. They read the same bible format but share no code with the app, so every format change has to be made in both places by hand.

## Part 0: existing checks

None. No git hooks (`core.hooksPath` unset, only samples in `.git/hooks`), no CI, no npm scripts, no test suite, no pre-commit framework. New checks use Sentinel's own conventions (`sentinel-exceptions.json`, the `Sentinel-Override:` trailer), since there's no house style to match.

Folded in from `Sentinel-Notes/design-quality-audit.md`: color literals, raw token values, automated axe checks, and frontmatter completeness (items 2.2, 6.1, 6.2, 6.3 below).

Folded in from `PROJECT_PROFILE.md`'s follow-up list:
- Tracking `Sentinel-Prompts/`: TODO line.
- `first-prompt/`: kept private by decision. It's gitignored and was never committed.
- Gitignored context files: resolved, because `CLAUDE.md` and `Sentinel-Notes/` are now committed.
- No tests: TODO T1.
- The unpushed commit: resolved.
- The `.gitattributes` CRLF warnings: no action. They're harmless, and the repo stores LF.

## Part 1: touchpoints for a new bible section

### 1. Definition and registry (App)

- [ ] **1.1 Section data file.** Add the section to `sections/<type>.json` for every story type it belongs to (prose, screenplay, game). Missing one: **silent**. That story type just lacks the section. [plan]
- [ ] **1.2 No hardcoded section names in code.** `public/js/app.js` hardcodes `ENTRY_PATH = 'premise/premise.md'` and the "Premise" heading and label. `server/server.js` hardcodes `PREMISE_FILE` and Premise's default frontmatter. Phase 2 must replace these with data from 1.1. Any remaining hardcoded name: **silent**, since a new section copied from Premise would quietly reuse its path. [code]
- [ ] **1.3 Series layer.** Per-book sections (premise, plot) also need a `books/<slug>/` variant when `scope` is `series`. Missing: **silent**. A series bible would put book content at the top level. [plan]

### 2. Persistence and file format (App and Skills)

- [ ] **2.1 Entry file layout.** Use one file per entry, with a `## Seed`, `## Sketch`, and `## Sheet` heading per depth and `###` headings for Sheet fields, read and written by `server/bible.js`. A parser that doesn't recognize a section's headings: **silent**. Text lands in the wrong layer, or round-trips with changes. [plan]
- [ ] **2.2 Frontmatter completeness.** Every entry the server creates gets all seven fields (title, type, depth, status, author, updated, description). Real example: on a recreated file, `putEntry` writes only title, updated, and status (audit Q1). **Silent**. [history]
- [ ] **2.3 Legacy content.** Files written before a format change must still load. Real example: EOL's premise holds a bare "TBA" with no depth headings, and Phase 2 must read it as the Seed. **Silent** if mishandled. [history]
- [ ] **2.4 Folder per entry.** Per-item sections (characters, relationships, locations, events, factions, quests) create `<section>/<slug>/` when the entry is created, not when the first image arrives, so relative links stay stable. Single-document sections keep images in `<section>/images/`. Missing: **silent**. Links break later. [plan]
- [ ] **2.5 Image sidecars.** Every image the section accepts gets a `<file>.meta.md` beside it. Missing: **silent**. [plan]

### 3. Rendering and interaction (App)

- [ ] **3.1 Section page from data.** The page renders the why-it-matters line, the guiding questions, depth control, status, Skip for now, and the Ask Claude menu from 1.1. A section without its data renders blank or missing controls: **loud** to the eye. [plan]
- [ ] **3.2 Navigation.** The section appears in the section list, if navigation is built (an open question in the Premise brief). Missing: **silent**. The section exists but can't be reached. [plan]
- [ ] **3.3 Live updates.** The page's server-sent-events listener accepts changes for the section's files. Today `listen()` in `app.js` drops any change whose path isn't `ENTRY_PATH`, so a new section's outside edits would never appear. **Silent**. [code]
- [ ] **3.4 Conflict detection.** Every save path sends `baseHash`, and every conflict view keeps "Your version" current. Real example: "Your version" froze when the panel opened and was fixed during the skeleton build. **Silent**. [history]
- [ ] **3.5 Status shown without color alone.** Empty, draft, and settled each get a text label and a shape. Missing: **silent** for colorblind users. [plan]

### 4. Generated files (App and Skills)

- [ ] **4.1 Indexes.** The section's `index.md` and its line in the main `index.md` are generated by `server/indexes.js` and `fletcherling index`. Missing: **silent**. The AI never learns the section exists. [plan]
- [ ] **4.2 `BIBLE.md`.** The section appears in the read order and rules. Missing: **silent**. A fresh Claude Code session skips it. [plan]
- [ ] **4.3 Section status in `fletcherling.json`.** Skips and status are recorded per section. Missing: **silent**. [plan]

### 5. Skills (Skills surface)

- [ ] **5.1** `fletcherling-read`, `fletcherling-interview`, `fletcherling-process`, and `fletcherling-audit` handle the section: they read its files, know its fields, and know its audit rules (for example, ages against the timeline). Best done by reading `sections/*.json` or `BIBLE.md` at run time instead of listing sections by name. Any by-name list: **silent**. [plan]

### 6. Style and accessibility (App)

- [ ] **6.1 No color literals outside `public/css/tokens.css`.** Real example: `rgb(42 45 50 / 0.05)` in the grid overlay (audit C1). **Silent**. [history]
- [ ] **6.2 No raw values that have a token.** For example, `28px` where `--line` exists, or `4px` where `--space-1` exists. Real example: audit S1. **Silent**. [history]
- [ ] **6.3 New controls pass automated axe checks:** labels, contrast, roles. **Silent** for sighted mouse users. [plan]
- [ ] **6.4 Vertical rhythm.** New blocks stay on the 4px baseline, and on whole 28px lines where SPEC.md expects it. Real examples: the first layout sat 20px off the line grid, fixed during the skeleton build. Buttons are still 42px (audit R1). **Silent**. Checked by eye with "Show grid," since a script can't judge this well. [history]

### 7. Documentation (not the README)

- [ ] **7.1 `docs/SPEC.md`:** the section lists for each story type, and any format decision. Adding a section always touches SPEC.md, by Tim's choice. [plan]
- [ ] **7.2 Comments that describe intent stay true.** Real example: `app.js` still called itself "skeleton" after the skeleton was approved (fixed in the comment cleanup). **Silent**. [history]

## Part 2: documentation gates

### CLAUDE.md (highest priority)

**Trigger:** a commit that adds or changes a section, feature, or architectural decision. Mechanically, that's any of: a change to `sections/*.json`; a new file in `server/`, `public/js/`, `skills/`, or `scripts/`; a new API route string in `server/server.js`; or a new CLI flag in `bin/fletcherling.js`. **Check:** CLAUDE.md is changed in the same commit. **Limit:** a changed file doesn't prove the new thing is described. The check is necessary, not sufficient.

### README

**Trigger:** a change to user-facing behavior or setup: `bin/fletcherling.js` (flags), the `bin` or `engines` fields in `package.json`, `sections/*.json` (supported sections), or `skills/` and `scripts/` (installation). **Check, layer 1:** README.md is changed in the same commit. **Check, layer 2 (approved):** a mapping file, `sentinel-readme-map.json`, pairs each feature or mechanism with a word or phrase that must appear in the README's current text. For example, `--no-open` must appear, as must each section's name and `fletcherling index`. Every entry is checked on every commit. **Limit:** both layers check presence only. They confirm a word exists, not that the text around it is accurate, and the check's own output says so. Until the README phase, the map holds only the entries the README already satisfies, plus new ones as features land.

### docs/SPEC.md (design document)

**Trigger (confirmed):** a new top-level folder, a new module in `server/`, a new dependency in `package.json`, a change to the story-bible layout or file format (`server/bible.js` serialization, folder rules), or **any new section** in `sections/*.json`. **Doesn't trigger:** UI tweaks, bug fixes, copy changes, edits to an existing section's questions. **Check:** SPEC.md is changed in the same commit.

### Sentinel-Notes/TODO.md sync

**Hard check:** a commit that changes a `Sentinel-Notes/*-design-brief.md` file must also change that brief's line in `TODO.md`, or move the brief to `archive/` along with a matching TODO change. **Soft reminder:** commits that touch code a one-line item names get a non-blocking reminder to check `TODO.md`. There's no reliable signal to make this half a hard check. **Format check:** every item line in `TODO.md` is one line, in the form checkbox, optional ID, one sentence.

## Part 3: quality-gate design (not built yet)

### Commit-time check (`pre-commit` plus `commit-msg`, run automatically)

In plain terms, before each commit the hook reads the **staged** content (not the working tree) and:

1. Works out which triggers above the staged changes hit.
2. For each one, checks that the required companion file is staged too: CLAUDE.md, README.md, SPEC.md, TODO.md.
3. Runs the README map against the staged README.
4. Scans staged CSS, HTML, and JS outside `tokens.css` for every color-literal form (`#hex`, `rgb()`/`rgba()`, `hsl()`/`hsla()`, named colors other than `transparent`, `inherit`, and `currentColor`).
5. Scans staged `public/css/base.css` for raw values that equal a token (`28px`, `4px`).
6. Checks the `TODO.md` format, and the brief-to-TODO sync.
7. Before failing, reads `sentinel-exceptions.json`.

Then the `commit-msg` hook checks the message:
- The subject is one line. If there's a body, it must be a blank line, then up to 5 one-sentence `- ` bullets.
- Lines that look like tool attribution are blocked: `Co-Authored-By:`, "Generated with Claude Code", `Claude-Session:`.
- Phrases in agent voice are blocked: "the user", "as requested", "per your request".
- Any trailer except `Sentinel-Override:` is blocked.

Every failure names the rule, the file and line (where it comes from a diff or a grep), and the fix or the question to ask yourself. For example: "CLAUDE.md gate: `sections/prose.json` changed but CLAUDE.md didn't. Add the section's notes, or split the commit."

The hook source is tracked in the repo (for example, `.githooks/`, with `core.hooksPath` set by a setup script), so a fresh clone gets it. Errors fail loudly, never as a silent pass.

### Full-repo scan (`pre-push`)

There's no CI, so this runs before each push. It:
- Repeats checks 3-6 above across the whole repo, not just the diff.
- Checks that every section id in `sections/*.json` appears in the SPEC.md section lists, the README map, and (once they exist) `BIBLE.md` and the index generator.
- Checks for hardcoded section names in `server/` and `public/js/` (the Premise strings in item 1.2, once Phase 2 is done).

### Commit conventions (Part 4, confirmed)

- A single-line subject is the norm.
- A body of up to a few one-sentence bullets is allowed only when one coherent change has **three or more separate parts**, or **changes behavior someone reading history later needs to know about**.
- Unrelated changes are split into separate commits, not bulleted.
- One commit per session by default.
- Messages read as Tim's own description of the change.
- **Allowed trailers:** `Sentinel-Override:` only.

### Exceptions (Part 5, confirmed)

- **Standing exceptions:** `sentinel-exceptions.json`. Each entry requires the rule, a narrow file scope (no catch-all globs), a reason, an owner, and a review-by date. An expired entry fails like no entry. Only Tim adds entries. Agents propose them in "Known gaps" below.
- **One-off override:** a `Sentinel-Override: <reason>` trailer, written by Tim only. If a check blocks the agent's commit, it splits the commit or stops and asks, and never adds the override itself. Limit: a hook can't tell who typed a trailer, so "Tim only" is a rule the agent follows, not something the hook can enforce.

## Known gaps

These are real touchpoints that a commit hook can't check mechanically:

- **Runtime behavior:** live updates for new sections (3.3), conflict detection (3.4), folder creation (2.4), legacy loading (2.3), and frontmatter completeness (2.2). These need automated tests (TODO T1). Until then, they need a real browser run at each phase stop.
- **Visual rhythm and hierarchy (6.4):** needs eyes and "Show grid."
- **Docs:** "Did CLAUDE.md, SPEC.md, or the README change?" and the README map all check presence, not accuracy.
- **Format changes:** the skills surface reads the bible format independently, so a format change can pass every check in the app and still break the skills (5.1). The full-repo scan can check names. It can't check meaning.
- **Axe checks (6.3)** need a running server and a browser. That's too heavy for each commit, so they belong in the full-repo scan or a manual command.
- **No exceptions are proposed at this time.**
