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

- **Which file** (2026-10-30): `story-bible/fletchery-settings.json`, separate from `fletchery.json`, which keeps the app's own record of the bible (story type, title, skips). Each story keeps its own settings, so preferences don't carry across stories; revisit if that becomes a nuisance.
- **The AI button** reads "Ask AI" until an AI is chosen in Settings, then names that AI (for example, "Ask Claude"). Built 2026-10-30 as a disabled "Ask AI" with a note pointing to Settings.

## Open

- **AI choices in Settings:** the Claude Code bridge, an Anthropic API key, or OpenRouter (see SPEC.md and the web edition brief), and what the button calls each.
- **The page's layout and how it opens:** a page of its own, or a panel over the editor.
