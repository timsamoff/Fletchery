# TODO

Conventions: when an item is finished, move its line to the Done section at the bottom. When an item with a design brief is finished, move the brief to `archive/`. After finishing an item, recommend the next one with a reason and start on it (judgment from the item text only; no priority data). One line per item; anything longer gets a design brief.

## Build phases

- [ ] Visual redesign before more feature work: steps 1-3 built, motion added, Focus sheet reworked, links updated; see [visual-redesign-design-brief.md](visual-redesign-design-brief.md).
- [ ] Settings page: credit (shown as Written by), fonts, paste, fade built; AI preview with Gemini; key location set; see [settings-page-design-brief.md](settings-page-design-brief.md).
- [ ] Fletchery web edition beside the local one (optional AI via Anthropic or OpenRouter; local or Drive storage): shared core first; see [web-edition-design-brief.md](web-edition-design-brief.md).
- [ ] Portrait: make the silhouette look clickable, and crop part of an image as the portrait (options given 2026-10-31).
- [ ] Characters with images, the media library, relationships, and indexes: step 1 built and revised (Sheet as form, fluid dragging); see [characters-design-brief.md](characters-design-brief.md).
- [ ] World and settings need images too: reuse the Characters image zone and sidecars once step 2 is built.
- [ ] Make it clearer where the story-bible folder actually lives on disk.
- [ ] Hook up a Google Drive connector for storage (web edition and import both lean on it).
- [ ] Full-text search across all of the writer's text in the bible, and maybe image file names too.
- [ ] PWA install: copy the approach in `Documents/_samoff.com/Sentinel`, which is well refined.
- [ ] Help section.
- [ ] About section.
- [ ] Notes and media (Inbox, quick capture, maps), then the remaining sections from data for all three story types.
- [ ] Bridge: request queue, proposals, `BIBLE.md`, skills, install script. Proposals in files or UI only: pick the better UX (guided-interview brief).
- [ ] Layout views (document, board, canvas, outline), animated drag and drop, canon status board, Fletchery name; see [layout-views-design-brief.md](layout-views-design-brief.md).
- [ ] Accessibility and responsiveness pass, tested with the keyboard and at 320px and ultra-wide.
- [ ] README: install, launch, directory layout, handing a bible to Claude Code, and the edition comparison from the web edition brief.
- [ ] Later, only with approval: a `claude -p` "Run now" option for Ask AI.
- [ ] Make the Google Gemini API work as an AI choice (listed in Settings); key in fletchery-api.json.
- [ ] PDF export of the story bible (browser print styles first; a library only if those fall short).
- [ ] .docx export of the story bible with docx.js (a new dependency, so it goes in SPEC.md when added).
- [ ] Formatting editor: a light Markdown toolbar or full formatting, never dropping text; text zoom and margin notes wait on it.
- [ ] Margin notes: select a phrase, add a note, the phrase highlights; waits on the formatting editor; see [margin-notes-design-brief.md](margin-notes-design-brief.md).
- [ ] Discuss later: the guided interview as the defining feature (threads, Socratic AI, writer sets canon); see [guided-interview-design-brief.md](guided-interview-design-brief.md).
- [ ] Discuss later: in AI mode, import a folder or premade files (local or Google Drive) for the AI to draft into the bible; see [import-content-design-brief.md](import-content-design-brief.md).

## Audit findings (design-quality-audit.md)

- [ ] P2: The yaml browser build loads as 72 module files; consider a single-file build for the hosted web edition.
- [ ] Q5: Restart the watcher if `story-bible/` is deleted and recreated while the app runs.
- [ ] Q6: Replace the deprecated `clip: rect()` in `.visually-hidden`, or remove the class until it's used.
- [ ] R2: Decide whether forms must take whole 28px lines, and fix the setup form if so.
- [ ] R3: Align the conflict panel's width with the text area below it.
- [ ] S1: Clear the 13 baselined raw-token-value items in `base.css`, and tokenize the 82px header and footer height (S2).
- [ ] S3: Use role tokens instead of palette tokens for `.choice input` and `.button:hover`.
- [ ] S4: Add a `--font-mono` token for the monospace stack.
- [ ] S5: Use or remove the unused tokens `--unit`, `--baseline`, `--space-6`, and `--color-border-quiet`.
- [ ] C1: Clear the 1 baselined color-literal item (overlay color), and derive `--color-grid` from `--color-orange` (C2).
- [ ] B2: Keep the project path from dominating the footer at phone width.
- [ ] A1: Add automated axe accessibility checks for the setup and editor pages.
- [ ] Doc1: Copy the approved plan into the repo so remote sessions can see it (`first-prompt/` stays private by decision).

## Setup

- [ ] G1: Decide whether the spec gate's structural triggers should also require `DESIGN.md` in the same commit.
- [ ] T1: Add automated tests for conflict detection, the path guard, and frontmatter completeness in `server/`.
- [ ] Consider a narrow permission rule allowing `node scratch/*.js` to cut down on prompts.
- [ ] X1: Cross-platform pass on macOS and Linux: config folder paths, file modes, `npm link`, recursive `fs.watch`, line endings.

## Done

- [x] Premise end to end: depth screens, one-box Sheet, questions about change, tab names, placeholders; see [archive/premise-end-to-end-design-brief.md](archive/premise-end-to-end-design-brief.md).
- [x] Phase 0: interview, SPEC.md, plan approval.
- [x] Skeleton, approved (commit 8597841).
- [x] Gate candidates from the design audit: color literals, raw token values, and TODO format implemented; axe deferred to A1; frontmatter completeness deferred to T1.
- [x] Sentinel-Prompts/ is gitignored by decision; the session hook's weekly version check runs only on this machine.
- [x] Q1: Give entries created by `PUT /api/entry` the full seven-field frontmatter, and parse the current file once.
- [x] Q2: Return a clear error for a broken `fletchery.json`, and make the page show it instead of the setup form.
- [x] Q3: Share one helper for the saved-state update in `save()` and the conflict overwrite in `app.js`.
- [x] Shared core, first step: `entry.js`, `store.js`, and the server reduced to a file store.
- [x] R1: Put buttons on the 4px baseline (42px now) to match SPEC.md.
- [x] R4: Make save status visible near the editor on tall pages.
- [x] A2: Add `:disabled` and `:active` styles for buttons and fields.
- [x] Rename showed "Not found.": the server predated the folder-move route; the page now says to restart Fletchery.
