⟦Working agreement

Do not start by writing code. Read first.

1. Read the existing guided interview code, the current Seed, Sketch, and Sheet implementation, and the code that reads and writes the Markdown Story Bible files.
2. Report what you found, including anything in the current architecture that conflicts with this spec.
3. Propose a phased plan using the phases at the end of this document, or a better split if you see one.
4. Wait for my confirmation before implementing anything.

After that, work one phase at a time. Prefer surgical, targeted changes over rewrites. Do not refactor code outside the phase you are working on. Confirm each phase with me before starting the next.

Constraints and non-goals

* Markdown files remain the source of truth. No proprietary storage format for Story Bible content.
* Every feature in the standard guided experience must work with no AI connected.
* No AI-generated text is written to a Story Bible file without the writer's explicit acceptance.
* No new dependencies without discussing them with me first.
* Fletchery is not a manuscript editor, a project manager, a publishing platform, or an AI novel generator. Do not add features in those directions.⟧

# Improve Fletchery's guided Story Bible experience

Improve Fletchery's guided Story Bible experience so that it becomes the defining feature of the application.

Fletchery should not distinguish itself by having more features than other fiction-writing tools, more AI generation, or more exhaustive forms. Its advantage should be the quality of the experience:

Fletchery should be exceptionally good at helping writers think deeply about their stories without making them feel like they are operating software.

The guided experience should feel less like completing a wizard and more like having an unusually perceptive editor interview you about your story.

## The guided experience must be unusually good

A conventional guided wizard asks a predetermined sequence of questions:

* What does your protagonist want?
* What stands in their way?
* What happens if they fail?

That is useful, but it is not enough to make Fletchery distinctive.

The existing guided questions should remain useful without AI. A writer must be able to build a complete Story Bible using Fletchery without connecting an AI service.

When AI is available, the interview should become adaptive. Fletchery should pay attention to what the writer actually says and recognize potentially important ideas, implications, contradictions, characters, objects, relationships, world rules, motivations, and unanswered questions. It should then allow the writer to decide whether any of those threads deserve exploration.

For example, suppose a writer answers:

> Damian depends on an obsolete prosthetic arm to make a living.

Rather than blindly proceeding to the next predetermined question, Fletchery might recognize several avenues worth exploring:

* **Explore Damian.** Why is his ability to work important to his identity?
* **Explore the prosthetic.** What can the arm do, and what limitations does it impose?
* **Explore the world.** Why is functioning technology allowed to become unusable?
* **Continue.** Stay with the current interview.

These are examples of the interaction principle, not hard-coded questions or required UI labels.

The important behavior is:

**Fletchery notices. The writer decides.**

AI should never hijack the interview simply because it finds a subject interesting. The writer remains in control of which threads become canon, which deserve further thought, and which should be ignored.

## Follow threads without losing your place

Exploring an interesting answer should not derail the original interview. Think of the interview as having branches. The writer should be able to follow a thread several questions deep and then naturally return to where they were.

The experience should preserve context:

* where the thread originated
* what question prompted it
* what Story Bible material it relates to
* where the writer was before exploring it

The writer should never feel lost inside a decision tree. Avoid making this look like a technical flowchart or chatbot conversation tree. It should feel natural and editorial.

⟦The writer should also be able to start a thread on their own, without AI, from anything they have written. AI adds noticing; it should not be required for branching itself. Raise this with me during planning if it complicates the design.⟧

## Seed → Sketch → Sheet is a writing philosophy

Preserve and strengthen Fletchery's existing Seed → Sketch → Sheet depth model.

These levels should not merely represent short, medium, and long forms. They should represent different levels of commitment and exploration.

**Seed.** Capture the essential idea. Ask only what is necessary to establish something useful in the Story Bible. A Seed should allow a writer to record an idea without being forced to understand everything about it yet.

**Sketch.** Develop the idea enough that it becomes meaningfully connected to the rest of the story. Ask questions that reveal motivations, consequences, relationships, implications, conflicts, or other relevant dimensions.

**Sheet.** Explore the subject deeply. At this level, the writer has intentionally chosen to develop something substantially and should be given room to examine nuance, history, contradictions, relationships, consequences, and other meaningful details.

The underlying principle is:

**Do not demand decisions before the story needs them.**

Many worldbuilding and fiction-planning tools confront writers with large numbers of empty fields. Those empty fields implicitly tell the writer that all of this information needs to be invented. Fletchery should communicate the opposite:

How much do you know right now?

A writer should never feel that a Seed is incomplete merely because it is not a Sheet. Depth is optional and intentional.

## Let existing material grow

A Seed should be able to become a Sketch later. A Sketch should be able to become a Sheet. The writer should not have to start over.

Provide a natural way to go deeper from existing material. When increasing depth, preserve everything the writer has already established and ask only the additional questions necessary to develop it further. If AI is connected, those deeper questions can take existing answers and the rest of the Story Bible into account. Development should feel cumulative rather than repetitive.

⟦Going deeper must update the existing Markdown file in place. It must not create a parallel file or overwrite the writer's existing text.⟧

## AI should be Socratic, not generative

Do not turn Fletchery into an AI writer. There are already many products designed to generate characters, plots, prose, scenes, chapters, and entire stories. That is not Fletchery's purpose.

AI should primarily make the thinking process better. Use AI as an intelligent editorial partner that can question, notice, compare, challenge, and help the writer explore.

Useful AI interactions might include:

* **Follow this thread.** Ask a thoughtful follow-up based on something I just wrote.
* **What am I missing?** Identify an important implication or unanswered question.
* **Challenge this.** Look for weaknesses, assumptions, implausibilities, or contradictions.
* **Help me think.** Offer possibilities that might help me arrive at my own answer.
* **Check the bible.** Compare this answer with established information elsewhere in the Story Bible and identify possible conflicts.

These labels are illustrative. Design the interaction naturally within Fletchery rather than treating this list as required buttons.

## AI must remain optional

Everything necessary to create and maintain a useful Story Bible must work without AI. The standard guided experience should contain carefully written human-designed questions. Connecting an AI API should enhance the interview, not unlock the fundamental application.

Without AI, Fletchery asks good questions. With AI, Fletchery can ask good questions about what I specifically said. That distinction should remain clear in the architecture and user experience.

Do not degrade the non-AI experience to encourage API use.

## The author establishes canon

**AI can propose. Only the writer can establish canon.**

AI can notice, question, suggest, compare, identify contradictions, identify implications, and offer possibilities. The author decides what is true.

Generated suggestions should remain clearly distinct from established Story Bible material until the writer deliberately accepts, edits, or writes something. Do not silently insert AI-generated assumptions into Story Bible files.

⟦Keep unaccepted suggestions out of the Markdown files entirely. They live in the interface only, and the writer must take an explicit action to bring any of them into canon.⟧

## Use the entire Story Bible intelligently

When AI is available, its usefulness should not be limited to the current form or passage. Relevant existing Story Bible material can provide context.

* If the writer establishes something about a character that appears to contradict something already written elsewhere, Fletchery can notice.
* If an answer has an interesting implication for another established character, location, event, relationship, theme, or rule, Fletchery can notice.
* If a question has already effectively been answered elsewhere, avoid asking it again.

The goal is not to demonstrate how much context the AI can process. The goal is to make Fletchery feel attentive.

## Notice more than you say

Fletchery should notice more than it says. Surface observations selectively and contextually, and let the writer ask for more when they want it.

⟦Do not interrupt the writer every time the system detects something potentially interesting. Do not cover the interface in suggestions, display AI commentary beside the writing, or make writers dismiss suggestions to continue working. Silence is an important part of the writing experience.⟧

## Protect writing flow

The writer should always have room to answer freely. Avoid tiny text boxes designed around expected answer lengths. Do not impose artificial time constraints or unnecessary word limits.

Questions provide direction. They should not constrain the answer. When appropriate, the writing surface should expand with the writer's response and allow the interface around it to recede.

## Avoid completion anxiety

Do not make Fletchery feel like a checklist that must reach 100%. An unanswered question is not necessarily unfinished work. A Seed is not an incomplete Sheet. A character does not need every conceivable attribute defined. A world does not need every rule documented.

The Story Bible should grow according to the needs of the story. Progress should reflect what the writer has intentionally developed, not how many arbitrary fields remain empty.

## Markdown remains the source of truth

Fletchery works directly with the writer's Markdown Story Bible files. The Markdown is the Story Bible. Fletchery is an interface for reading, writing, organizing, developing, and understanding it.

Whether the files live on the user's local disk or in the user's connected Google Drive, Fletchery should work with those .md files directly.

A writer should be able to edit a Story Bible Markdown file outside Fletchery and have that change reflected when Fletchery reads it again. A change deliberately written through Fletchery should be written back to the corresponding Markdown. Do not create features that lock important Story Bible information inside a Fletchery-only representation.

## Keep Fletchery focused

Fletchery's strength should come from doing a smaller thing exceptionally well. The design test for every major feature is:

**Does this help the writer think more deeply about the story while creating less friction?**

If not, reconsider it.

## The target experience

An experienced user of fiction-planning and Story Bible software should encounter Fletchery and immediately notice that its priorities are different. They should not be impressed by more fields, more AI, or more features. They should think:

"This actually helps me think."

The ideal Fletchery experience can be reduced to:

* Open my files.
* Ask me good questions.
* Notice what matters.
* Give me somewhere beautiful and unrestricted to write the answers.
* Let me decide what becomes canon.
* Get out of the way.

⟦## Suggested phases

Adjust this split after you have read the code.

**Phase 1: Non-AI foundation.** Seed, Sketch, and Sheet depth with in-place growth from one level to the next. Unrestricted, expanding writing surface. No completion meter or percent-complete framing. Reliable Markdown round-tripping with external edits.

**Phase 2: Threads.** Branching from any answer with preserved return context. Natural, editorial presentation, not a flowchart.

**Phase 3: AI noticing.** Adaptive, optional follow-ups based on what the writer wrote. The proposal and canon separation must be in place before any AI output appears in the interface. Selective, quiet surfacing.

**Phase 4: Whole-Bible awareness.** Cross-file context, contradiction and implication checks, and skipping questions the Bible already answers.

## Acceptance checks

* With no API key configured, a writer can build a complete Story Bible start to finish.
* No AI-generated text is written to any .md file without an explicit accept, edit, or write by the writer.
* Editing a Story Bible .md file outside Fletchery shows up the next time Fletchery reads it.
* A Seed can be taken to Sketch, and a Sketch to Sheet, without losing or duplicating anything already written.
* After following a thread several questions deep, the writer returns to the exact question they left.
* The interface shows no percent-complete indicator and no count of empty fields.
* Nothing in the non-AI path is degraded or gated behind an API connection.⟧
