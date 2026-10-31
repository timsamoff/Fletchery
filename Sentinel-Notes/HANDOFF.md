# Handoff

Written 2026-10-31. Characters step 2 (portrait and images) is partway built.

## 1. Current task and status

**Characters, step 2 of 5** ([characters-design-brief.md](characters-design-brief.md)). Decided with Tim on 2026-10-31:
- The portrait gets a pencil badge and a menu. The menu holds the silhouettes, Upload a photo, and Choose the part to use.
- A crop is saved both ways: crop numbers in the frontmatter, plus a small `portrait.jpg` copy.
- Other images go in a fourth tab, Images, after Sheet, each with a `.meta.md` sidecar.

Built and committed in `8ab6f47` (not pushed): the badge, and a menu of ten silhouettes that Tim approved. It's waiting on his review in the app.

## 2. Files touched

- `public/js/app.js`: the `SILHOUETTES` table with screen-reader labels, `silhouetteSvg`, and `setupPortraitMenu` (a popover with arrow keys; it closes on scroll). `cycleSilhouette` is gone.
- `public/css/base.css`: `.portrait-face`, `.portrait-badge`, `.portrait-menu` (fades in with `@starting-style`), `.silhouette-grid`.
- `docs/SPEC.md`: the silhouette values. The brief and TODO are updated.

## 3. Next step

1. Build a server route for binary uploads into a character's folder: JPEG, PNG, WebP, GIF, never overwriting (add `-2` and so on).
2. Add Upload a photo and Choose the part to use to the portrait menu. The crop view is a circle over the image (drag to move, slider or wheel to zoom). It saves `portrait` plus crop numbers in the frontmatter and a 512px `portrait.jpg`. Cards and the header show it in place of the silhouette.
3. Add the Images tab: drag and drop, paste, and a file picker. Each image opens details (caption, alt text, what to notice) saved in a sidecar, plus Use as portrait and Remove.

## 4. Open questions for Tim

- Whether a dragged writing-box height should be kept in Settings.
- The AI section going live, which needs the server-side key file.
- The formatting editor (a light toolbar or full formatting).

## 5. Tried and failed

- A silhouette style has to show in the outline. Hair inside the head's edge, such as a side part, disappears.
- `popovertarget` doesn't set an `aria-expanded` attribute, so style the open state with `:has(+ .portrait-menu:popover-open)`.
- A Fletchery server doesn't pick up new server routes while it's running. Restart it after server changes.
- Test against a copy of Tim's bible in `scratch/` on another port (`--port 3100 --no-open`), never his real story.
