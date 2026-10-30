# TODO

Conventions: when an item is finished, move its line to the Done section at the bottom. When an item with a design brief is finished, move the brief to `archive/`. After finishing an item, recommend the next one with a reason and start on it (judgment from the item text only; no priority data). One line per item; anything longer gets a design brief.

## Build phases

- [ ] Premise end to end: depth screens, paste fix, one-box Sheet built; Sheet questions and copy to do; see [premise-end-to-end-design-brief.md](premise-end-to-end-design-brief.md).
- [ ] Visual redesign before more feature work: steps 1-3 built, frame matched, motion added throughout; see [visual-redesign-design-brief.md](visual-redesign-design-brief.md).
- [ ] Settings page: fonts, paste, and fade built; AI choice, author info, and text zoom to come; see [settings-page-design-brief.md](settings-page-design-brief.md).
- [ ] Fletchery web edition beside the local one (optional AI via Anthropic or OpenRouter; local or Drive storage): shared core first; see [web-edition-design-brief.md](web-edition-design-brief.md).
- [ ] Characters with images, the media library, relationships, and generated indexes.
- [ ] Notes and media (Inbox, quick capture, maps), then the remaining sections from data for all three story types.
- [ ] Bridge: request queue, proposals, `BIBLE.md`, the four skills, and the install script.
- [ ] Layout views (document, board, canvas, outline), animated drag and drop, canon status board, Fletchery name; see [layout-views-design-brief.md](layout-views-design-brief.md).
- [ ] Accessibility and responsiveness pass, tested with the keyboard and at 320px and ultra-wide.
- [ ] README: install, launch, directory layout, handing a bible to Claude Code, and the edition comparison from the web edition brief.
- [ ] Later, only with approval: a `claude -p` "Run now" option for Ask AI.

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

## Done

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
