# Handoff

Updated 2026-11-16. Nothing is in progress. Everything is committed and pushed.

## 1. Current task and status

None. Today's work, all pushed: panels and open tabs use the sidebar's plum `#DBD5D8`; inactive tabs, generic profile pictures, and the toast use a darker plum `#CDC1C8`; the toast has a close button and a wide soft shadow (`--shadow-toast`); writing boxes grow and shrink with their text and keep a dragged height (`fitTextarea` in `app.js`). Tim has not yet tried the auto-grow in his own bible.

## 2. Files touched

None uncommitted.

## 3. Next step

Tim restarts nothing (no server changes), reloads, and tries the auto-grow boxes and the toast. Then the new icon (`assets/fletchery-icon.svg` is still the dark one), the overall design discussion he asked for, and Characters step 4 (relationships).

## 4. Open questions for Tim

- Which flourishes stay (gilt rules, ribbon, card spines, ornament, endpaper)? The ornament glyph looks like a small fruit in the font; an SVG would fix it.
- Should unsaved, saving, and saved ever become toasts? They stay beside the editor for now.
- Sentinel update: the repo is on 1.8.0 now; confirm nothing else is pending.
- Delete a character: a real delete or a trash folder?

## 5. Tried and failed

- Backslashes and quotes in a Bash heredoc get mangled. Write patch scripts with the Write tool into `scratch/`, then run them.
- Several source files have CRLF line endings. Use the Edit tool.
- The gate's raw-token rule flags values like `4px` and `28px` in `base.css`. Use the token.
- The sheet shadow (`--shadow-sheet`) vanishes on a small card because of its negative spread; the toast has its own token.
- Tim tests on his real EOL bible on port 3000. Never send it a request that changes anything. Test typing on a throwaway story folder on another port (`scratch/`).
- `scratch/autogrow-story` was busy when deleted; remove it later (gitignored).
