# Premise end to end: design brief

Paused 2026-10-29 to run Sentinel. Build phase 2 of the approved plan.

## Decided

- Guiding questions are prompts above one answer per depth (one answer per field at Sheet). Interview mode shows one question at a time with Back and Next. Full form lists them all.
- One file per entry, with a `## Seed`, `## Sketch`, and `## Sheet` heading for each depth. Sheet fields are `###` headings under `## Sheet`. Deeper layers add to the file and never replace shallower ones.
- A body with no known headings (for example, EOL's existing "TBA") is read as the Seed.
- The Premise `description` frontmatter field mirrors the Seed sentence, so indexes can use it.

## Built (2026-10-30)

- Section list from `sections/<type>.json` (beside the page from 960px, a Sections menu below that), with Premise linked and the rest marked Not built yet.
- Depth control. Shallower layers show above as read-only context, each with an Edit link that jumps to that depth.
- Interview me (one question, or one Sheet part, at a time) and Full form, remembered per browser.
- Status as a shape plus a word. Mark as canon and Back to draft (renamed from "settled"). Editing a canon entry returns it to draft and says so.
- Skip for now, recorded in `fletcherling.json` and cleared by writing.
- Ask Claude, disabled with a note until the bridge exists.
- Audit items R1 (44px buttons on the grid), R4 (save status by the editor), and A2 (disabled and pressed styles).

## Open

- Tim is sending edits to the question set. The drafts below are in `sections/*.json` as placeholders.

## Draft copy (placeholder)

Why this matters: The premise is the shortest true statement of your story, and every other entry in the bible has to agree with it.

Seed (one sentence, under 15 words, no names):
1. Who has the most to lose? Describe them without using a name.
2. What do they want to win, or keep from losing?
3. What larger situation puts that at risk?
4. Put those together in one sentence of fewer than 15 words.

Sketch (one paragraph, about five sentences):
1. Setup: who, where, and what's normal before things go wrong?
2. First disaster: what ends the beginning and commits them? It can come from outside.
3. Second disaster: how does their attempt to fix things make it worse?
4. Third disaster: what failure forces the final act?
5. Ending: how does it resolve, and what does it cost?

Sheet (about a page, four paragraphs, each of the first three ending in a disaster): Act 1 through the first disaster; Act 2 through the second; Act 2 through the third; Act 3 and the ending.

## Also in this phase

Depth control, status (empty, draft, canon, each with a text label and a shape), Skip for now, and the Ask Claude menu, shown disabled until the bridge phase. Fold in audit items A2 (disabled styles) and R4 (save status visibility).
