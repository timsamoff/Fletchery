# Handoff

Updated 2026-11-02. Characters steps 1 and 2 are confirmed working. Four small changes sit uncommitted, waiting on Tim's OK.

## 1. Current task and status

Tim confirmed Characters step 2 (portrait and images). He kept the wide strip on cards and decided to leave the writing-box height as it is. Then came cleanup and backlog work, none of it committed or tested in a browser.

## 2. Files touched (uncommitted)

- `public/js/app.js`: the Characters page shows "Skip for now" only when there are no cards. The sidebar shows "Skipped" for Characters only while it has no cards.
- `Sentinel-Notes/TODO.md`: Characters line says steps 1 and 2 confirmed. Added onboarding screen, Ask AI button, delete a character, and the formatting editor line now links its brief.
- `Sentinel-Notes/formatting-editor-design-brief.md` (new): recommends CodeMirror 6 with a small toolbar; library notes are `[UNVERIFIED]`.

## 3. Next step

Ask Tim to check the two `app.js` changes in a browser, then commit them with the docs. After that, either the Ask AI button (enabled, goes to Settings when no AI is chosen) or Characters step 3, the media library: a gallery of every image, picking existing images into an entry, and Move to library or Move to entry with link rewriting.

## 4. Open questions for Tim

- Delete a character: a real delete or a trash folder?
- Formatting editor: marked source or hybrid markers, decided after a prototype.

## 5. Tried and failed

- Long Python patches in a Bash heredoc can break on quoting. Write the script to `scratch/` and run it.
- After changing JS, reload the page, or Playwright gets the cached copy.
- A silhouette style has to show in the outline.
- Test against a copy of Tim's bible in `scratch/` on `--port 3100 --no-open`, never his real story.
- The Chrome browser tools disconnected this session; use Playwright.
