# Handoff

Written 2026-10-30. The visual redesign is underway: step 1 of 3 is built and waiting on Tim's review.

## 1. Current task and status

- **Visual redesign** ([visual-redesign-design-brief.md](visual-redesign-design-brief.md)). Decisions are recorded there, including the mockup link. Step 1 (foundation) is committed in `89e1f63`. Steps 2 and 3 aren't started.
- **Premise review items** ([premise-end-to-end-design-brief.md](premise-end-to-end-design-brief.md), "Tim's review"). These get built during steps 2 and 3. The Sheet model and the mode names are still open.

## 2. Files touched in step 1

- `package.json`, `package-lock.json`: added `@fontsource/literata`.
- `server/server.js`: serves the Literata font files.
- `public/css/tokens.css`: Literata font faces, plus tokens for the deep cream panel, rule, paper shadow, controls, writing font and size, and motion.
- `public/css/base.css`: serif h1, quieter header with the project title in serif italic, charcoal buttons with cream labels, serif text areas at 20px, restyled section list and status label.
- `docs/SPEC.md`, `PROJECT_PROFILE.md`: list the Literata dependency.

## 3. Next step

After Tim's OK on step 1, build step 2 in `public/js/app.js` and `base.css`. Use one layout for every depth, with the question card on top looking identical at Seed, Sketch, and Sheet (mode buttons plus Back and Next). The writing surface fills the rest. The section list shows and hides with an animated width (see mockup board 2), and Focus opens with Rise, using the same question card.

## 4. Open questions for Tim

- His review of step 1.
- Fade or Tuck for controls while typing (he leans Fade).
- Text area boundaries: paper on cream is too faint to count as a field edge (WCAG 1.4.11), so the text area keeps a mid-charcoal border for now.

## 5. Tried and failed

- Editing a brief without touching its TODO line trips the gate's `todo-sync` check, including on `--amend`.
- Adding a dependency trips the `spec-gate` check until `docs/SPEC.md` is updated in the same commit.
