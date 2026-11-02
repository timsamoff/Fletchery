# Key code reference

Paths and names only; open the file for the body. Line numbers are left out on purpose.

## server/bible.js

| Name | Purpose |
|---|---|
| `Bible` | File operations inside `<projectDir>/story-bible/`. Knows nothing about entries. |
| `Bible.resolve(rel, { allowRoot })` | The path guard. Throws 400 if the path is outside the root or uses the reserved temp prefix. Every method calls it. |
| `Bible.read(rel)` | Returns `{ exists, content, version }`. |
| `Bible.list(dir)` | Returns `[{ name, type }]` sorted by name, hiding temp files. An absent folder gives `[]`. |
| `Bible.writeAtomic(rel, content)` | Writes text or a Buffer to a temp file in the same folder, then renames. Returns the hash. |
| `Bible.remove`, `move`, `moveFolder` | Delete and rename. `move` and `moveFolder` refuse an existing destination (409). |
| `hash(text)` | SHA-256 hex of UTF-8 text. This is a file's version. |
| `TMP_PREFIX` | `.fl-tmp-`. Names starting with it are reserved and hidden. |
| `BibleError(status, message, extra)` | An error the server turns into a JSON response. |
| `retryOnWindowsLock` | Retries a rename or delete up to 5 times on `EPERM`, `EBUSY`, `EACCES`. |

## server/server.js

| Name | Purpose |
|---|---|
| `createServer(projectDir)` | Returns `{ listen(startPort) }`. Holds the routes, the SSE client set, and the watcher. |
| `handle` | The router: host and origin checks, then `METHOD /path` matching. |
| `requireVersion(rel, baseVersion)` | Throws 409 with the stored file unless the versions match. Used by write, delete, and move. |
| `upload`, `serveMedia`, `removeMedia` | Image upload (with `-2`, `-3` naming), serving, and deletion. |
| `serveStatic` | Public files, `/icon.svg`, `/sections/<name>.json`, `/vendor/yaml/*`, and `/fonts/*` from `@fontsource`. |
| `events` | The SSE stream with a 25 second ping. |
| `IMAGE_TYPES` | Allowed image extensions and content types. |
| `safeName` | Lowercase letters, digits, and hyphens, up to 60 characters. |

## server/watch.js

`Watcher` runs a recursive `fs.watch` with a 150 ms debounce. `expect(rel, hash)` records what the server itself wrote so it is not reported back. `check(rel)` hashes the file and reports a change only if the hash differs from the last one known. Started lazily by the first write if the bible did not exist at launch.

## public/js/core/ (browser and Node)

| Name | Purpose |
|---|---|
| `parseEntry(raw)` | Splits frontmatter and body. Throws `EntryFormatError` on broken YAML. |
| `serializeEntry(frontmatter, body)` | Builds the file text. |
| `newFrontmatter({ title, type })` | A full block with all seven fields. |
| `updateEntry(raw, change, template)` | The one place that applies status rules, `updated`, and field changes. Returns `{ content, frontmatter, reverted }`. |
| `normalizeStatus` | Maps `settled` to `canon`. |
| `parseLayers(body, sheetFields)`, `serializeLayers`, `deepestFilled` | Seed, Sketch, Sheet split and join. |
| `parseSidecar`, `updateSidecar`, `sidecarPath`, `isImage` | Image sidecar handling. |
| `LocalServerStore`, `StoreConflict`, `StoreError` | The storage interface and its local backend. |

## public/js/settings.js

`Settings` loads, merges, and saves `fletchery-settings.json`. `update(patch)` applies at once and saves 300 ms later. `reload(version)` takes outside edits and keeps unsaved changes. `setupSettingsPanel` wires the header button and dialog.

## public/js/app.js (one module, grouped by comment banners)

| Group | Main functions |
|---|---|
| Start and setup | `start`, `showSetup`, `readSettingsFile` (renames the old `fletcherling.json`), `applyPrefs`, `loadSectionSet` |
| Frame and pages | `showEditor`, `route`, `openEntry`, `goForward` |
| Characters | `loadCharacters`, `renderListPage`, `addCharacter`, `renameCharacter`, `saveCharacterOrder`, `slugify`, `freeSlug` |
| Reordering | `setupCardReorder`, `flip` (hand-built drag with FLIP animation) |
| Portrait | `SILHOUETTES`, `setupPortraitMenu`, `renderPortraitMenu`, `openCrop`, `saveCrop` |
| Images | `setView`, `renderImages`, `uploadImages`, `onImagePaste`, `setupImageDialog`, `openImage`, `saveImageDetails`, `duplicateImage`, `saveImageOrder` |
| Entry rendering | `load`, `renderAll`, `renderHead`, `renderNav`, `renderStatus`, `renderDepth`, `renderWork`, `setDepth`, `setMode` |
| Focus | `openFocus`, `setupFocus`, `caretSnapshot`, `restoreCaret` |
| Saving | `onInput`, `writeEntry`, `save`, `toggleCanon`, `updateBibleRecord`, `setSkipped`, `skipSection` |
| Live updates | `listen`, `checkRemote`, `refreshCharactersSoon` |
| Conflicts | `showConflict`, `renderConflict`, `resolveConflict`, `closeConflict` |
| Motion | `animate` (honors reduced motion), `riseIn`, `placeDepthIndicator` |

The `state` object near the top of the "Section editor" group is the page's single store; see `05-state-and-data.md`.
