# Handoff

Written 2026-10-30. The visual redesign is built and reviewed, and the first Settings panel is built and waiting on Tim's review.

## 1. Current task and status

- **Visual redesign** ([visual-redesign-design-brief.md](visual-redesign-design-brief.md)): built and pushed. Motion is a standing design rule in CLAUDE.md.
- **Settings panel** ([settings-page-design-brief.md](settings-page-design-brief.md)): built in `93aa943`, not pushed, and tested in a browser.
  - It opens from "Settings" in the header and slides in from the right.
  - It covers the writing font, paste handling, the interface font, and the fade options (on or off, scope, and pause).
  - Settings are saved in `story-bible/fletchery-settings.json`, never in browser storage, and an outside edit to the file shows in the open app.
- **Premise:** the Sheet is now one box. The question set is still Tim's to edit.

## 2. Files touched for Settings

- `public/js/settings.js` (new): the `Settings` class (load, merge, save with a version check, reload on outside edits) and the panel.
- `public/js/app.js`: uses `prefs` (the writer's settings) for fonts, paste, fade, and layout choices. `readPref` and `writePref` are gone.
- `public/index.html`: the header's Settings button and the panel's dialog.
- `public/css/base.css`, `tokens.css`: the panel, the header button, `--color-backdrop-soft`, and `data-writing-font`.
- `docs/SPEC.md` (decision 11), `DESIGN.md`, `CLAUDE.md`: record the settings file.

## 3. Next step

Get Tim's review of the Settings panel. Then ask which author fields he wants, and whether text zoom belongs in Settings now or waits for the formatting editor.

## 4. Open questions for Tim

- Author info fields.
- The AI choice in Settings: the Claude Code bridge, an Anthropic API key, or OpenRouter, and what the button says for each.
- The formatting editor: a light toolbar or full formatting.

## 5. Tried and failed

- The file watcher skips the server's own writes and writes with unchanged contents. Test outside edits with a real change made on disk, not through `/api/file`.
- Editing a brief without touching its TODO line trips `todo-sync`. Commit subjects are limited to 100 characters, and bullets to 80.
- If a commit fails and a second `git add` plus `git commit` follows in the same command, the second commit sweeps in everything still staged.
