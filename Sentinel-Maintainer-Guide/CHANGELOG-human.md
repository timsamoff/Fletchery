# Progress log

Newest first. One entry per development session: three to six lines on what changed in the project, why, and which guide files were updated. A session that only edits the guide gets one line.

## 2026-11-02: guide written

Wrote the first version of this guide from the code at commit `0996626`. All files created. Checked against the code, then reviewed by Tim.

## History to date

Drawn from `git log` (109 commits, 2026-10-29 to 2026-10-31) and the docs. Reviewed by Tim on 2026-11-02.

- **2026-10-29:** First commit, as Fletcherling. Skeleton: setup, a Premise entry editor, the file server with version checks, the watcher, the conflict panel, and tokens. The design audit, the integration audit, and the quality gate (`sentinel-gate/`, backlog baselined) followed the same day, per `INTEGRATION_CHECKLIST.md`.
- **2026-10-30:** Renamed to Fletchery. Entry depths (Seed, Sketch, Sheet) and the Premise end to end. Shared-core split into `public/js/core/`. Settings moved to `fletchery-settings.json`, with a Settings panel. Visual redesign steps, folder-style question tabs, Focus sheet, and motion. Characters step 1: cards, add, rename, one prompt per depth, and the Sheet as a form.
- **2026-10-31:** Characters step 2: silhouette menu, photo portraits with a crop view, the Images tab with sidecars, image cards at their own proportions, Duplicate, and drag reordering. Handoff files updated through the session.
- **Next planned:** Characters step 3, the media library (see `Sentinel-Notes/characters-design-brief.md`).
