# Handoff

Updated 2026-10-30. Committed through `5d49b63`. The latest commits may not be pushed: check `git status -sb`.

## 1. Current task and status

TODO item "Premise end to end", in three steps:

1. **DESIGN.md:** done (`0b90d22`), waiting on Tim's review.
2. **Shared core and storage interface:** done (`5d49b63`), tested in Playwright. Waiting on Tim's own browser test.
3. **Premise on top of the core:** depth control, status, guided questions in Interview and Full form modes, and section navigation from `sections/prose.json` (only Premise linked). Fold in TODO Q1 and R4.

## 2. Files touched this session

- `docs/SPEC.md`: a Web edition section (optional AI through Anthropic or OpenRouter, local or Drive storage, shared core).
- `Sentinel-Notes/web-edition-design-brief.md`, `layout-views-design-brief.md`: new briefs.
- `DESIGN.md`: the new architecture overview.
- `CLAUDE.md`, `PROJECT_PROFILE.md`: docs routing now includes DESIGN.md.
- `Sentinel-Notes/TODO.md`: web edition, layout views, and G1 items.
- `.gitignore`: `Sentinel-Prompts/` ignored.

## 3. Next step

After Tim's browser test, start step 3: add `sections/prose.json` (Premise fully defined, the other sections listed), a section list in the page from it, and Premise's depth control, status, and Interview and Full form modes, all built on `public/js/core/`.

## 4. Open questions for Tim

- **Premise questions:** Tim is sending edits. Use the drafts in `premise-end-to-end-design-brief.md` until then.
- **Layout views brief:** which views, one file per scene or not, and whether to prototype first.
- **Web edition brief:** hosting, a Claude Code option in local-folder mode, build order, and Drive for desktop.
- **G1:** should the spec gate also require DESIGN.md?
- **Session hook test:** confirmed working. The handoff appeared at the start of this session.

## 5. Tried and failed

- `fetch()` followed by `process.exit()` crashed Node on Windows. The session hook uses `node:https` instead.
- Stopping a background `fletcherling` task can leave Node running. Kill it by PID, and ignore netstat's stale `LISTENING ... 0` lines (PID 0) when looking for the real one.
- The `yaml` browser build has no default export. Import `parse` and `stringify` by name.
