# Handoff

Written 2026-10-30. All three steps of the visual redesign are built. Step 3 is waiting on Tim's review.

## 1. Current task and status

- **Visual redesign** ([visual-redesign-design-brief.md](visual-redesign-design-brief.md), "Build"). Steps 1 and 2, plus the folder tabs, are pushed and approved. Step 3 is committed and tested in a browser:
  - fletching links,
  - everything but the field fading while typing,
  - the Google Docs paste fix.

## 2. Files touched in step 3

- `public/js/app.js`: `onPaste` (multi-line pastes get blank lines between paragraphs, kept in undo history through `insertText`) and `fadeChrome` (the `is-writing` class on `<html>` during typing, cleared after 2 seconds, on pointer movement, or on blur).
- `public/css/base.css`: the fletching mark on `p a` and `.link-button` (an orange chevron SVG mask) replacing underlines, and the fade rules at the end of the file.

## 3. Next step

Wait for Tim's review of step 3. After that, the strongest open items:
- **The Settings page** (TODO): font choice and author info. It would also be the natural home for a fade on/off switch and its timing.
- **The Premise brief's open decisions:** the Sheet model and the names for the two question layouts.

## 4. Open questions for Tim

- Is a 2-second pause before the page returns from the fade right?
- Text area boundaries: the boxes keep a mid-charcoal border, because paper on cream is too faint to count as a field edge (WCAG 1.4.11).
- The tablet tier from the brief isn't designed yet. The app still has 720px and 960px points only.

## 5. Tried and failed

- Editing a brief without touching its TODO line trips the gate's `todo-sync` check, including on `--amend`.
- Adding a dependency trips `spec-gate` until `docs/SPEC.md` is updated in the same commit.
- The `raw-token-value` check runs on commit, so `sentinel:full` can pass while a commit with a raw 2px or 8px still fails.
- If a commit fails and a second `git add` plus `git commit` follows in the same command, the second commit sweeps in everything still staged. Check the first commit before running the second.
