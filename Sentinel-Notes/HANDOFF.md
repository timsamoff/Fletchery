# Handoff

Updated 2026-11-16. Nothing is in progress. The media library (Characters step 3) is tested by Tim and committed as `c0d3e12`. It is not pushed yet.

## 1. Current task and status

None. Tim confirmed the media library works after restarting Fletchery. His first try failed only because the running server predated the new route, and the message was hidden behind the image dialog; problems now show inside the dialog.

## 2. Files touched

None uncommitted.

## 3. Next step

Ask Tim whether to push. Then the overall app design discussion he asked for: ask what he has in mind (the look and interaction, the code's structure, or both) before proposing anything. After that, Characters step 4 (relationships) is the next build step in `characters-design-brief.md`.

## 4. Open questions for Tim

- OK to push `c0d3e12` and the commits after it?
- Sentinel 1.8.0: update now, not now, or skip.
- Delete a character: a real delete or a trash folder?
- Whether any research idea moves from "discuss later" to planned.

## 5. Tried and failed

- Backslashes and quotes in a Bash heredoc get mangled. Write patch scripts with the Write tool into `scratch/`, then run them.
- Several source files have CRLF line endings, so multi-line string matches from a script fail. Use the Edit tool, or normalize line endings in the script (see `scratch/docs-patch2.cjs`).
- Changing `bin/fletchery.js` or `sections/*.json` trips the README gate.
- A Playwright `goto` to a new hash on a loaded page is only a hash change. Reload after it, and check which entry is open before typing.
- An `<input type="search">` gets no field styling; use `type="text"`.
- After any server change, tell Tim to restart Fletchery as the first test step, and check the running server has the new route before debugging anything else (`POST` an empty body to the route: 404 "Not found." means an old server).
- A status-line message is invisible while a modal dialog is open. Show problems inside the dialog.
- Tim tests on his real EOL bible on port 3000. Never send it a request that changes anything.
