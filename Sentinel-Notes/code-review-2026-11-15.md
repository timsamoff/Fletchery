# Code review, 2026-11-15

A review of the whole project against `DESIGN.md`, `docs/SPEC.md`, and the Sentinel gate, run at commit `c067313` with the handoff's uncommitted changes in the working tree. No code was changed. Open items are tracked in [TODO.md](TODO.md) under "Code review findings".

**Status, 2026-11-15:** H1, H2, H3 (option A), M1 to M7, L1, L2 (the ETag), L5, L7 (the port range), and D1 to D3 were fixed the same day. What is left is in the TODO. The text below is the review as written.

"Confirmed" means the finding was reproduced with `scratch/review-checks.mjs` (gitignored) or follows directly from the code. "Risk" means the path exists but wasn't triggered.

## Summary

The architecture is sound and consistently applied. The server is a plain file store, the entry logic runs in both the browser and Node, the version check covers the save path, and the security model in `DESIGN.md` matches the code. No XSS path was found from bible content into the page, and no way out of `story-bible/` through the API.

The weak spots are in the areas the gate doesn't look at. Sentinel checks docs, commit messages, and CSS tokens, and nothing checks behavior. Three confirmed bugs can damage or hide the writer's text without any error, and a small test file for the pure core modules would have caught all three. The rest is error handling in the page and some doc drift.

Structural debt already recorded in [08-fragile-zones-and-debt.md](../Sentinel-Maintainer-Guide/08-fragile-zones-and-debt.md) (the size of `app.js`, many-entry sections tied to Characters, store bypasses, undeclared state fields) isn't repeated here.

## High: can lose or corrupt the writer's text

### H1. A save can corrupt non-ASCII characters (confirmed)

`readBody` in [server.js](../server/server.js) (lines 252-256) does `data += chunk` on raw Buffers, so a multi-byte character split across two network chunks becomes replacement characters. Sending `It’s here.` split inside the apostrophe returned 200 and stored `It���s here.` The page gets a matching version back and reports the save as good. Chunks split at about 64 KB, so this needs a large entry, and then each split has a few percent chance of landing inside a curly quote. Rare, but silent.

Fix: `req.setEncoding('utf8')` before the loop, or collect Buffers and decode once.

### H2. A repeated `###` field heading in a Sheet drops text (confirmed)

In [layers.js](../public/js/core/layers.js) (lines 42-46), `fieldChunks[field] = []` resets the field each time its label appears. A Sheet with two `### Age` parts keeps only the second. The same happens when the writer types `### Role` inside the Age box: after a reload, the text under it is gone from the file on the next save. This breaks the "never drop text" rule.

Fix: append to the existing chunk when a label repeats.

### H3. A `## ` line typed in a box hides everything after it (confirmed)

A writer who types `## My notes` in the Seed box sees the rest of that box vanish after a reload. The text is still in the file, in `extra`, but the app never shows `preamble` or `extra` (`fieldValue` in `app.js`, lines 1738-1741). An unknown `###` in a field Sheet goes to `sheetExtra`, which isn't shown either. Nothing is deleted, but the writer can't tell. This matters more once the formatting editor adds a heading button.

The fix is a judgment call, waiting on Tim:

- **Option A:** keep unknown `## ` headings inside the layer they were typed in, so only the three exact layer names split the body. This changes where hand-written extra sections land.
- **Option B:** keep the parser and show `preamble`, `extra`, and `sheetExtra` in a read-only "Other text in this file" block.

Recommendation: A plus a small version of B, with moderate confidence.

## Medium

### M1. Navigating away doesn't check that the save worked (confirmed by reading; narrow window)

`route()` in `app.js` (lines 360-362) awaits `save()` and carries on regardless. If that save hits a conflict, `state.conflict` is set and then the page is replaced, so the next entry can't save and every keystroke throws at line 1908. If the save fails outright, the unsaved text is discarded. `save()` also returns at once when a save is already in flight (line 1948), so `route()` can load a new entry while the old write is still landing.

Fix: after the await, stay on the page if there is a conflict or the entry is still dirty, and have `save()` return the in-flight promise.

### M2. Renaming a character is four steps with no rollback (risk)

`renameCharacter` (`app.js`, lines 858-878) moves the folder, moves the file, updates the order, and writes the title. If the file move fails after the folder move (a Windows lock, or a 409 because a conflict panel is open or a save is in flight), the folder is `new/` holding `old.md`. `loadCharacters` then finds no `new/new.md` and the character disappears from the app.

Fix: refuse to rename while `state.conflict` or `state.saving` is set, and move the folder back if the second step fails.

### M3. A file saved with a byte order mark loses its frontmatter (confirmed)

The `FRONTMATTER` regex in [entry.js](../public/js/core/entry.js) (line 13) needs `---` at byte zero. With a BOM, the parser sees no frontmatter, the next save writes a fresh block (status back to draft), and the old block becomes body text.

Fix: strip a leading `﻿` in `parseEntry`.

### M4. Startup and click handlers have no error surface (confirmed)

`showEditor` isn't awaited in `start()` (`app.js`, line 78), so anything it throws after its first await leaves an empty page. Many async handlers (`openImage`, `renderImages`, `saveCharacterOrder`) have the same gap. One trigger: a hand-written `title: 1984` parses as a number and `a.title.localeCompare` throws at line 483. `JSON.parse` at line 1997 is another.

Fix: `await showEditor(...)`, one `unhandledrejection` listener that calls `setStatus`, and `String()` on `title` where it's read.

### M5. Hand-made character folders with spaces or accents can't be opened (confirmed by reading)

Links encode the slug, but `route()` (`app.js`, line 353) compares the still-encoded hash to the folder name. `Old Tom` becomes `Old%20Tom` and bounces to the list.

Fix: `decodeURIComponent` on the slug.

### M6. Closing the tab within half a second of typing loses those keystrokes (confirmed absent)

Nothing in `public/js/` handles `pagehide` or `beforeunload`.

Fix: on `pagehide`, send the pending save with `fetch(..., { keepalive: true })`.

### M7. No automated tests, and the ones that existed were thrown away

`scratch/` holds `layers-check.mjs` and `core-check.mjs`, both gitignored. `entry.js`, `layers.js`, and `media.js` are pure and run in Node, so `node:test` covers them with no new dependency. T1 names only `server/`. Widen it to the core and start there, with H2, H3, and M3 as the first cases.

## Low

- **L1.** Latent crash on the last section: `app.js` line 1574 reads `nextSection.title` when `nextSection` is undefined. It can't fire until the final section in a list is built. Confirmed by reading.
- **L2.** Images are re-downloaded in full on every redraw. `/api/media` sends `no-cache` with no ETag (`server.js`, line 127), and the Images tab uses the originals as thumbnails (`app.js`, line 1020). Settle this before the media library's gallery. An ETag from size and mtime is cheap. Thumbnails are a design question.
- **L3.** YAML comments in frontmatter are dropped on save (confirmed). `parseDocument` would keep them. Judgment call.
- **L4.** Portrait, crop, image order, and duplicate call `writeEntry` directly, skipping the saving and conflict guards, so one landing during a save shows a false conflict panel. Risk, narrow.
- **L5.** Settings values aren't validated. A hand-edited `"fade": true` or `"layout": null` crashes `applyPrefs` (`app.js`, line 89).
- **L6.** Small duplications: `esc` and `escAttr`; `slugify` and `safeName`; three lists of image types; the slide-close logic in `settings.js` and `closeFocus` (the `settings.js` copy adds a `transitionend` listener on every close and never removes it, line 238); `visibleSections()` re-derived at `app.js` line 1569. Stylistic.
- **L7.** The port search can run past 65535 (`server.js`, line 275), and a failed listen prints a raw stack trace from `bin/fletchery.js`.
- **L8.** The path guard doesn't resolve symlinks. The writer would have to create one, so record the decision and leave it.

## Doc and gate drift

- **D1.** `DESIGN.md` says "As of the Premise step" and "before the Premise section is built out", and its storage interface table omits `info`, `moveFolder`, `upload`, `deleteMedia`, and `mediaUrl`. A synchronous `mediaUrl` won't fit a folder-backed store.
- **D2.** `INTEGRATION_CHECKLIST.md` still describes layers as parsed by `server/bible.js` and mentions `baseHash`, `ENTRY_PATH`, and `server/indexes.js`.
- **D3.** `sentinel-gate/baseline.json` has 14 entries and 11 still match. The stale three (`text-decoration-thickness: 2px`, `width: 48px`, `height: 48px`) would let those lines come back unblocked. The S1 count in the TODO is off as well.
- **D4.** The `new-file-type` check appends to `known-extensions.txt` in the working tree, so retrying the commit passes without the questions being answered. This belongs upstream in Sentinel.

## Quality gate results

| Check | Result |
|---|---|
| `npm run sentinel:full` | Pass, exit 0. 11 baselined items not blocking. |
| `npm run sentinel:report` | 11 findings, all in `base.css`, all baselined. |
| Hooks installed | Yes, `core.hooksPath` is `sentinel-gate/hooks`. |
| `node --check` on every JS file | Pass. |
| JSON parse of sections, gate config, `package.json` | Pass. No duplicate field labels in any Sheet. |
| `npm audit --omit=dev` | 0 vulnerabilities. |
| Unused CSS classes and tokens | None beyond `--unit` and `--baseline` (S5). |
| Tests, lint, build | None exist. |
| `scratch/review-checks.mjs` | Reproduced H1, H2, H3, M3, L3. |

## Not reviewed or not validated

- Nothing was run in a browser, so M1, M2, M4, M5, and L4 come from reading the code.
- `base.css` got a mechanical pass only (media queries, unused classes, reduced motion), with no visual or contrast check.
- macOS and Linux behavior (X1), accessibility with a screen reader (A1), and the design briefs for unbuilt work.
- `first-prompt/` and the approved plan.

## Suggested order

1. H1, H2, M3, M5, and L1 together, with a first `node:test` file for the core. None has a design question.
2. H3, once Tim picks an option.
3. M1, M2, M4, and M6 one at a time, each tested in the browser before the next.
4. D1 to D3 in one docs commit.
