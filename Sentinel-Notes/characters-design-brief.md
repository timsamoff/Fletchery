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

## Tim's answers (2026-10-30)

- **Characters page:** cards, with the character's photo cropped at the top if one exists, and a generic silhouette if not. The sidebar list is wanted too, as long as it can collapse so a large cast doesn't make it endless. Proposed: Characters in the sidebar opens and closes like a folder, closed by default, with the open state saved in Settings. Silhouettes: male, female, and neutral, picked on the card (neutral by default, since the gender field is free text and shouldn't be guessed from).
- **File names:** `characters/mara-quill/mara-quill.md`.
- **Renaming:** Tim's concern is writers who work in the folder directly. Proposed:
  - "Rename" in the app changes the name, the folder, and the file together, and rewrites every link in the bible to match, using the same link rewriting as Move to library. It reports any link it couldn't update.
  - Renaming outside the app breaks links, and the app can't see what moved. The audit (with or without AI) flags broken links and offers to repoint them, matching by the entry's `title`.
- **"Conflict":** becomes "What stands in their way?"
- **Sheet fields:** based on Tim's list, the original brief's list, and current craft practice (want and need, the wound or ghost, the lie the character believes). Proposed below.

## Proposed Sheet fields (prose)

Short facts take one line; the rest take paragraphs. Every field is optional, and empty ones are never counted or flagged.

1. **Name:** full name, nicknames, and who uses each. (One line, plus a short list.)
2. **Type:** what kind of being and where they belong: species or race, class, and the setting's flavor (contemporary, historical, fantasy, mythic). (One line.)
3. **Archetype:** pick one or more, or add your own. The list offers the twelve popular archetypes (Innocent, Everyman, Hero, Caregiver, Explorer, Rebel, Lover, Creator, Jester, Sage, Magician, Ruler), which come from Carol Pearson's adaptation of Jung, plus Jung's own figures (Shadow, Trickster, Wise Old Man, Great Mother, Child). Stored as plain text in the file, for example `Sage, Trickster`.
4. **Age:** free text, so a writer can explain an ageless, unknown, or complicated age.
5. **Gender identity or expression:** (one line, free text).
6. **Physical appearance:** body type, height, hair, eyes, skin, clothing and color scheme, posture and signature pose, gestures, facial expressions, distinguishing marks.
7. **Voice:** vocal tone and pace, speech patterns, favorite words, what they never say.
8. **Personality:** strengths, flaws, contradictions, moods, nervous tics, and how all of it shows in how they look and move.
9. **Background and history:** where they come from, and the wound: the past event that still shapes them.
10. **What they want and what they need:** the conscious goal, and the truth they'd have to accept to change. Craft writers note that the two should differ.
11. **The lie they believe:** the false belief the wound left behind, if there is one.
12. **What stands in their way:** outside obstacles and inner ones.
13. **Arc:** how they change by the end, or why they don't.
14. **Relevance to the story:** their role and why the story needs them.
15. **Secrets:** what they hide, and from whom.
16. **Relationships:** links to Relationship entries, filled in automatically once step 4 exists.
17. **Appearances:** where they appear (scenes, chapters, or books in a series).

Screenplay adds the introduction line as written in the script and casting notes. Game adds playable or NPC, gameplay role, and bark or callout style.

Tim approved the list 2026-10-30, with Age as free text.

## Draft questions (for Tim's edits)

When a character is added, Fletchery asks for a name first, since the name sets the folder and file.

**Seed** (guide: "One sentence: who they are and the shape of their story.")
1. Who is this person, in a few words? Not their name: what they are.
2. What do they want most?
3. What gets in their way?
4. Put it together in one sentence.

**Sketch** (guide: "One paragraph: their story from start to finish, as they live it.")
1. Where do they start, and what's ordinary for them?
2. What changes for them, and how do they respond?
3. What do they try, and what does it cost them?
4. What turns things for them?
5. Where do they end up, and how are they different?

**Sheet** (guide: "As much as you know. Leave anything you haven't decided.")
1. **Name:** What's their full name, and what do other people call them? Who uses which name?
2. **Type:** What kind of being are they, and where do they belong?
3. **Archetype:** Which patterns do they fit? Pick any that apply, or name your own.
4. **Age:** How old are they? If age doesn't apply, or it's complicated, say how.
5. **Gender identity or expression:** How do they understand and express their gender?
6. **Physical appearance:** What would someone notice first, and what only later?
7. **Voice:** What do they sound like? How fast, how loud, and which words do they reach for?
8. **Personality:** What are they like to be around, and where do they contradict themselves?
9. **Background and history:** Where do they come from, and what happened that still shapes them?
10. **Want and need:** What do they want, and what do they actually need?
11. **The lie they believe:** What do they believe about themselves or the world that isn't true?
12. **What stands in their way:** What's against them, outside and inside?
13. **Arc:** How are they different at the end, or why do they stay the same?
14. **Relevance to the story:** Why does the story need them?
15. **Secrets:** What are they hiding, and from whom?
16. **Relationships:** Who matters most to them, and how?
17. **Appearances:** Where do they appear in the story?

## Built

1. **Step 1, character entries (2026-10-30):** the Characters page with cards (silhouette placeholders), Add a character, the editor for each character with all approved fields and questions, the Archetype chips, Rename (moving folder and file through a new folder-move API), the placeholder portrait that cycles neutral, female, male, the sidebar folder (closed by default, remembered in Settings), page addresses with Back and reload, and the Premise Sheet's Go to Characters. Rewriting links on rename waits for the media library's link rewriting, since nothing links to characters yet.

Tim approved the questions, the rename plan, and the silhouettes 2026-10-30.

**Revised after Tim's review of step 1 (2026-10-30):** the guided stepping didn't suit characters. Seed and Sketch now have one prompt each ("Who is this person, and what's the shape of their story? Say it in one sentence." and "Tell their story in a paragraph: where they start, what changes, and where they end up."). The Sheet is a form: every field at once, each with its label and the drafted question as a short description, with no tabs or numbers (`form: true` in the section data). Rename is a pencil icon beside the name. Placeholder text is dimmer (`--color-text-hint`, about 4.8:1). Then: a single prompt shows without its guide line (they said the same thing); form boxes are inset on the cream with a fine border so they read apart from their labels; Physical appearance asks for distinguishing marks (skin, birthmarks, scars, tattoos); and a short Personality traits field ("Which words describe them? Strengths and flaws both.") sits before Personality, making eighteen fields for prose.
