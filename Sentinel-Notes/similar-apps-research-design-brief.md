# Similar apps and writing practice: research and ideas

Researched 2026-11-15, after the code review. This is brainstorming, and nothing here is decided. Most sources are vendor pages and writing blogs, so the product claims are theirs and the craft advice is convention, not research. Features and prices change, so check a vendor's page before relying on a detail.

## What the other apps do

| App | What it does well | Where it falls short |
|---|---|---|
| Sudowrite Story Bible | A fixed pipeline: Braindump, Synopsis, Characters, Worldbuilding, Outline. Each step is generated from the one before. | The AI writes and the writer edits. Cloud only, with size caps on cards. |
| Novelcrafter Codex | Automatic mentions, relations between entries, "progressions" that record how an entry changes over the story, and a switch to keep an entry out of AI context. | Proprietary storage. The AI is only as good as the entries. |
| World Anvil, Campfire | Deep templates for everything. | World Anvil is known for a steep learning curve, and both invite endless building. |
| Plottr | Timeline-style outlining. | Its bible is called generic, and you can't draft in it. |
| Aeon Timeline | Characters have birth dates, so ages at each event are calculated. Chronological order and narrative order are kept separately. | A timeline tool only. |
| Obsidian with plugins | Plain Markdown, local files. | Writers report having to tinker with code to get a workable setup. |
| articy:draft | Templates built from reusable groups of fields. | Built for studios. |
| NovelAI lorebook | Entries enter the AI's context only when their keys appear, within a token budget. | Manual key and budget tuning. |

## What the craft advice says

- A bible holds established facts only, kept apart from ideas. Fletchery's canon status already does this.
- Bibles go stale during revision, which is when they matter most.
- "Worldbuilder's disease" is procrastination that looks like progress. The usual cure is to build enough to start. There is real disagreement here: others argue the unseen 90% improves the visible 10%.
- Leave some things undefined on purpose, to keep room across a series.
- For characters, the details that hold a voice steady are concrete: sentence length, a verbal habit, and sample lines.

## Where Fletchery already leads

Plain files as the product, AI as an option that proposes instead of overwriting, canon set only by the writer, and Seed, Sketch, and Sheet. The depths are a better answer to over-building than anything in the table, because a one-line Seed counts as done. The character Sheet already covers want and need, the lie, and voice.

## Improvements worth borrowing

Each keeps the current file format and framework.

1. **Aliases and mentions.** Add an `aliases` list to character frontmatter and a "Mentioned in" list on each entry, found by plain text matching in the core. This is the base for the link suggestions already planned, and it needs no AI.
2. **A voice sample in the Voice field.** Change the field's description to ask for two lines of dialogue, one calm and one under pressure. A data-only change in `sections/*.json`.
3. **Ages from a birth date.** When Timeline is built, store `born` on a character and show their age at each event. Shifting ages are the most cited continuity error.
4. **Two orders for events.** Keep chronological order in `timeline/` and story order in the scene list, as Aeon does, so reordering scenes never changes dates.
5. **Shared field groups.** The three character Sheets share 17 fields and differ by two or three (Introduction line and Casting notes for screenplay; Playable or NPC, Gameplay role, and Barks and callouts for game). One shared list plus per-type additions would remove the triple maintenance. The gate reads section ids only, so the file shape it needs can stay.

## Possible innovations

1. **Depth as the AI's context budget.** No other app has entries at three resolutions. `BIBLE.md` could carry every Seed (the whole story in a page), with Sketches and Sheets read only for the entries in play. That gives what the lorebook's keys and budgets give, with no tuning by the writer. A per-entry `ai: never` would cover private notes.
2. **Changes over time, as a fourth part of an entry.** A `## Changes` section listing what becomes true and when ("After the fire: knows about the letter"). The Premise questions are already built around change, so this extends the same idea to every character and relationship. It answers the question a static bible can't: what does she know in chapter 12? It needs a format decision in `docs/SPEC.md`, and it touches H3 in the code review (how the parser treats a new `##` heading).
3. **Manuscript back to bible.** After a drafting session, the `fletchery-read` or `fletchery-process` skill compares the new pages to the bible and writes proposals ("The draft says Ada is 41. The bible says 40."). The proposal mechanism is already designed. The other apps only send the bible to the AI, which is why their bibles go stale.
4. **Undecided on purpose.** Let the writer mark a field or entry as an open question. The audit doesn't count it, and the AI rules say never to answer it, only to ask. Sudowrite fills every gap. This does the opposite, and it matches the guided interview brief.
5. **A review pass.** Reuse "One at a time" to walk canon entries oldest first and ask "Still true?" with Keep, Edit, or Back to draft. It uses `updated`, which every entry already has.
6. **A context pack for any AI.** One button that copies the bible at a chosen depth to the clipboard, for writers who use a chat app and no key.

## What to consider first

This is judgment, not a plan.

- Innovation 1 costs almost nothing extra, since `BIBLE.md` generation is already on the list and only its shape changes.
- Improvement 1 is the next most useful, because links, rename rewriting, and the audit all depend on it.
- Innovation 2 is the most distinctive and needs the format decision first.

None of this changes the order for the bug fixes in [code-review-2026-11-15.md](code-review-2026-11-15.md).

## Sources

- [Novelcrafter Codex](https://www.novelcrafter.com/features/codex)
- [Novelcrafter changelog, December 21 2024](https://feedback.novelcrafter.com/changelog/december-21-2024)
- [Sudowrite: What is Story Bible](https://docs.sudowrite.com/using-sudowrite/1ow1qkGqof9rtcyGnrWUBS/what-is-story-bible/jmWepHcQdJetNrE991fjJC)
- [Sudowrite: Story bible template](https://sudowrite.com/blog/story-bible-template/)
- [Kindlepreneur: Campfire vs World Anvil](https://kindlepreneur.com/campfire-vs-world-anvil/)
- [Chapter: Plottr vs Campfire](https://blog.chapter.pub/plottr-vs-campfire/)
- [Aeon Timeline: Track characters](https://www.aeontimeline.com/guides/story/track-characters)
- [Aeon Timeline: The Narrative](https://www.aeontimeline.com/guides/narrative)
- [articy:draft: Templates overview](https://www.articy.com/help/adx/Templates_Overview.html)
- [NovelAI: Lorebook](https://docs.novelai.net/en/text/lorebook)
- [Obsidian forum: tracking characters, locations and timeline](https://forum.obsidian.md/t/best-practices-for-tracking-characters-locations-and-timeline-etc-in-a-novel/33990)
- [Obsidian Longform plugin](https://community.obsidian.md/plugins/longform)
- [Jane Friedman: The story bible](https://www.janefriedman.com/the-story-bible/)
- [Novela: A story bible that actually gets used](https://novela.so/en/blog/story-bible-that-gets-used)
- [World Anvil: What is worldbuilder's disease](https://www.worldanvil.com/academy/what-is-worldbuilders-disease)
- [Game Developer: Dangerous advice, worldbuild only enough to support the story](https://gamedeveloper.com/design/dangerous-advice-worldbuild-only-enough-to-support-the-story-)
- [Weather Factory: Seven tips on organising setting documentation](https://weatherfactory.biz/apep-and-ra-seven-intensely-practical-tips-about-organising-setting-documentation-for-narrative-games/)
- [Celtx: How to create a character bible](https://blog.celtx.com/how-to-create-a-character-bible/)
