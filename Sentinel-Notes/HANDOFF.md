# Handoff

Updated 2026-11-15. A full code review and a round of research are written up. Nothing from this session or the last is committed except this file.

## 1. Current task and status

The code review is done and logged, with no code changed. Tim hasn't yet said which findings to fix. The four small changes from 2026-11-02 are still uncommitted and untested in a browser.

## 2. Files touched (uncommitted)

- `Sentinel-Notes/code-review-2026-11-15.md` (new): the review, with findings H1-H3, M1-M7, L1-L8, D1-D4.
- `Sentinel-Notes/similar-apps-research-design-brief.md` (new): other apps, craft advice, and ideas. Brainstorming only.
- `Sentinel-Notes/TODO.md`: a "Code review findings" section, a line for the research brief, and the 2026-11-02 edits.
- `public/js/app.js`: from 2026-11-02. "Skip for now" on the Characters page only with no cards; the sidebar shows "Skipped" for Characters only while it has no cards.
- `Sentinel-Notes/formatting-editor-design-brief.md` (new, from 2026-11-02).
- `scratch/review-checks.mjs` (gitignored): reproduces H1, H2, H3, M3, L3.

## 3. Next step

Get Tim's answers below. If he approves the first batch, fix H1, H2, M3, M5, and L1 together and add a first `node:test` file for `public/js/core/` (M7), then ask him to test. Before any commit, shorten the two TODO lines over 200 characters (Formatting editor, Delete a character), or the gate blocks it.

## 4. Open questions for Tim

- Which review findings to fix, and in what order.
- H3: option A (unknown `## ` headings stay in their layer), option B (show the hidden text read-only), or both.
- Sentinel 1.8.0: update now, not now, or skip.
- The two `app.js` changes from 2026-11-02 still need his browser check.
- Delete a character: a real delete or a trash folder?
- Whether any research idea moves from "discuss later" to planned.

## 5. Tried and failed

- Long Python patches in a Bash heredoc can break on quoting. Write the script to `scratch/` and run it.
- After changing JS, reload the page, or Playwright gets the cached copy.
- Test against a copy of Tim's bible in `scratch/` on `--port 3100 --no-open`, never his real story.
- The Chrome browser tools disconnected on 2026-11-02; use Playwright.
