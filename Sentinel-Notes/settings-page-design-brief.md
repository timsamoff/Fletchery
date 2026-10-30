# Settings page: design brief

Proposed 2026-10-30. A Settings page, reached from the header, for choices that apply across the app. More settings get added as they come up.

## Settings so far

- **Font.** The writer's text font (Literata now) and the interface font (Source Sans 3, or Atkinson Hyperlegible, already stored as `font` in `fletchery.json`).
- **Author info.** Fields to be decided.
- **Pasted line breaks.** Paragraph breaks (the current behavior: each line becomes a paragraph) or line breaks (paste as is).
- **Fade while typing.** On or off. Scope: the section list only (the current behavior, chosen 2026-10-30 because the full fade was disruptive) or the full interface (`data-fade-scope="full"` on `<html>`, already styled). Timing: how long a pause brings the page back (2 seconds now).
- **Text zoom** for the writer's text (from the redesign brief), possibly with the formatting editor.

## Decided

- **All settings live on disk, none in browser storage** (2026-10-30), to avoid browser storage being cleared, blocked, or tied to one browser. The preferences now in browser storage move to disk with the Settings page: the question layout (`fl-mode`), whether the section list is folded (`fl-nav`), and the grid overlay (`fl-grid`).

## Open

- **Which file.** Story-level choices (author info, perhaps the writer's font) fit the story's `fletchery.json`. Personal preferences that should follow the writer across stories (fade, paste) need a user-level file, such as `fletchery.json` in the user's config folder, read and written by the local server. The web edition would keep the same file in its own storage.
- **The page's layout and how it opens:** a page of its own, or a panel over the editor.
