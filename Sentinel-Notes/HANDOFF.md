# Handoff

Updated 2026-11-15. Most code review findings are fixed and tested, but nothing is committed except this file. Tim hasn't tested any of it yet.

## 1. Current task and status

The review (`code-review-2026-11-15.md`) is fixed for H1-H3, M1-M7, L1, L2, L5, L7, and D1-D3. `npm test` passes (27 tests), `npm run sentinel:full` passes, and the page fixes were checked with Playwright against a throwaway bible. H3 used option A without asking Tim: only the three layer headings split a body. The two `app.js` changes from 2026-11-02 are in the same working tree, still unchecked by Tim.

## 2. Files touched (uncommitted)

- `server/server.js`: `readBody` decodes as one stream; `/api/media` sends an ETag and 304; the port search stops at 65535.
- `public/js/core/layers.js`: unknown headings stay in their layer or field; repeated headings add instead of replacing.
- `public/js/core/entry.js`: strips a byte order mark.
- `public/js/core/store.js`: `write` takes `{ keepalive }`.
- `public/js/app.js`: awaited `showEditor`, an `unhandledrejection` listener, slug decoding, `stayOnPage`, `state.page` values `loading` and `problem`, `save` and `saveNow`, `textChange`, the `pagehide` save, rename guard and rollback, the `renderDepth` guard. Plus the 2026-11-02 skip changes.
- `public/js/settings.js`: `merge` ignores a group that isn't a group; the close listener is removed.
- `test/core.test.js`, `test/server.test.js` (new), and a `test` script in `package.json`.
- `sentinel-gate/baseline.json`: three stale entries removed (11 left).
- Docs: `DESIGN.md`, `docs/SPEC.md`, `CLAUDE.md`, `INTEGRATION_CHECKLIST.md`, maintainer guide 04, 05, 08, 11, and its changelog.
- `Sentinel-Notes/`: `TODO.md` (fixed items moved to Done, leftovers listed), the review, the research brief, the formatting editor brief.

## 3. Next step

Ask Tim to test in the browser: type and move to another page at once; type and close the tab; rename a character; open a hand-made folder with a space in its name; type a `## ` line in a Seed and reload. Then commit, split as: the 2026-11-02 skip changes; the fixes with tests and docs; the review and research notes. Ask before pushing.

## 4. Open questions for Tim

- H3 option A is built. Is that the behavior he wants, and should H3b (show hidden text read-only) follow?
- Sentinel 1.8.0: update now, not now, or skip.
- Delete a character: a real delete or a trash folder?
- Whether any research idea moves from "discuss later" to planned.

## 5. Tried and failed

- Backslashes and quotes in a Bash heredoc get mangled (a literal byte order mark landed in `entry.js` once). Write patch scripts with the Write tool into `scratch/`, then run them.
- `app.js` has CRLF line endings, so multi-line string matches from a script fail. Use the Edit tool, or normalize line endings in the script.
- Changing `bin/fletchery.js` trips the README gate. The plain "no free port" message (L7b) needs a README edit in the same commit.
- A Playwright `goto` to a new hash on a loaded page is only a hash change. Reload after it, and check which entry is open before typing.
- Test against a copy of a bible in `scratch/` on `--port 3100 --no-open`, never Tim's real story.
