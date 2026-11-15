# Handoff

Updated 2026-11-15. The code review fixes are tested by Tim, committed, and pushed. H3b is built and waiting on Tim's browser check.

## 1. Current task and status

H3b: text no box holds (anything before the first layer heading, or before a Sheet's first field) now shows read-only under the entry as "Other text in this file". Checked with Playwright; `npm test` and the gate pass. Not committed.

## 2. Files touched (uncommitted)

- `public/js/app.js`: an `#other-text` section in the entry page, and `renderOtherText`, called from `renderAll`.
- `public/css/base.css`: `.other-text` styles.
- `Sentinel-Notes/TODO.md`: H3b moved to Done.
- Maintainer guide 05, 08, and the changelog.

## 3. Next step

Ask Tim to check H3b: put a line of text above `## Seed` in a character file, and a line between `## Sheet` and the first `###`, then open the character and scroll to the bottom. A character without such text shows no block. Then commit ("Show text that has no box under the entry") and ask before pushing. After that, Characters step 3 (the media library) is the next feature; discuss it first.

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
