# Handoff

Updated 2026-10-30. Committed through `db92857` (plus this handoff). Check `git status -sb` for unpushed commits.

## 1. Current task and status

TODO item "Premise end to end": **built, waiting on Tim's review.** Steps 1 (DESIGN.md), 2 (shared core), and 3 (Premise on the core) are done and tested in Playwright.

## 2. Files touched (this phase)

- `sections/prose.json`, `screenplay.json`, `game.json`: section IDs and titles, with Premise fully defined using the drafted questions as placeholders.
- `public/js/core/layers.js`: the Seed, Sketch, and Sheet layers in an entry body.
- `public/js/core/entry.js`: `updateEntry` with the status rules (settling, and the drop back to draft on edit).
- `public/js/app.js`: section list, depth control, Interview and Full form, settling, Skip, and save status by the editor.
- `public/css/base.css`: workspace and nav layout, question card, context layers, 44px buttons on the grid, disabled and pressed states.
- `server/server.js`: serves `/sections/*.json`.
- `README.md`, `sentinel-gate/readme-map.json`, `docs/SPEC.md` (section lists, entry depths), `DESIGN.md`, `CLAUDE.md`, TODO, Premise brief, checklist.
- `sentinel-gate/check.js`: quiet git lookups.

## 3. Next step

Wait for Tim's review of Premise. Apply his question edits to `sections/*.json` when they arrive. After approval, the next build phase is Characters with images, the media library, relationships, and indexes, or the web edition's remaining core work. Ask which.

## 4. Open questions for Tim

- **Premise:** review, and edits to the question set.
- **Layout views brief:** which views, one file per scene or not, and whether to prototype first.
- **Web edition brief:** hosting, a Claude Code option in local-folder mode, build order, and Drive for desktop.
- **G1:** should the spec gate also require DESIGN.md?

## 5. Tried and failed

- `fetch()` followed by `process.exit()` crashed Node on Windows. The session hook uses `node:https`.
- netstat on this machine lists stale `LISTENING` lines and is unreliable for finding test servers. Check with `curl` on the port, find the PID with `netstat -ano | grep ":PORT "`, then confirm with `curl` after `taskkill`.
- The `yaml` browser build has no default export. Import `parse` and `stringify` by name.
- Inline `<button>` elements sit on the text baseline and add a pixel. Use `display: block` for button-styled links.
