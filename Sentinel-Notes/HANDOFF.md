# Handoff

Updated 2026-11-16. A new look is applied in the working tree for Tim to see. It is not committed, and the docs don't describe it yet.

## 1. Current task and status

Tim chose a rose-gray palette of his own (paper `#F0EAED`, surface `#FAF7F9`, panel `#E5D9DF`, ink `#29262C`, ink-mid `#57505C`, accent raspberry `#A04459`, accent-2 plum `#79516C`, mark gold `#C5A13B`) and asked for all six flourishes, to subtract from later. He declined a per-story binding color and will make a new icon himself, which he wants bigger. All of that is built and checked with Playwright. Tim hasn't seen it in the app yet.

## 2. Files touched (uncommitted)

- `public/css/tokens.css`: the palette tokens renamed and recolored, new roles `--color-accent-2`, `--color-mark`, `--color-press`, and `--endpaper`.
- `public/css/base.css`: filled buttons use the accent with a light label and quiet buttons an ink border; gilt double rules under the header and section heads; a ribbon bookmark on the current sidebar item; numeral column in the sidebar; character cards with a spine and a hover tilt; an ornament after each page and before each empty note; endpaper and a card for the setup screen; the header icon at 64px.
- `public/js/app.js`: `setup-view` on the body and a `.setup-card` wrapper in `showSetup`; `roman` and the numerals in `renderNav`.
- `public/index.html`: icon width and height 64.
- `scratch/palette-preview.html`, `scratch/look-patch.cjs` (gitignored).

**Revisions the same day, also uncommitted:** header and footer in raspberry with light text; a gold rule above the footer; a single gold line under page headings; the Settings bar level with the header, with the double gold rule; numerals removed; the ribbon kept inside its row; Show grid removed from the footer (the overlay still works through `layout.grid` in the settings file); notifications as a raspberry toast (`showToast`, a `popover` so it sits above dialogs), with the routine save states kept beside the editor through `setSaveState`; Atkinson Hyperlegible Next as the default interface font (new dependency `@fontsource/atkinson-hyperlegible-next`, old Atkinson package removed, bold drawn at 500 through the `@font-face` weight range), Source Sans 3 second. `server/server.js` changed (`FONT_DIRS`), so Tim must restart. The commit needs `docs/SPEC.md` staged for the dependency change. Open: Tim asked about a pale gold for the sidebar and Settings panel; `#F2EAD3` was offered.

**Later the same day, also uncommitted:** Tim changed his mind on the paper. The page is now pale gold (`--color-parchment` `#F3ECD8`) and the writing surface and cards gold-white (`--color-parchment-light` `#FBF8EC`), with raspberry kept for underlines, buttons, spines, the header, and the footer. The panel color (sidebar, portraits, question panel) is his muted plum-gray `#DCD1D7` (`--color-mauve`), with `--color-mauve-shade` `#CEC1C8`. Contrast on the gold page: ink 12.64, ink-mid 6.58, raspberry 5.14, plum 5.55, gold 2.09. On the mauve panel: ink 10.05, ink-mid 5.22, raspberry 4.08 (no small raspberry text there). The sidebar's character rows no longer have an accent bar behind the ribbon, which was filling its notch. The pale-gold-sidebar question is settled by this: gold is the page, mauve is the sidebar.

## 3. Next step

Tim looks at it on his story (a page reload is enough; no server change) and says what to subtract. Then, in the same commit as the look: rewrite the color rules in `CLAUDE.md` ("Design rules": no longer icon colors on cream, and the accent can now carry small text) and in `docs/SPEC.md` ("Colors"), update the maintainer guide where it names tokens or colors, and add the changelog entry. Contrast on paper: ink 12.57, ink-mid 6.54, raspberry 5.11 (4.42 on panel, so no small raspberry text on the panel), plum 5.52, gold 2.07 (lines and marks only). Light label on raspberry 5.69.

## 4. Open questions for Tim

- Which flourishes stay.
- Sentinel 1.8.0: update now, not now, or skip.
- Delete a character: a real delete or a trash folder?

## 5. Tried and failed

- Backslashes and quotes in a Bash heredoc get mangled. Write patch scripts with the Write tool into `scratch/`, then run them.
- Several source files have CRLF line endings. Use the Edit tool, or normalize line endings in the script (see `scratch/look-patch.cjs`).
- The gate's raw-token rule flags `4px`, `8px`, `28px`, `64px` and other token values in `base.css`. Use the token.
- The wide-screen sidebar padding rule is `.section-nav .nav-list a`, so sidebar overrides need that much specificity.
- Playwright can't open `file:` pages. Serve the folder with `python -m http.server` and wait a moment before loading.
- After any server change, tell Tim to restart Fletchery first. A status-line message is invisible behind a modal dialog.
- Tim tests on his real EOL bible on port 3000. Never send it a request that changes anything.
