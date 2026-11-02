# Verification checklists

Manual steps, run against a copy of a bible (see `11-build-run-test.md`). They stand in for the missing tests.

## First run

- [ ] In a folder with no `story-bible/`, the setup form appears. Submitting without a type, title, or scope shows a message and focuses the field.
- [ ] Submitting creates `story-bible/fletchery.json` with the chosen values and opens Premise.
- [ ] Opening a bible that has only `fletcherling.json` renames it to `fletchery.json` and says so.

## Editing and saving

- [ ] Typing in Seed saves about half a second after you stop. The footer says "Saved at <time>".
- [ ] The file has all seven frontmatter fields. `depth` is the deepest layer with text.
- [ ] Clearing all text sets `status: empty`. Typing sets `draft`.
- [ ] Mark as canon sets `status: canon`. Editing the text afterward drops it to draft and the status line says so.
- [ ] The Sheet of Premise is one box. The Sheet of a character is a form of fields, each saved as a `###` part.
- [ ] A body with no layer headings (edit the file by hand) loads as the Seed, and saving keeps all of the text.
- [ ] Unknown `##` sections and text before the first heading survive a save.
- [ ] Skip for now marks the section skipped in the sidebar. Typing in it clears the skip.

## Live updates and conflicts

- [ ] With nothing unsaved, edit the open file in a text editor. The page updates and says so.
- [ ] With unsaved typing, edit the same file outside. The conflict panel shows both versions and nothing is overwritten.
- [ ] Each conflict choice works: use the disk version, keep mine (asks to confirm), and copy mine then use the disk version.
- [ ] Delete the open file outside the app. The page says it was deleted, and typing creates it again.
- [ ] Our own saves never appear as outside changes.

## Characters

- [ ] Add a character from the cards page. A folder `characters/<slug>/` and `<slug>.md` appear.
- [ ] Two characters with the same name get `-2` on the second.
- [ ] Rename moves the folder and the file together, keeps the card's place, and updates `title`.
- [ ] Drag a card to a new place, or use Alt with an arrow key. `order.characters` changes and the sidebar follows.
- [ ] Add a character folder outside the app. It appears on the cards.
- [ ] The archetype chips add and remove names in the plain text field.

## Portraits and images

- [ ] The portrait menu lists the ten silhouettes. Choosing one sets `silhouette` and shows on the header and the card.
- [ ] Upload a photo from the portrait menu, crop it, and save. `portrait` appears in the frontmatter and `portrait.jpg` appears in the folder.
- [ ] Choosing a silhouette afterward removes `portrait` and `portrait.jpg` and keeps the source image.
- [ ] Drop, paste, and pick a file on the Images tab. A repeated name gets `-2`. A non-image or a file over 25 MB shows an error in place.
- [ ] Open an image, set a caption, alt text, and notes. A `.meta.md` appears with the same text. Reopen and confirm the values.
- [ ] Duplicate creates a copy and a sidecar copy right after the original. Remove asks for a second click before deleting.
- [ ] Drag image cards to reorder. `images` in the frontmatter changes.

## Layout and settings

- [ ] "One at a time" and "All questions" both work, and the choice is remembered in `fletchery-settings.json`.
- [ ] Focus opens the questions in a sheet and returns them with the text and cursor intact.
- [ ] Settings changes apply at once, save, and survive a reload. Editing `fletchery-settings.json` outside updates the page.
- [ ] With "reduce motion" on in the operating system, no scripted animation runs.
- [ ] Tab through the page. Every control is reachable and the focus ring shows. Status is never color alone.
- [ ] Show grid: new blocks sit on the 4px lines, and body blocks on whole 28px lines.

## Server

- [ ] A request with a wrong `Host` gets 403. A write with another site's `Origin` gets 403.
- [ ] A path like `../x` is refused.
- [ ] A stale `baseVersion` on a write returns 409 with the stored file.
- [ ] After adding a route, the page shows the restart message until the server is restarted.
