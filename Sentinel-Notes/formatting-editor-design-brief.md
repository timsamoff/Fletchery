# Formatting editor: design brief

Raised by Tim 2026-10-30. Direction set 2026-11-02: use an existing lightweight editor library, not a hand-built one. Candidate notes below come from general knowledge and were not re-checked against current releases; anything about size or maintenance is [UNVERIFIED].

## What it has to do

- Keep the entry as plain Markdown on disk, readable in any editor and in Claude Code.
- Never drop or rewrite text it doesn't understand. This is the hard rule.
- A light toolbar and keyboard shortcuts: bold, italic, headings, lists, quotes.
- Keep what the textarea gives now: the writer's font and 28px line, undo, autosave, the paste fix (blank line between pasted paragraphs), the cursor carrying in and out of Focus, and the drag-to-resize height.
- Leave room for margin notes, which need to mark a range of text and highlight it.

## Candidates

| Library | Model | Fit |
|---|---|---|
| CodeMirror 6 | The document is the Markdown string. Markdown is highlighted by decorations, not converted. | Best fit. Nothing can be dropped because there is no conversion. Decorations also give margin notes their highlights. |
| Milkdown or Tiptap (ProseMirror) | WYSIWYG. Markdown is parsed into a schema and written back out. | Looks nicest, but the round trip normalizes or loses text the schema doesn't model. That breaks the hard rule. |
| EasyMDE | A ready-made toolbar over CodeMirror 5. | Quickest, but it sits on the old CodeMirror and is hard to style to our rhythm. |
| Toast UI Editor | Markdown and WYSIWYG tabs. | Heavy, and slower to change. |
| Quill, Lexical, Trix | HTML or JSON documents. | Markdown isn't their native form, so storage would be a conversion layer. |

## Recommendation

CodeMirror 6, with a small toolbar of our own that wraps the selection in Markdown markers. Confidence is moderate to high on the model (text in, same text out), and lower on the effort, which depends on how well it can be made to match the paper look and the 28px rhythm.

Two ways to show the formatting, to be chosen after a prototype:

1. **Marked source.** Markers like `**` stay visible but dim, and the bold text is bold. Simple and honest.
2. **Hybrid.** Markers hide except on the line being edited. Nicer to read, more code to get right.

## Costs and tradeoffs

- **A build step.** CodeMirror 6 is many ES modules. SPEC.md already allows a build step. The safest way for local writers is to commit one prebuilt bundle and serve it the way `yaml` is served, so they never run a build. Tim runs the build for the web edition.
- **Size.** Likely a few hundred KB before compression. [UNVERIFIED]
- **Rewrites in `app.js`.** Code that reads a textarea's value, selection, and caret (autosave, paste, Focus, the character fields) would go through an editor wrapper instead.
- **Resize.** CodeMirror has no native drag handle. We would keep one on its container.
- **Accessibility.** CodeMirror 6 is built for screen readers and keyboards, but this needs testing here before it replaces the textarea.

## Plan

1. Prototype in `scratch/`: one editor with the writer font, the 28px line, and bold and italic through a toolbar.
2. Check that a file with odd Markdown (tables, HTML, footnotes) comes back byte for byte.
3. Decide marked source or hybrid.
4. Replace the textarea in the Premise, then the Characters fields and the Focus sheet.
5. Revisit margin notes: see [margin-notes-design-brief.md](margin-notes-design-brief.md).
