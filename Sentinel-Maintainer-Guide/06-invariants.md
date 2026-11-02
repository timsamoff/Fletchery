# Invariants

Rules the code relies on. Each is marked **enforced** (code or the gate checks it) or **unenforced** (a convention a change can break silently).

## Storage

- **Every API path resolves inside `story-bible/`.** Enforced by `Bible.resolve`. Static file paths have their own prefix check in `serveStatic`.
- **Names starting with `.fl-tmp-` are reserved.** Enforced by `Bible.resolve`, `list`, and the watcher.
- **Every change names the version the caller saw.** Enforced by `requireVersion` for write, delete, and move. `moveFolder` and `POST /api/upload` take no version: they refuse an existing name (folder move) or pick a free name (upload).
- **Writes are atomic.** Enforced in `writeAtomic` (temp file, then rename).
- **The server records a hash before it writes.** Unenforced. `writeFile`, `deleteFile`, `moveFile`, `upload`, and `removeMedia` each call `watcher.expect`. A new write path that skips it makes the app report its own saves as outside changes.
- **The server binds to 127.0.0.1, checks `Host`, and refuses writes whose `Origin` is not the app.** Enforced in `handle` and `listenOnFreePort`.
- **SVG is never served from the bible.** Enforced by `IMAGE_TYPES`.

## Core modules

- **`public/js/core/` imports only the bare name `yaml` and relative paths, and touches no browser globals at module level.** Unenforced. It must run in Node as well. The page's import map points `yaml` at `/vendor/yaml/index.js`.
- **Unknown text is never dropped.** Unenforced, but `parseLayers`, `parseEntry`, and `updateSidecar` are written to keep it. Any change to them needs a round-trip check.
- **Status is derived from the text, except canon.** `updateEntry` makes empty and draft follow the text. Only `change.canon === true` sets canon. Editing a canon entry's text returns it to draft. Enforced in `updateEntry`.
- **`depth` in frontmatter is the deepest layer with text.** The editor passes `deepestFilled(state.layers)` on every save. Unenforced for hand edits.

## Names and layout on disk

- **A character's slug is its folder name and its file name.** Unenforced. `entryFile` builds the path. Renaming moves the folder, then the file, then updates `title` and `order.characters`; `renameCharacter` is the only place that does this.
- **Section ids are stable.** They name folders and files and key `sections.<id>` in the bible record. Unenforced.
- **A Sheet field's label is its `###` heading.** Unenforced. `parseLayers` matches by label, case-insensitively. Rename a label and old text lands in `sheetExtra` instead of the field, still saved but no longer shown as that field.
- **`portrait.jpg` is the reserved name for the portrait copy.** The Images tab hides it and upload with `replace=1` overwrites it. Other uploads never overwrite.
- **A portrait is stored two ways.** The `portrait` crop in frontmatter and the `portrait.jpg` file must agree. Choosing a silhouette removes both. Unenforced.
- **Sidecar path is `<image path>.meta.md`.** Enforced by using `sidecarPath` everywhere. The Images tab lists images only, so a sidecar never shows as an image (`isImage` fails on `.md`).
- **Section files for all three story types keep the shape `{ "sections": [{ "id": ... }] }`.** Required by the gate, which reads section ids from it.

## Page

- **One save at a time, one conflict at a time.** `state.saving` and `state.conflict` guard `save`. `route` does not navigate away from an entry while a conflict is open.
- **The page never keeps preferences in browser storage.** Unenforced. A project convention in `CLAUDE.md`.
- **Scripted animation goes through `animate`.** Unenforced. Direct `el.animate` calls skip the reduced-motion check.
- **Every vertical size is a multiple of 4px; blocks take whole 28px lines.** Partly enforced: the gate's `raw-token-value` rule flags values that equal a token. Rhythm as a whole is checked by eye with "Show grid".
- **Colors come from `tokens.css` only.** Enforced by the gate's `color-literal` rule, with one baselined exception.
- **Text on cream uses charcoal tones; orange never carries small text.** Unenforced. See `CLAUDE.md`.

## Restart rule

A running Fletchery does not pick up new server routes. Restart it after any `server/` change. Enforced only by the page's message when it gets the server's catch-all 404.
