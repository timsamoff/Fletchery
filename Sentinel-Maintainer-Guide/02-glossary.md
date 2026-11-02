# Glossary

Where the writer's word and the code's word differ, both are given.

| Term | Meaning | In code |
|---|---|---|
| Story Bible, bible | The `story-bible/` folder for one story | `Bible` class (`server/bible.js`), `bible.root` |
| Bible record | The bible's own bookkeeping file, `story-bible/fletchery.json`: story type, title, scope, skips, character order | `SETTINGS_PATH` and `state.settings` in `app.js`. The names say "settings", but this is not the writer's settings. |
| Writer's settings | Preferences in `story-bible/fletchery-settings.json` (credit, fonts, paste, fade, layout) | `Settings` class in `settings.js`, `SETTINGS_FILE`, and `prefs` in `app.js` |
| Story type | prose, screenplay, or game | `storyType` in the bible record, and the file name `sections/<storyType>.json` |
| Scope | standalone or series | `scope` in the bible record. `onlyFor: "series"` hides a section unless it matches. |
| Section | A part of the bible, such as Premise or Characters | An object in `sections/<type>.json`, held as `state.section` |
| Built | A section whose definition has questions and fields and which the app can open | `built: true` in the section file |
| Single-entry section | A section with one file (Premise) | `section.file` |
| Many-entry section | A section with one folder per entry (Characters) | `section.many` and `section.folder` |
| Entry | One Markdown file in the bible | `parseEntry`, `updateEntry` in `entry.js` |
| Depth, layer | Seed (one line), Sketch (one paragraph), Sheet (the full version) | `DEPTHS` in `layers.js`. The `## Seed`, `## Sketch`, `## Sheet` headings. `depth` in frontmatter is the deepest layer with text. |
| Sheet field | One labeled part of a Sheet that has separate fields | A `###` subsection in the file, and `depths.sheet.fields` in the section file |
| Status | empty, draft, or canon | `status` in frontmatter, `STATUS` in `app.js` |
| Canon | An entry the writer has marked as established fact | `status: canon`. Called `settled` before 2026-10-30; `normalizeStatus` reads it as canon. |
| Author | Who wrote the text: `writer`, `ai-draft`, or `ai-reviewed` | `author` in frontmatter. Not a person's name. The credited name comes from settings. |
| Interview and full layouts | The two ways to show questions | `state.mode` is `'interview'` or `'full'`. The tabs are labeled "One at a time" and "All questions" (`renderWork`). |
| Focus | The question and fields on a sheet over the page | `openFocus`, `setupFocus`, `state.focusOpen` |
| Slug | A character's folder and file name, made from the title | `slugify`, `freeSlug`. `entryFile(section, slug)` gives `characters/<slug>/<slug>.md`. |
| Silhouette | A placeholder portrait drawing | `SILHOUETTES` in `app.js`, `silhouette` in frontmatter |
| Portrait | A character's picture: a silhouette or a cropped photo | `portrait: { image, x, y, size }` in frontmatter, plus `portrait.jpg` (`PORTRAIT_FILE`) |
| Sidecar | Metadata file beside an image: `<image>.meta.md` | `sidecarPath`, `parseSidecar`, `updateSidecar` in `media.js` |
| Version | The SHA-256 hash of a file's text content | `hash` in `bible.js`. `baseVersion` is the version the page last saw. |
| Store | The page's interface to storage | `LocalServerStore` in `store.js` |
| Conflict | A save refused because the file changed since the page loaded it | `StoreConflict`, `state.conflict`, `showConflict` |
| Skip, skipped | The writer set a section aside | `sections.<id>.skipped` in the bible record |
| Card order | The writer's order for character cards | `order.characters` in the bible record, a list of slugs |
| Gate, Sentinel | The commit and push checks | `sentinel-gate/`. Not covered by this guide. |
