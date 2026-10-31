# Handoff

Written 2026-10-30. Characters step 1 is built; steps 2 to 5 remain.

## 1. Current task and status

**Characters, step 1 of 5** ([characters-design-brief.md](characters-design-brief.md)) is built, browser-tested, and committed, with later revisions (form Sheet, pencil rename, hand-drawn card dragging, animated folder). Four commits since `4beaff3` are unpushed. It's waiting on Tim's review. It covers:
- the Characters page with cards and silhouettes;
- Add a character;
- an editor for each character, with the approved fields and questions and the Archetype chips;
- Rename, through a new folder-move API;
- the placeholder portrait;
- the folding Characters list in the sidebar;
- page addresses (`#/premise`, `#/characters`, `#/characters/<slug>`);
- Go to Characters from the Premise Sheet.

## 2. Files touched for step 1

- `sections/*.json`: the Characters definition (17 fields; screenplay and game add their own).
- `public/js/app.js`: `route()`, `openEntry()`, `renderListPage()`, `loadCharacters()`, the name dialog, `renameCharacter()`, `cycleSilhouette()`, `renderHead()`, the folder-style `renderNav()`, `openFocus()` split from `setupFocus()`, and the archetype chips.
- `public/js/core/entry.js`: `updateEntry` accepts `set` (title, silhouette).
- `public/js/core/store.js` and `server/bible.js`, `server/server.js`: `moveFolder`, `POST /api/move-folder`.
- `public/js/settings.js`: `layout.charactersOpen`.
- `public/css/base.css`: cards, portrait, name dialog, sidebar folder, chips.
- Docs: SPEC (Characters), DESIGN, README, CLAUDE.md, the brief, and TODO.

## 3. Next step

First, fix the rename bug Tim found on 2026-10-30: renaming Barb to Deb from the pencil shows "Not found." in the dialog (a 404 from the server). It worked when step 1 was tested. Start by checking whether the running server predates `POST /api/move-folder` (restart `fletchery`), then trace `renameCharacter()` in `public/js/app.js`: the folder move, then the file move, then the `order.characters` update.

After that, Get Tim's review of step 1 and OK to push. Then step 2, images: an image zone on each character, with `.meta.md` sidecars (caption, alt text, what to notice). It needs a server route for binary uploads.

## 4. Open questions for Tim

- Whether a dragged writing-box height should be kept in Settings.
- The AI section going live, which needs the server-side key file.
- The formatting editor (a light toolbar or full formatting). Text zoom and margin notes wait on it.

## 5. Tried and failed

- Shrinking Done to fit the tab row: Tim wants buttons to keep one size.
- Sizing the Focus sheet with `100vw` counts the page scrollbar and sits off-center. Use `inset`.
- Reading the caret after moving `#work` loses it. Read the textarea's selection first.
- The file watcher skips the server's own writes and same-content writes. Test outside edits on disk.
- Commit limits: subject 100 characters, bullets 80. A brief edit needs its TODO line touched.
