# Handoff

Written 2026-10-30, at 95% of the five-hour usage limit. Everything is committed; five commits after `6473cb2` are not pushed and wait on Tim's OK.

## 1. Current task and status

Polishing the redesign and the Settings panel on Tim's notes. Everything asked so far is built, browser-tested, and committed:
- **Settings panel:**
  - a Credit section (Author, Co-authors), shown under each entry as "Written by";
  - an AI section shown as a dimmed preview;
  - 1px focus outlines everywhere;
  - a gear on the header button and the panel heading.
- **Writing box:** can be dragged taller on the page. It can't be resized in Focus.
- **Focus sheet:**
  - no header, inset 32px from the window on every side;
  - only the writing box scrolls;
  - the cursor carries in and out;
  - Done is full size, absolutely positioned 16px from the sheet's top and 16px above the question panel.
- **Decisions recorded:**
  - API keys go in `fletchery-api.json` in the per-user config folder (SPEC 11).
  - Don't assume a story folder is a git repo (CLAUDE.md).
  - Text zoom waits for the formatting editor.

Unpushed: `3f8fbfc`, `509aff7`, `afa6c6a`, `0e3696d`, `982b838`, `d4e4ed1`, `3dbdc98`, and `41006f7`.

## 2. Files touched this stretch

- `public/js/app.js`:
  - the Focus rework (`caretSnapshot`, `restoreCaret`, `closeFocus`, and Done drawn in the tab row when `state.focusOpen`);
  - `writtenBy()` for the entry details.
- `public/js/settings.js`: the Credit and AI sections, and `escAttr`.
- `public/index.html`: the gear icons.
- `public/css/base.css`: the Focus sheet, `.focus-done`, the resizable fill box, `.button-soft` hover, and the settings field styles.
- `public/css/tokens.css`: `--focus-ring` set to 1px.
- `docs/SPEC.md`, `CLAUDE.md`, `Sentinel-Notes/settings-page-design-brief.md`, `TODO.md`: the decisions above.

## 3. Next step

The Focus overlap bug is fixed in `41006f7` and tested at widths from 375px to 1440px.
- **Clear space:** the Focus tab row keeps Done's width (96px plus a gap) clear, so the link never runs under it.
- **Container queries:** below 560px on the page, and below 720px of card width in Focus, the link moves to its own line on the panel's color, inset like the panel's contents, and runs the panel's full width.
- **No unstyled wrap:** at no tested width does the link wrap without that styling.

Then `200a9f4`:
- On phones, Focus trims only its side padding, so Done stays 16px from the sheet's top at every width.
- The wrapped link's gap to the numbers is evened out (padding-top `--space-2` on the panel).
- The writing box's 80ch cap is gone, so the text runs the full width with equal margins (Tim's call).

Next: ask Tim to OK pushing the local commits, `3f8fbfc` through `200a9f4` plus the handoff commits. Then ask what's next. The open questions below are the candidates.

## 4. Open questions for Tim

- Whether a dragged writing-box height should be kept in Settings.
- The AI section going live, which needs the server-side key file.
- The Premise question set, and the formatting editor (a light toolbar or full formatting).

## 5. Tried and failed

- Shrinking Done to fit the tab row: Tim wants buttons to keep one size.
- Sizing the Focus sheet with `100vw` counts the page scrollbar and sits off-center. Use `inset`.
- Reading the caret after moving `#work` loses it. Read the textarea's selection first.
- The file watcher skips the server's own writes and same-content writes. Test outside edits on disk.
- Commit limits: subject 100 characters, bullets 80. A brief edit needs its TODO line touched.
