# Characters: design brief

Proposed 2026-10-30. Build phase 4 of the approved plan: Characters with images, the media library, relationships, and generated indexes. This is a plan for Tim's review; nothing is built.

## What's already settled

- **One folder per character,** created with the entry so relative links stay stable. Images live beside the entry, each with a sidecar `<file>.meta.md` (caption, alt text, "what to notice", tags, links, map flag).
- **Depths** (SPEC decision 3): Seed is the one-sentence storyline, Sketch the one-paragraph storyline, and Sheet the full field list, stored as `###` parts.
- **Sheet fields (prose):**
  - name (full, nicknames, who uses each), role in the story, demographics, physical traits;
  - personality (strengths, flaws, fears, contradictions), motivation (the abstract want), goal (the concrete want), conflict (what blocks the goal), epiphany or arc;
  - backstory and secrets, voice and speech patterns, relationships (links), appearances.
  - Screenplay adds the introduction line as written in the script and casting notes. Game adds playable or NPC, gameplay role, and bark or callout style.
- **Media library:** a gallery of every image and PDF in the bible, wherever it's stored. "Move to library" and "Move to entry" rewrite every link and report any they couldn't.
- **Indexes:** generated `index.md` files, also available as `fletchery index` for when Claude Code changes files with the app closed.

## Proposed split

The phase is too big to review in one go, so it splits into five steps. Each one stops for Tim's review.

1. **Character entries.** The first section with many entries:
   - a Characters page listing every character, with "Add a character";
   - the familiar editor for each character (depth steps, question panel, paper, Focus);
   - section-to-section navigation, so "Go to Characters" works;
   - addresses for each page (`#/characters/mara-quill`), so the browser's back button and reloads keep your place.
2. **Images.** An image zone on each character: drag and drop, paste, and a keyboard file picker. Sidecars with caption, alt text, and "what to notice".
3. **Media library.** The gallery, picking existing images into an entry, and Move to library or Move to entry with link rewriting.
4. **Relationships.** Entries that link two characters: how they're connected, the core dynamic, tension, key moments, and how it changes. They appear on both characters' pages.
5. **Indexes.** Generated `characters/index.md` (and the others as sections arrive), and the `fletchery index` command.

## Questions for Tim

1. **The Characters page.** Options:
   - cards on the page (name, the Seed line, the status shape), like index cards on a desk; or
   - a list of names under Characters in the sidebar.

   Cards suit the layout views planned later. The sidebar list makes switching between characters quick. Both can coexist.
2. **File names.** `characters/mara-quill/mara-quill.md` (the file says what it is anywhere it travels) or `characters/mara-quill/character.md` (shorter, the same name in every folder).
3. **Renaming.** Proposed: renaming a character changes the name shown everywhere but keeps the folder and file, so links and images never break. The name lives in the entry's frontmatter `title`.
4. **The Sheet fields.** Is the list above right? "Conflict (what blocks the goal)" may want the same treatment as the Premise questions: "What stands in the way?" fits more stories.
5. **Field questions.** Each Sheet field gets its own question, like the Premise. I'd draft them for Tim's edits, in the "change, not disaster" spirit.
6. **No empty-field anxiety.** Fourteen fields is a lot. The guided-interview brief says not to demand decisions before the story needs them. Proposed: the Sheet shows its questions one at a time as usual, empty parts aren't counted or flagged anywhere, and a character page never shows "7 of 14."
