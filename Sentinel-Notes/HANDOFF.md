# Handoff

Written 2026-10-31. Characters step 2 (portrait and images) is built and waiting on Tim's review.

## 1. Current task and status

**Characters, step 2 of 5** ([characters-design-brief.md](characters-design-brief.md)) is built, browser-tested against a copy of EOL, and committed in `fdddb5c` (not pushed). It covers:
- the portrait menu: the photo, ten silhouettes, Upload a photo, and Choose the part to use;
- the crop view, which saves `portrait: { image, x, y, size }` and a 512px `portrait.jpg`;
- the Images tab after Sheet: drop, paste, or pick; thumbnails; a details dialog with sidecar fields, Use as portrait, and a two-click Remove;
- photo portraits on the cards.

Tim has to restart `fletchery` to get the new server routes.

## 2. Files touched

- `server/server.js`: `POST /api/upload`, `GET /api/media`, `DELETE /api/media`, and `safeName`. `server/bible.js`: `writeAtomic` takes a Buffer.
- `public/js/core/media.js` (new): sidecar parse and update; `PORTRAIT_FILE`, `isImage`.
- `public/js/core/store.js`: `upload`, `deleteMedia`, `mediaUrl`; raw Blob bodies.
- `public/js/app.js`: `setView`, `renderImages`, `setupImagesHome`, `uploadImages`, `onImagePaste`, the image dialog, the crop functions, `renderPortraitMenu`; card photos.
- `public/css/base.css`: images, dialogs, crop stage, and menu photo column.
- Docs: SPEC, DESIGN, README, CLAUDE.md, the brief, and TODO.

## 3. Next step

Get Tim's review of step 2 and OK to push. Then step 3, the media library: a gallery of every image in the bible, picking existing images into an entry, and Move to library or Move to entry with link rewriting.

## 4. Open questions for Tim

- Cards crop the square portrait into a wide strip, so some of the top or bottom is lost. Should cards show the whole circle instead?
- Whether a dragged writing-box height should be kept in Settings.
- The AI section going live, and the formatting editor.

## 5. Tried and failed

- Long Python patches in a Bash heredoc can break on quoting. Write the script to `scratch/` and run it.
- After changing JS, reload the page, or Playwright gets the cached copy.
- A silhouette style has to show in the outline.
- Test against a copy of Tim's bible in `scratch/` on `--port 3100 --no-open`, never his real story.
