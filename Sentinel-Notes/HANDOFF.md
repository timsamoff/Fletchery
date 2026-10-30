# Handoff

Updated 2026-10-30. Committed through `0b90d22`. The latest commits may not be pushed: check `git status -sb`.

## 1. Current task and status

TODO item "Premise end to end", in three steps:

1. **DESIGN.md:** done (`0b90d22`), waiting on Tim's review.
2. **Shared core and storage interface:** next, not started. Move frontmatter parsing and serialization and the entry templates into `public/js/core/`, and add the storage interface with `LocalServerStore` as its only backend (see `DESIGN.md`, "Target structure").
3. **Premise on top of the core:** depth control, status, guided questions in Interview and Full form modes, and section navigation from `sections/prose.json` (only Premise linked). Fold in TODO Q1 and R4.

## 2. Files touched this session

- `docs/SPEC.md`: a Web edition section (optional AI through Anthropic or OpenRouter, local or Drive storage, shared core).
- `Sentinel-Notes/web-edition-design-brief.md`, `layout-views-design-brief.md`: new briefs.
- `DESIGN.md`: the new architecture overview.
- `CLAUDE.md`, `PROJECT_PROFILE.md`: docs routing now includes DESIGN.md.
- `Sentinel-Notes/TODO.md`: web edition, layout views, and G1 items.
- `.gitignore`: `Sentinel-Prompts/` ignored.

## 3. Next step

After Tim reviews DESIGN.md, start step 2: create `public/js/core/entry.js` (parse and serialize, ported from `server/bible.js`) and `public/js/core/store.js` (the interface plus `LocalServerStore` over the existing API). Then switch `app.js` to them and confirm the skeleton still behaves the same in the browser, including conflicts.

## 4. Open questions for Tim

- **Premise questions:** Tim is sending edits. Use the drafts in `premise-end-to-end-design-brief.md` until then.
- **Layout views brief:** which views, one file per scene or not, and whether to prototype first.
- **Web edition brief:** hosting, a Claude Code option in local-folder mode, build order, and Drive for desktop.
- **G1:** should the spec gate also require DESIGN.md?
- **Session hook test:** confirmed working. The handoff appeared at the start of this session.

## 5. Tried and failed

- `fetch()` followed by `process.exit()` crashed Node on Windows. The session hook uses `node:https` instead.
- Stopping a background `fletcherling` task can leave Node running on port 3000. Kill it by PID.
