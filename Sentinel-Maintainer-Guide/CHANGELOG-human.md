# Progress log

Newest first. One entry per development session: three to six lines on what changed in the project, why, and which guide files were updated. A session that only edits the guide gets one line.

## 2026-11-16: a new look

Tim's own palette replaced the cream, charcoal, and orange: a pale gold page, a muted plum-gray sidebar, raspberry for the header, footer, buttons, and spines, a light gray-plum highlight with a raspberry ribbon for the current sidebar item, and gold rules. New flourishes: gilt rules, a ribbon bookmark, card spines, a printer's ornament, and endpaper on the setup screen. Atkinson Hyperlegible Next became the default font (new dependency, old one removed). Notifications became a toast; the Show grid button was removed from the footer. Tokens were renamed (`--color-ink`, `--color-raspberry`, `--color-parchment`, and so on). Later the same day: one scrollbar style everywhere, a grayer sidebar, nothing pure black (`#121212`), and buttons whose label changes now keep one width (`setLabel`, `.label-stack`). Guide files updated: 06, 07, 09, 11, 12.

Later the same day: panels and open tabs took the sidebar's plum, inactive tabs, the toast, and generic profile pictures a darker plum. The toast gained a close button and a wider shadow, and writing boxes now grow with their text (`fitTextarea`). Guide files updated: 04, 11.

## 2026-11-15: the media library (Characters step 3)

Added the media library: a page at `#/media` showing every image in the bible, a `media/` folder for images that belong to no entry, a picker that puts any image on a character, and moves between the library and entry folders that rewrite every reference and link. Renaming a character now rewrites links into its folder. New modules `core/links.js` and `media-library.js`, a `POST /api/move-media` route, and `test/links.test.js`. Guide files updated: 04, 05, 08.

## 2026-11-15: code review and fixes

A full code review (`Sentinel-Notes/code-review-2026-11-15.md`) found three ways the writer's text could be damaged or hidden, and most findings were fixed the same day. The server now decodes a request as one stream. The layer parser splits a body only at the three layer headings and never replaces a repeated part. Leaving a page waits for the save and stays put if it fails, the last keystrokes are sent on `pagehide`, and a rename can't leave a folder that doesn't match its file. `state.page` gained `'loading'` and `'problem'`. Tests were added in `test/` (`npm test`). Guide files updated: 04, 05, 08, 11.

Later the same day: text the boxes can't hold (anything before the first layer heading, or before a Sheet's first field) now shows read-only under the entry, as "Other text in this file". Guide files updated: 05, 08.

## 2026-11-02: guide written

Wrote the first version of this guide from the code at commit `0996626`. All files created. Checked against the code, then reviewed by Tim.

## History to date

Drawn from `git log` (109 commits, 2026-10-29 to 2026-10-31) and the docs. Reviewed by Tim on 2026-11-02.

- **2026-10-29:** First commit, as Fletcherling. Skeleton: setup, a Premise entry editor, the file server with version checks, the watcher, the conflict panel, and tokens. The design audit, the integration audit, and the quality gate (`sentinel-gate/`, backlog baselined) followed the same day, per `INTEGRATION_CHECKLIST.md`.
- **2026-10-30:** Renamed to Fletchery. Entry depths (Seed, Sketch, Sheet) and the Premise end to end. Shared-core split into `public/js/core/`. Settings moved to `fletchery-settings.json`, with a Settings panel. Visual redesign steps, folder-style question tabs, Focus sheet, and motion. Characters step 1: cards, add, rename, one prompt per depth, and the Sheet as a form.
- **2026-10-31:** Characters step 2: silhouette menu, photo portraits with a crop view, the Images tab with sidecars, image cards at their own proportions, Duplicate, and drag reordering. Handoff files updated through the session.
- **Next planned:** Characters step 3, the media library (see `Sentinel-Notes/characters-design-brief.md`).
