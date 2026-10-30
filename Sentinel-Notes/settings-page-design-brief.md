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

## Built (2026-10-30)

- A panel that slides in from the right, opened from "Settings" in the header. Changes apply at once and save 300 ms later; an outside edit to the file shows in the open app.
- Your writing: font (Literata or the interface font) and pasting (each line a paragraph, or keep line breaks).
- Interface: Source Sans 3 or Atkinson Hyperlegible.
- Fade while typing: on or off, what fades (the section list or everything but the writing), and the pause before it returns (1, 2, 3, or 5 seconds).
- The question layout, folded section list, and grid overlay moved from browser storage into the file. Existing browser values are read once as starting values.

- An AI section shown as a dimmed preview: None, Claude Code on this computer, Anthropic API, or OpenRouter, plus an API key field. Nothing in it works or saves yet.
- Focus outlines are 1px everywhere (WCAG AA asks only that focus be visible). A thicker-outline switch can be added if wanted.

- **API keys** (Tim, 2026-10-30): stored on the writer's computer in `fletchery-api.json`, in the standard per-user config folder, never in a story folder. Story folders get synced, shared, uploaded, or committed; some are git repos and many aren't (a web edition saving to the computer or Google Docs, for example), so nothing should assume a repo. Windows: `%APPDATA%\Fletchery\`. macOS: `~/Library/Application Support/Fletchery/`. Linux: `$XDG_CONFIG_HOME/fletchery/`, falling back to `~/.config/fletchery/`. On macOS and Linux the folder is created with mode 700 and the file with 600; on Windows the user's AppData is already private to them. Only the local server reads or writes it; the page sees a masked key (the last four characters). Built with the AI section.
- **Text zoom** waits for the formatting editor.

- **Author** (Tim, 2026-10-30; built): Author and Co-authors, at the top of Settings, saved in the settings file. Research: working story bibles rarely carry author fields beyond a name; TV series bibles add a "created by" credit and contact details, but for pitching; Scrivener keeps one author name per project, often a pen name. Shown under the entry as "Written by" (the credited names, "you" when none are set, or "AI draft" and "AI draft, reviewed by…" from the frontmatter `author`, which records who wrote the text and stays unchanged). Also meant for `BIBLE.md` and any export.

## Open

- Nothing beyond the AI section and the items above that wait on other work.

- **AI choices in Settings:** the Claude Code bridge, an Anthropic API key, or OpenRouter (see SPEC.md and the web edition brief), and what the button calls each.
- **The page's layout and how it opens:** a page of its own, or a panel over the editor.
