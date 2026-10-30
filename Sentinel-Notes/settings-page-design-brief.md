# Settings page: design brief

Proposed 2026-10-30. A Settings page, reached from the header, for choices that apply across the app. More settings get added as they come up.

## Settings so far

- **Font.** The writer's text font (Literata now) and the interface font (Source Sans 3, or Atkinson Hyperlegible, already stored as `font` in `fletchery.json`).
- **Author info.** Fields to be decided.
- **Pasted line breaks.** Paragraph breaks (the current behavior: each line becomes a paragraph) or line breaks (paste as is).
- **Fade while typing.** On or off. Scope: the section list only (the current behavior, chosen 2026-10-30 because the full fade was disruptive) or the full interface (`data-fade-scope="full"` on `<html>`, already styled). Timing: how long a pause brings the page back (2 seconds now).
- **Text zoom** for the writer's text (from the redesign brief), possibly with the formatting editor.

## Open

- **Where each setting lives.** `fletchery.json` belongs to the story project and is shared by anyone who opens it, so story-level choices fit there. Personal preferences, such as fade and paste, may belong to the writer instead (browser storage, or a user-level file for the local edition). Author info could be either.
- **The page's layout and how it opens:** a page of its own, or a panel over the editor.
