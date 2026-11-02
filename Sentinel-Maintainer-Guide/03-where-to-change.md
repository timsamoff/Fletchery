# Where to change things

Organized by what you want to do. Each entry names the file and function, then what else to check. After any change, run the matching checklist in `12-verification-checklists.md`. The commit hooks also require companion changes for some files (`CLAUDE.md`, `README.md`, `docs/SPEC.md`, `Sentinel-Notes/TODO.md`); the hook's message says which.

## Sections and entries

**Change a question, guide line, or Sheet field label.** Edit `sections/prose.json`, `game.json`, and `screenplay.json`. Each story type has its own copy. A Sheet field's label is also its `###` heading in saved files, so renaming a label strands existing text in that field (see `06-invariants.md`).

**Add a Sheet field to Characters.** Add an object to `depths.sheet.fields` under `characters` in all three section files: `id`, `label`, `question`, `kind` (`short`, or `archetype` with `options`; a field with no `kind` is a long box, four rows in a form). Update the field count in `docs/SPEC.md` and the README if it names one. Nothing in `app.js` needs to change.

**Build another section.** There is no general path yet. Single-entry sections work if you set `built: true`, `file`, `descriptionFrom`, and `depths` in each section file (Premise is the model). A many-entry section is tied to Characters in several places; see `08-fragile-zones-and-debt.md`. Follow `INTEGRATION_CHECKLIST.md` part 1, and update `docs/SPEC.md` and `sentinel-gate/readme-map.json`.

**Change what a status does.** `updateEntry` in `public/js/core/entry.js` holds all status rules. `STATUS` in `app.js` holds the shapes and words. `normalizeStatus` maps old values.

**Add or rename an entry frontmatter field.** `FRONTMATTER_FIELDS` and `newFrontmatter` in `entry.js`. Other fields can be written through `updateEntry(raw, { set: { ... } }, template)` with no change to the core.

**Change how layers are saved.** `parseLayers` and `serializeLayers` in `public/js/core/layers.js`. Text the parser does not recognize must still round-trip.

## Characters

**Add a silhouette.** Add an entry to `SILHOUETTES` in `app.js` (built from the shared `HEAD`, `SHOULDERS`, and hair paths). Update the list in `docs/SPEC.md`. Unknown names display as neutral.

**Change card layout or dragging.** `renderListPage` builds the cards. `setupCardReorder` and `flip` handle drag and the Alt-arrow keys, and serve both character cards and image cards. The card styles are under "Characters" in `base.css`.

**Change the portrait crop.** `openCrop`, `placeCrop`, `zoomCrop`, `saveCrop` in `app.js`, and `PORTRAIT_SIZE` in `media.js`. The crop is stored as `portrait: { image, x, y, size }` and also rendered into `portrait.jpg`; change both together.

**Change image details.** The dialog is built in `showEditor` and wired in `setupImageDialog`. Sidecar format lives in `media.js`.

## Server and API

**Add an API route.** Add a branch in `handle` in `server/server.js`, a method in `public/js/core/store.js`, and a row in the API table in `DESIGN.md`. Restart a running Fletchery afterward; the page warns the writer if it calls a route the server lacks (`#call` in `store.js`). The `claude-md-gate` in the quality gate fires on a new route string, so `CLAUDE.md` changes in the same commit.

**Change what the server accepts.** Image types: `IMAGE_TYPES` (SVG is excluded on purpose). Size: `MAX_IMAGE_BYTES`. File name rules: `safeName`. Request body limit: 5,000,000 characters in `readBody`.

**Change the path guard or host checks.** `Bible.resolve` and the top of `handle`. Keep both strict; see `06-invariants.md`.

## Settings and chrome

**Add a writer's setting.** Add a default to `DEFAULTS` in `public/js/settings.js`, a control in `formHtml`, and the effect in `applyPrefs` in `app.js`. Settings merge over defaults, so older files keep working.

**Add a bible-record field.** Write it through `updateBibleRecord(change)` in `app.js`. Add a note to `docs/SPEC.md`. The record is `fletchery.json`; do not put preferences there.

**Change colors, type, spacing.** `public/css/tokens.css`. Do not write color literals or raw values that have a token in `base.css`; the gate blocks them. Rules are in `CLAUDE.md` under "Design rules".

**Change motion.** Scripted animation goes through `animate` in `app.js`, which honors reduced motion. CSS transitions need their own `prefers-reduced-motion` handling.

**Change the launch behavior.** `bin/fletchery.js`: flags, port search (50 tries from the start port, in `listenOnFreePort`), browser opening. A new flag also needs a README mention (the gate's `readme-map.json`).

## Documentation

Which file gets which kind of fact is set in `CLAUDE.md` under "Documentation routing". Short version: unresolved items go to `Sentinel-Notes/TODO.md`, settled conventions to `CLAUDE.md`, architectural decisions to `docs/SPEC.md`, structure changes to `DESIGN.md`, anything a user needs to the README. Then update this guide.
