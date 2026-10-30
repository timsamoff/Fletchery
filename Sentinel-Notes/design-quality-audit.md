# Design and code quality audit

Sentinel `01-design-quality-audit.md` 1.6.1, run 2026-10-29 against commit `8597841` (skeleton).

**Domain:** full visual GUI (web). **Surfaces:** one, the local web app (`bin/`, `server/`, `public/`), with one token system (`public/css/tokens.css`). The planned skills surface doesn't exist yet.

Each finding has an ID, a location, and a disposition: a TODO line, a decision not to act (with the reason), or a cross-reference. "Clear" means a clear improvement. "Judgment" means a stylistic call, with the tradeoff stated.

## Part 0: conventions and design document

Conventions read: `tokens.css`, `CLAUDE.md`, `docs/SPEC.md` (the design document). The implementation matches SPEC.md on stack, launch, port, browser opening, security, saving and conflicts, colors, and fonts. Two drifts:

- **D1 (clear, high).** SPEC.md says every vertical size sits on the 4px baseline. Buttons are 42px tall (`base.css`, `.button` padding 5px). The code is wrong, not the spec. → TODO `R1`.
- **D2 (clear, high).** The plan says new entries get all seven frontmatter fields. That holds at setup, but not when `PUT /api/entry` recreates a deleted file. → see `Q1`.

No design document needs to be created: SPEC.md serves.

## Part 1: code quality

- **Q1 (clear, high).** `server/server.js` `putEntry`: when the file doesn't exist, the frontmatter is `{ title }` plus `updated` and `status`. `type`, `depth`, `author`, and `description` are missing, so a premise deleted on disk and retyped in the browser comes back incomplete. The same function also parses the current file twice. → TODO.
- **Q2 (clear, high).** A hand-broken `fletcherling.json` makes `bible.readJson` throw, and the server returns a generic 500. `public/js/app.js` `start()` doesn't check `ok`, so it shows the setup form for a project that's already set up, and submitting gets a 409. Frontmatter errors already get a clear 422; settings errors should too. → TODO.
- **Q3 (clear, medium).** `app.js`: the "saved" state update (`baseHash`, `savedBody`, `frontmatter`, `renderMeta`) is written twice, in `save()` and in `resolveConflict('overwrite')`. One shared helper keeps them from drifting. → TODO.
- **Q4 (judgment, low).** The default premise frontmatter is built inline in `setup()`. Phase 2 moves entry templates into `sections/*.json`, which replaces this code. → decision: no separate action, Phase 2 covers it.
- **Q5 (judgment, low).** `server/watch.js`: if `story-bible/` is deleted while the app runs, the watcher logs an error and never restarts. Rare, but the result is silent loss of live sync. → TODO.
- **Q6 (clear, low).** `.visually-hidden` uses the deprecated `clip: rect()`, and nothing uses the class yet. → TODO.
- Checked and clean: no dead code beyond Q6, no temporary or quick-fix comments, no deprecated Node or browser APIs otherwise, complexity proportionate.

## Part 2: single source of truth

- **S1 (clear, medium).** Raw values in `base.css` that duplicate tokens: `28px` five times (`--line`), `4px` four times (`--space-1`), `8px` once (`--space-2`), and a `2px` underline (`--border`). → TODO.
- **S2 (clear, low).** `82px` header and footer heights repeated with no token. → TODO (with S1).
- **S3 (judgment, low).** Two rules use palette tokens directly instead of roles: `.choice input` uses `--color-charcoal`, and `.button:hover` uses `--color-spine`. Harmless today, but it bypasses the role layer meant for later palette changes. → TODO.
- **S4 (clear, low).** The monospace stack is hardcoded in `base.css`. → TODO (add `--font-mono`).
- **S5 (judgment, low).** Unused tokens: `--unit`, `--baseline`, `--space-6`, `--color-border-quiet`. `--unit` and `--baseline` document the system even unused. → TODO (use or remove each).
- Markup duplication: none. The icon has one source (`/icon.svg`), and radio choices come from one function.

## Part 3: color

- **C1 (clear, medium).** Hardcoded `rgb(42 45 50 / 0.05)` in the grid overlay (`base.css`). → TODO.
- **C2 (judgment, low).** `--color-grid` repeats the orange as an `rgb()` literal. `color-mix()` could derive it from `--color-orange`. → TODO (with C1).
- Authority: one context (no themes), no overrides. Clean.
- Palette (judgment, high confidence): deliberate and small, four icon colors and two creams with clear roles. There's no separate error color, by your decision. Errors use text plus an orange bar, so they don't depend on color. No action.

## Part 4: spacing, grid, rhythm

- **R1 (clear, high).** Buttons are 42px, off the 4px baseline (D1). → TODO.
- **R2 (judgment, medium).** The setup form leaves the 28px lines: radio rows are 36px and 64px. It stays on the 4px baseline. Decide whether forms must take whole lines. → TODO.
- **R3 (judgment, medium).** The conflict panel spans the full container while the text area stops at 68ch, so their right edges don't line up. → TODO.
- **R4 (judgment, medium).** Save status lives only in the footer. On a tall page it's off screen while you type. The live region still announces it to screen readers. → TODO, for the Phase 2 layout.
- Checked and clean: a defined spacing scale, a defined type scale (32/24/20/18/16), measured vertical rhythm on the editor page (every block on a 28px line), single-column alignment, clear hierarchy.

## Part 5: responsive

- **B1 (judgment, low).** The `720px` breakpoint appears twice, because CSS custom properties can't be used in media queries. → decision: keep, noted in CLAUDE.md.
- **B2 (judgment, low).** At 375px the footer's project path wraps to four lines and dominates the footer. → TODO.
- Widths of 320px and ultra-wide haven't been tested. → decision: covered by the Phase 7 accessibility and responsiveness pass.
- Checked and clean: no rigid fixed widths (1120px is a max), touch targets of 24px or more (42px buttons, radios with clickable labels), no hover-only interaction.

## Part 6: semantics and accessibility

- **A1 (clear, high).** No automated accessibility checks (axe or similar). → TODO, and a quality-gate candidate.
- **A2 (clear, medium).** No `:disabled` or `:active` styles. The text area is disabled on a read error, and Phase 2 adds a disabled Ask Claude control. → TODO.
- Checked and clean: semantic elements (real buttons, fieldset and legend, labels, landmarks, `dl`), heading order, alt text (decorative header icon with `alt=""` next to the wordmark), form labels, contrast (computed, see CLAUDE.md), no meaning carried by color alone (the pressed toggle uses a bar and `aria-pressed`), visible focus and logical tab order, the skip link, `prefers-reduced-motion`. Q6 is cross-referenced.

## Part 7: "looks AI-generated"

Reviewed as a skeptical designer. Confidence that tells are present: low.

- Gradients: none. Shadows and glass: one inset bar marks the pressed toggle, which is functional. Default fonts: no (Source Sans 3, chosen). Mixed icons: no (one icon). Rounded corners: 4px, restrained. Emoji: none. Generic centered layout: no (left-aligned single column). Framework-default palette: no (taken from the icon). Decorative motion: none.
- Prose: UI copy is plain and specific ("Nothing has been overwritten. Choose which version to keep."). No "not just X" constructions, hedging, or filler words. `docs/SPEC.md` follows your style guide. Clean.
- Creative media: skipped by your choice. The only asset is your icon.

## Part 8: additional checks

- Icon consistency: one icon. Clean.
- Component states: A2 is cross-referenced. Hover and focus exist on every interactive element.
- Animation: none. Clean.
- Dark mode: not present and not specified (the brief asks for light). → decision: no action.
- **P1 (judgment, low).** `assets/fletcherling-icon.svg` carries editor comments, about 200 bytes. → decision not to act: you said never to modify the icon.
- Fonts: latin woff2 subsets, with only the 400 weight preloaded. Clean. No raster images.

## Part 9: comment cleanup

Run by your choice, in terse style. 9 comments rewritten, none removed:

- `public/css/base.css`, 7: rhythm arithmetic replaced with short pointers. The arithmetic moved to CLAUDE.md, under Rhythm.
- `public/css/tokens.css`, 1: the header cut to one sentence. The contrast table moved to CLAUDE.md.
- `public/js/app.js`, 1: the stale "skeleton" header rewritten.

Functional directives were kept: the shebang in `bin/fletcherling.js`. The project has no tests or lint to rerun.

## Part 10: documentation currency

- **CLAUDE.md:** accurate, but it lacked working conventions. Fixed in Part 11.
- **Doc1 (clear, medium).** CLAUDE.md points to the approved plan in `~/.claude/plans/` and the brief in untracked `first-prompt/`. You sometimes work remotely, and a remote session can see neither. → TODO.
- **README:** accurate, but two lines with no install or launch steps. → covered by the README phase TODO.

## Quality-gate candidates

- No color literals outside `public/css/tokens.css`.
- No raw `28px` or `4px` in `base.css` where `--line` or `--space-1` exists.
- Automated axe checks on the setup and editor pages through Playwright.
- Every entry the server writes has all seven frontmatter fields.
- `Sentinel-Notes/TODO.md` entries stay one line each.
