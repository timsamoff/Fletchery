# Margin notes: design brief

Raised by Tim 2026-10-30. Not yet designed.

## The idea

The writer selects a word or phrase in their text and adds a note to it, the way the YouVersion Bible app does: select, right-click (or long-press), choose to add a note. The phrase takes a highlight color. Clicking the highlight opens a small popover with the editable note. Deleting the note removes the highlight.

## Questions to settle

- **The editor.** A plain text area can't show highlights. This waits on the formatting editor, which would render the writer's text and could mark the noted phrases.
- **Storage in Markdown.** Notes have to survive outside Fletchery and stay readable in any editor. Options: Markdown footnotes (`phrase[^1]` with the note at the end of the layer), an HTML comment beside the phrase, or a sidecar file keyed to the text. Footnotes read naturally in any editor and in Claude Code, but they add markers to the writer's prose.
- **Edits around a note.** What happens to a note when its phrase is edited or deleted.
- **Touch and keyboard.** Long-press on touch screens, and a keyboard command for adding a note to the selection.
- **Color.** The highlight has to be readable on the paper and distinct from the orange used for focus and links.
- **AI.** Whether Ask AI can read the notes as context. Notes are the writer's own, so they're never AI-generated.
