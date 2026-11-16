# State and data

## On disk

Everything lives under `<story project>/story-bible/`. Paths in the API are relative to that folder.

| Path | Written by | Contents |
|---|---|---|
| `fletchery.json` | `showSetup`, `updateBibleRecord` | The bible record: `version`, `storyType`, `title`, `scope`, `claudeMdPointer` (always `null` so far), `sections.<id>.skipped`, `order.characters` (slugs), `createdAt`. An older `font` key may exist; settings reads it once. |
| `fletchery-settings.json` | `Settings` in `settings.js` | The writer's settings. Keys and defaults are in `DEFAULTS`: `author` (`name`, `coAuthors`), `interfaceFont`, `writingFont`, `paste`, `fade` (`on`, `scope`, `pauseSeconds`), `layout` (`questionMode`, `sectionsFolded`, `charactersOpen`, `grid`). |
| `premise/premise.md` | `writeEntry` | The Premise entry. The path comes from `file` in the section data. |
| `characters/<slug>/<slug>.md` | `writeEntry`, `addCharacter`, `renameCharacter` | One character. |
| `characters/<slug>/<image>` | `POST /api/upload` | The character's images. |
| `characters/<slug>/<image>.meta.md` | `saveImageDetails`, `duplicateImage` | An image's sidecar. |
| `characters/<slug>/portrait.jpg` | `saveCrop` | A 512 pixel cropped copy used by cards. Hidden from the Images tab. |
| `fletcherling.json` | Old bibles only | Renamed to `fletchery.json` on first open by `readSettingsFile`. |

Planned but not written yet: `BIBLE.md`, `index.md` files, `.fletchery/` (requests, proposals, layout), `books/`, `series/`.

### Entry file

```
---
title: ...            # the name (characters) or section title
type: characters      # the section id
depth: seed|sketch|sheet
status: empty|draft|canon
author: writer|ai-draft|ai-reviewed
updated: ISO timestamp
description: ...      # first line of the layer named by descriptionFrom
silhouette: ...       # characters only, optional
portrait: { image, x, y, size }   # characters only, optional
images: [file names]  # characters only, optional order
---

## Seed
...
## Sketch
...
## Sheet
### Field label
...
```

Only layers with text are written, in that order. Text before the first layer heading (`preamble`) is kept. Only the three layer headings split a body: any other `##` heading stays in the layer it sits in, and a `###` heading that isn't a field label stays in its field (`extra` is always empty now). A layer or field heading that appears twice adds to the first. `preamble`, and `sheetExtra` in a Sheet of fields, have no box, so `renderOtherText` shows them read-only under the entry ("Other text in this file"). A body with no layer headings reads as the Seed. A Sheet with its own `questions` (Premise) is one free-text box; its text is held in `sheetExtra`.

### Sidecar

Frontmatter `caption` and `alt`. The body holds a `## What to notice` section. Other keys and other body text are kept.

## In the browser

All page state is the `state` object in `app.js`. Fields set in its literal:

- `settings`, `settingsVersion`: the bible record and its version.
- `sectionSet`, `section`: the loaded section file and the open section.
- `page`: `'entry'`, `'list'`, `'loading'` (an entry being read; nothing saves), or `'problem'` (an entry that couldn't be read). `entry`: `{ path, slug }`.
- `characters`: card data for the sidebar and cards. `statusCache`: status per single-entry section.
- `layers`, `depth`, `mode`, `step`, `contextOpen`, `focusOpen`: the editor.
- `baseVersion`, `baseContent`, `savedBody`, `frontmatter`: the loaded file, for saving and for dirty checks.
- `saving`, `timer`, `remotePending`, `conflict`: save and sync control.
- `navCollapsed`.

Fields added later without being in the literal: `view` (`'text'` or `'images'`, set in `openEntry` and `setView`), `images`, and `imageOpen`.

`isDirty()` compares the composed body with `savedBody`. Frontmatter edits (rename, silhouette, portrait, image order) go through `writeEntry({ set })` and do not count as dirty text.

The writer's preferences live in `prefs` (a `Settings`), not in `state`. Nothing durable is kept in browser storage. `legacyLayout` reads three old `localStorage` keys once.

## Versions and the single source of truth

The disk file is the source of truth. A version is `hash(text)`, the SHA-256 of the file's UTF-8 text. The server computes it on read and write. The page never computes one; it passes back the version it last received as `baseVersion`. `null` means the file must not exist yet.

Images are hashed as `buffer.toString('utf8')`, which is lossy for binary data. Both the server's `expect` call and the watcher's later read use the same conversion, so they agree. The value is not meaningful as a content fingerprint of an image.

## Image references (added 2026-11-15)

An entry's `images` list orders its images. Each item is a bare file name (an image in the entry's folder) or a path from the bible root (an image in `media/` or in another entry's folder). `portrait.image` follows the same rule. In `state.images` each item has `key` (how the list names it), `path`, `name`, and `linked` (true when it's kept somewhere else). `state.address` is the address of the page that's showing, and `state.page` can also be `'media'`.
