# Handoff

Updated 2026-11-15. The code review fixes are tested by Tim and committed. Nothing is in progress.

## 1. Current task and status

Done: the review, the fixes (H1-H3, M1-M7, L1, L2, L5, L7, D1-D3), the tests, and the docs. Tim verified them in the browser. Four commits are local and not pushed: `4ca2a2e`, `5df2f04`, `b2012b5`, and this handoff.

## 2. Files touched

None uncommitted.

## 3. Next step

Push once Tim says so. Then the strongest next item is H3b (show text the boxes can't hold in a read-only block), because it closes the last gap where a writer's text is kept but not shown. Characters step 3, the media library, is the next feature. Discuss either with Tim before building.

## 4. Open questions for Tim

- OK to push the four commits?
- Sentinel 1.8.0: update now, not now, or skip.
- H3 option A is built and tested. Should H3b follow?
- Delete a character: a real delete or a trash folder?
- Whether any research idea moves from "discuss later" to planned.

## 5. Tried and failed

- Backslashes and quotes in a Bash heredoc get mangled. Write patch scripts with the Write tool into `scratch/`, then run them.
- `app.js` has CRLF line endings, so multi-line string matches from a script fail. Use the Edit tool, or normalize line endings in the script.
- Changing `bin/fletchery.js` trips the README gate. The plain "no free port" message (L7b) needs a README edit in the same commit.
- A Playwright `goto` to a new hash on a loaded page is only a hash change. Reload after it, and check which entry is open before typing.
- Test against a copy of a bible in `scratch/` on `--port 3100 --no-open`, never Tim's real story.
