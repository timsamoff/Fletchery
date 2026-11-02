# Recipes

Each recipe ends with the checks to run. Test against a copy of a bible in `scratch/`, never the writer's real story (see `11-build-run-test.md`).

## Add a Sheet field to Characters

1. In `sections/prose.json`, `game.json`, and `screenplay.json`, add an object to `depths.sheet.fields` under the `characters` section: `id`, `label`, `question`, and `kind` if it is a short box or the archetype chips.
2. Keep the label unique within the Sheet. Saved files use it as the `###` heading.
3. Reload the page. No server restart is needed for section files.
4. Check: open a character, go to the Sheet, type in the new field, reload, and confirm the text came back. Open the file and confirm a `### <label>` part.
5. Update the field counts in `docs/SPEC.md` and `README.md` if they name one, then `Sentinel-Notes/TODO.md` if an item covered it.

## Add a silhouette

1. Add a key to `SILHOUETTES` in `app.js` with a `label` and an SVG path built so the style shows in the outline.
2. Add the key to the list in `docs/SPEC.md`, under Characters.
3. Check: open the portrait menu on a character and pick it. Confirm `silhouette: <key>` in the file, on the card, and in the header.

## Add an API route

1. Add a branch in `handle` (`server/server.js`) and, if it writes, call `watcher.expect` before the write and `watcher.start()` after.
2. Use `requireVersion` if the route changes an existing file.
3. Add a method to `LocalServerStore` in `store.js`.
4. Add a row to the API table in `DESIGN.md`, and a line about it in `CLAUDE.md` if it changes a convention.
5. Restart `fletchery`.
6. Check: call it from the page, and confirm a stale `baseVersion` gets a 409 where one applies.

## Add a writer's setting

1. Add the default to `DEFAULTS` in `settings.js`.
2. Add a control to `formHtml` and wire it through `prefs.update`.
3. Apply it in `applyPrefs` (`app.js`).
4. Check: change it, wait for "Settings saved.", reload, and confirm it held. Edit `fletchery-settings.json` by hand while the page is open and confirm the page follows.

## Add a built single-entry section

1. In each section file, give the section `built: true`, `file`, `descriptionFrom`, `why`, and `depths` with `questions` for each depth. Premise is the model.
2. Follow `INTEGRATION_CHECKLIST.md` part 1.
3. Update `docs/SPEC.md` (section lists) and `sentinel-gate/readme-map.json`, and the README's list of built sections.
4. Check: the sidebar links it, the page loads, an entry saves to `<file>`, the status shows, and Skip for now works.

A many-entry section is not a recipe yet. See `08-fragile-zones-and-debt.md`.

## Rename a character from outside the app

1. Rename the folder and the `.md` file inside it to the same new slug.
2. Edit `title` in the frontmatter.
3. Edit `order.characters` in `fletchery.json` if the character was ordered.
4. The cards and sidebar refresh on the watcher event.

## Handle a bible made before a format change

Add a read path rather than a migration, so old files keep loading (see `normalizeStatus` and `readSettingsFile`). Test with a copy of a real older bible.
