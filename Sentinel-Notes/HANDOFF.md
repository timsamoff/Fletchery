# Handoff

Updated 2026-11-15. Nothing is in progress. The code review fixes and H3b are tested by Tim, committed, and pushed.

## 1. Current task and status

None. The last work was the code review (`code-review-2026-11-15.md`), its fixes, the tests in `test/`, and H3b ("Other text in this file" under an entry).

## 2. Files touched

None uncommitted.

## 3. Next step

Characters step 3, the media library: a gallery of every image, picking existing images into an entry, and Move to library or Move to entry with link rewriting. Discuss the design with Tim before building. Settle L2b (thumbnails) as part of it, since the gallery loads many images at once. The review's leftovers (L3, L4, L6, L7b, L8, D4) and the research ideas are in the TODO.

## 4. Open questions for Tim

- Sentinel 1.8.0: update now, not now, or skip.
- Delete a character: a real delete or a trash folder?
- Whether any research idea moves from "discuss later" to planned.

## 5. Tried and failed

- Backslashes and quotes in a Bash heredoc get mangled. Write patch scripts with the Write tool into `scratch/`, then run them.
- `app.js` has CRLF line endings, so multi-line string matches from a script fail. Use the Edit tool, or normalize line endings in the script.
- Changing `bin/fletchery.js` trips the README gate. The plain "no free port" message (L7b) needs a README edit in the same commit.
- A Playwright `goto` to a new hash on a loaded page is only a hash change. Reload after it, and check which entry is open before typing.
- Test against a copy of a bible in `scratch/` on `--port 3100 --no-open`, never Tim's real story.
- Give Tim test steps in terms of what he does and where. "Add a line above `## Seed`" needed the explanation that it means the file in a text editor, not a box in the app.
