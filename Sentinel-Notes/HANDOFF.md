# Handoff

Written 2026-10-30. The visual redesign is underway: steps 1 and 2 of 3 are built, and step 2 is waiting on Tim's review.

## 1. Current task and status

- **Visual redesign** ([visual-redesign-design-brief.md](visual-redesign-design-brief.md), "Build"). Steps 1 and 2 are pushed, and Tim approved step 2's look. The question card now uses folder tabs (Interview me, Full form) over a panel with `‹ 1 2 3 ›` question steps, committed in `40b7384` and tested at 1440px and 375px. Step 3 (details) isn't started.
- **Premise review items** ([premise-end-to-end-design-brief.md](premise-end-to-end-design-brief.md), "Tim's review"). One screen per depth and the Sheet question card are built with step 2. The paste fix comes with step 3. The Sheet model and the mode names are still open.

## 2. Files touched in step 2

- `public/js/app.js`: new section page markup, depth steps, folded context, one question card for every depth, the section list toggle and status strip (`fl-nav` preference), the Focus dialog (moves `#work` in and back), and the "Go to" next-depth button.
- `public/css/base.css`: the workspace grid with an animated width, the status strip, the new section page, the question card, writing fields that fill the page, the Focus dialog's Rise animation, `[hidden]` forcing `display: none`, and `.wrap` widened to 1600px.
- `public/css/tokens.css`: `--shadow-sheet` and `--color-backdrop`.

## 3. Next step

Build step 3:
- Fletching links: two small orange chevrons after the link text, which shift right on hover.
- Chrome that fades while the writer types (Fade, which Tim leans toward), returning at full contrast on pause or pointer movement.
- The Google Docs paste fix: turn single line breaks into paragraph breaks on paste.

## 4. Open questions for Tim

- Fade or Tuck (he leans Fade).
- Text area boundaries: the boxes keep a mid-charcoal border, because paper on cream is too faint to count as a field edge (WCAG 1.4.11).

## 5. Tried and failed

- Editing a brief without touching its TODO line trips the gate's `todo-sync` check, including on `--amend`.
- Adding a dependency trips `spec-gate` until `docs/SPEC.md` is updated in the same commit.
- In the nav grid, a 264px-wide child sized the only column, so the collapsed toggle and strip centered off-screen. The fix is `grid-template-columns: minmax(0, 1fr)`.
- The `raw-token-value` check runs on commit, so `sentinel:full` can pass while a commit with a raw 2px or 8px still fails. Use the tokens.
- Hiding rules placed in a media query before the base rules lose to them. Raise specificity, as `.section-nav .nav-toggle` does.
