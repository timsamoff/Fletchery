# Handoff

Updated 2026-11-15. The media library (Characters step 3) is built and waiting on Tim's browser check. It is not committed.

## 1. Current task and status

Tim said "do it all" to the media library proposal, so all four steps were built with the recommended choices: `media/` as the library, references instead of copies, no thumbnails, no PDFs, and the page at `#/media` under Notes and media. `npm test` passes (38 tests), the gate passes, and Playwright checks passed for the gallery, filter, picker, every move, rename rewriting, and a portrait from a library image.

## 2. Files touched (uncommitted)

- `public/js/core/links.js` (new): references, link rewriting, `listAll`, `rewriteAll`, `moveImage`.
- `public/js/media-library.js` (new): the gallery page and the picker.
- `public/js/app.js`: the `#/media` route, `state.address`, the image dialog's new actions (`moveOpenImage`, `pickImage`), linked images on the Images tab, portrait references, rename rewriting, the sidebar link.
- `public/js/core/entry.js` (exports `FRONTMATTER`), `public/js/core/store.js` (`moveMedia`).
- `server/server.js`: `POST /api/move-media`.
- `public/css/base.css`: gallery, picker, and dialog styles at the end of the file.
- `test/links.test.js` (new), `test/server.test.js`, `package.json` (test script).
- Docs: `DESIGN.md`, `docs/SPEC.md`, `README.md`, `CLAUDE.md`, maintainer guide 04, 05, 08 and its changelog, `characters-design-brief.md`, `TODO.md`.

## 3. Next step

Tim restarts Fletchery (the server changed) and tests: open Notes and media; add an image to the library; open an image and move it; on a character's Images tab use "Choose from the media library", then Take off this entry; rename a character whose image another character shows. After his OK, commit ("Add the media library") and ask before pushing. Then the overall app design discussion he asked for: ask what he has in mind (visual, interaction, or code structure) before proposing anything.

## 4. Open questions for Tim

- Sentinel 1.8.0: update now, not now, or skip.
- Delete a character: a real delete or a trash folder?
- Whether any research idea moves from "discuss later" to planned.

## 5. Tried and failed

- Backslashes and quotes in a Bash heredoc get mangled. Write patch scripts with the Write tool into `scratch/`, then run them.
- Several source files have CRLF line endings, so multi-line string matches from a script fail. Use the Edit tool, or normalize line endings in the script (see `scratch/docs-patch2.cjs`).
- Changing `bin/fletchery.js` or `sections/*.json` trips the README gate.
- A Playwright `goto` to a new hash on a loaded page is only a hash change. Reload after it, and check which entry is open before typing.
- An `<input type="search">` gets no field styling; use `type="text"`.
- Test against a copy of a bible in `scratch/` on `--port 3100 --no-open`, never Tim's real story.
- Give Tim test steps in terms of what he does and where, in the app, not in terms of the file format.
