# TODO

Conventions: when an item is finished, move its line to the Done section at the bottom. When an item with a design brief is finished, move the brief to `archive/`. After finishing an item, recommend the next one with a reason and start on it (judgment from the item text only; no priority data). One line per item; anything longer gets a design brief.

## Build phases

- [ ] Premise end to end: see [premise-end-to-end-design-brief.md](premise-end-to-end-design-brief.md).
- [ ] Characters with images, the media library, relationships, and generated indexes.
- [ ] Notes and media (Inbox, quick capture, maps), then the remaining sections from data for all three story types.
- [ ] Bridge: request queue, proposals, `BIBLE.md`, the four skills, and the install script.
- [ ] Accessibility and responsiveness pass, tested with the keyboard and at 320px and ultra-wide.
- [ ] README: install, launch, directory layout, and handing a bible to Claude Code.
- [ ] Later, only with approval: a `claude -p` "Run now" option for Ask Claude.

## Audit findings (design-quality-audit.md)

- [ ] Q1: Give entries created by `PUT /api/entry` the full seven-field frontmatter, and parse the current file once.
- [ ] Q2: Return a clear error for a broken `fletcherling.json`, and make the page show it instead of the setup form.
- [ ] Q3: Share one helper for the saved-state update in `save()` and the conflict overwrite in `app.js`.
- [ ] Q5: Restart the watcher if `story-bible/` is deleted and recreated while the app runs.
- [ ] Q6: Replace the deprecated `clip: rect()` in `.visually-hidden`, or remove the class until it's used.
- [ ] R1: Put buttons on the 4px baseline (42px now) to match SPEC.md.
- [ ] R2: Decide whether forms must take whole 28px lines, and fix the setup form if so.
- [ ] R3: Align the conflict panel's width with the text area below it.
- [ ] R4: Make save status visible near the editor on tall pages.
- [ ] S1: Clear the 13 baselined raw-token-value items in `base.css`, and tokenize the 82px header and footer height (S2).
- [ ] S3: Use role tokens instead of palette tokens for `.choice input` and `.button:hover`.
- [ ] S4: Add a `--font-mono` token for the monospace stack.
- [ ] S5: Use or remove the unused tokens `--unit`, `--baseline`, `--space-6`, and `--color-border-quiet`.
- [ ] C1: Clear the 1 baselined color-literal item (overlay color), and derive `--color-grid` from `--color-orange` (C2).
- [ ] B2: Keep the project path from dominating the footer at phone width.
- [ ] A1: Add automated axe accessibility checks for the setup and editor pages.
- [ ] A2: Add `:disabled` and `:active` styles for buttons and fields.
- [ ] Doc1: Copy the approved plan into the repo so remote sessions can see it (`first-prompt/` stays private by decision).

## Setup

- [ ] T1: Add automated tests for conflict detection, the path guard, and frontmatter completeness in `server/`.
- [ ] Consider a narrow permission rule allowing `node scratch/*.js` to cut down on prompts.

## Done

- [x] Phase 0: interview, SPEC.md, plan approval.
- [x] Skeleton, approved (commit 8597841).
- [x] Gate candidates from the design audit: color literals, raw token values, and TODO format implemented; axe deferred to A1; frontmatter completeness deferred to T1.
- [x] Sentinel-Prompts/ is gitignored by decision; the session hook's weekly version check runs only on this machine.
