# Fragile zones and debt

Severity: High (likely to cause a bug or block planned work), Medium (a trap for the next change), Low (a nuisance).

## Fragile code

| Zone | Severity | Detail |
|---|---|---|
| `public/js/app.js` is one module of about 2,100 lines with one mutable `state` object | Medium | Nearly every function reads or writes `state`. No tests cover it. Splitting it is not on the backlog as a single item; the web edition and the media library will push on it. |
| Many-entry sections are tied to Characters | High for new sections | `loadCharacters` looks up the section with id `characters`. `route` checks a slug against `state.characters`. `addCharacter`, `renameCharacter`, `saveCharacterOrder`, and `order.characters` are character-specific, and `hasImages` is true for any `many` section with a `folder`. A second many-entry section (relationships, locations) needs these generalized first. |
| Outside edits to `fletchery.json` are not picked up live | Medium | `listen` handles `fletchery-settings.json`, paths under `characters/`, and the open entry. There is no branch for the bible record, so `state.settings` can go stale until the page reloads. Writes through `updateBibleRecord` do retry once after a conflict. |
| Two names for two different "settings" | Medium | `SETTINGS_PATH` (`fletchery.json`, the bible record) and `state.settings` are not the writer's settings; `SETTINGS_FILE`, `Settings`, and `prefs` are. The comment above `prefs` explains it. Easy to edit the wrong one. |
| `app.js` bypasses the store in two places | Medium | `loadSectionSet` calls `fetch('/sections/...')` and `duplicateImage` fetches an image blob directly. A web edition's store would not serve these paths. |
| State fields created outside the literal | Low | `state.view`, `state.images`, and `state.imageOpen` are set in `openEntry`, `renderImages`, and `openImage`, not declared with the rest. |
| Watcher reads every changed file as UTF-8 text | Low | Image uploads up to 25 MB are read and hashed in full on each event. Fine for the local edition. |
| Upload buffers the whole body in memory | Low | Capped at `MAX_IMAGE_BYTES` (25,000,000). |
| `moveFolder` does not call `watcher.expect` | Low | A folder rename produces change events for moved files. The page tolerates them, but the cards refresh. [UNVERIFIED: the visible effect was not tested.] |
| Renaming a character does not rewrite links in other entries | Medium | No entry links yet, so nothing breaks today. The media library step is planned to add link rewriting (comment above `renameCharacter`). |
| Windows file locks | Low | `retryOnWindowsLock` retries 5 times. A lock held longer fails the operation. |

## Debt and open items

All are in `Sentinel-Notes/TODO.md`; they are listed here so a maintainer sees them in one place.

- **No automated tests (T1).** Conflict detection, the path guard, and frontmatter completeness are the first candidates. Verification is manual (`12-verification-checklists.md`).
- **Baselined gate findings.** 13 `raw-token-value` and 1 `color-literal` in `public/css/base.css` (S1, S2, C1). `npm run sentinel:report` lists them.
- **Unused or duplicate tokens (S5, S3, S4).** `--unit`, `--baseline`, `--space-6`, and `--color-border-quiet` are unused; a mono font token is missing.
- **The `yaml` browser build loads as 72 module files (P2).** Acceptable locally, slow for a hosted edition.
- **The watcher stops if `story-bible/` is deleted and recreated (Q5).**
- **Deprecated `clip: rect()` in `.visually-hidden` (Q6).**
- **Buttons are 42px, not on a 28px line (R1 in the audit).** [UNVERIFIED: current state not re-measured.]
- **Cross-platform behavior is untested (X1).** Config paths, file modes, `npm link`, and `fs.watch` were checked only on Windows 11.
- **Narrow screens (TODO).** The sidebar sits above the content at narrow widths; a hamburger menu is planned.
- **The AI section in Settings is a preview.** Controls are dimmed. The Ask AI button on every entry is disabled.

## Workarounds worth knowing

- The page tells the writer to restart Fletchery when it calls a route the running server lacks (`store.js`, `#call`).
- Windows rename retries (`retryOnWindowsLock`).
- A multi-line paste gets a blank line between paragraphs (`onPaste`), unless the writer's paste setting is `lines`. Word processors copy single line breaks, which Markdown reads as one paragraph.
