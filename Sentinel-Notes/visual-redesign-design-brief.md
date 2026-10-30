# Visual redesign: design brief

Proposed 2026-10-30, after Tim reviewed the built Premise page and found it still looks like a prototype. This covers visual design, layout, and feel only. Behavior changes agreed in the same review are in [premise-end-to-end-design-brief.md](premise-end-to-end-design-brief.md).

Tim wrote a redesign prompt (pasted in session and deliberately not kept in the repo). Its goal: a quiet, literary writer's workshop where a writer wants to stay, not a SaaS dashboard or an AI tool. The decisions below amend it.

## Decided

- **Scope.** The prompt is for visual design only. Its "preserve the structure, terminology, and functionality" lines mean the redesign doesn't change behavior. They don't freeze the behavior changes already agreed in the Premise brief.
- **Icon.** `assets/fletchery-icon.svg`, the book cover with the fletched arrow. Its colors are the existing tokens: charcoal `#2A2D32`, spine `#1D1F23`, mid charcoal `#3B3F46`, and orange `#E0601E`. The SVG holds no cream; the cream comes from `tokens.css`.
- **Light text.** Allowed on charcoal and spine when contrast passes. Still never on cream. (CLAUDE.md color rule updated.)
- **Orange.** It still never carries small text. The active section gets an orange marker with charcoal text.
- **Typography.** The writer's own text is set in a serif. The interface stays in Source Sans 3. The font is a writer's choice in Settings, and the Atkinson Hyperlegible option stays.
- **Grid.** The 8px unit, 4px baseline, and 28px line stay.
- **Breakpoints.** A tablet tier is added beside the 720px breakpoint and the 960px navigation point.
- **Canvas.** The whole app isn't a canvas. The planned canvas view in [layout-views-design-brief.md](layout-views-design-brief.md) stays open.
- **Reference.** `Sentinel-Notes/screenshots/` holds the Storyflow reference. It's a third-party interface, so the folder is gitignored. What carries over: tall column cards in sequence with thin connectors, full-width images inside cards, and separation by tone instead of heavy borders. Not its dark theme or its canvas.

## Mockup review (2026-10-30)

Mockups: https://claude.ai/artifact/XuVSsW4zdE8JQQvqwQAemM (private).

- **Serif:** Literata.
- **One layout for every depth.** Seed, Sketch, and Sheet share the same layout. The question or prompt sits above the writing surface, never beside it.
- **Section list:** the writer can show or hide it on every depth. Hidden, it collapses to a strip of status shapes.
- **Focus:** available from every depth.
- **Receding controls:** Tim leans toward Fade (dim the chrome while typing) over Tuck, and may change his mind.
- **Links:** Tim likes the fletching mark but doubts it works mid-sentence. An arrow underline (a translucent orange line ending in a small arrowhead, opaque on hover) was added to compare.

## Open

- **Links.** No underlines. Tim wants a distinctive touch of the app's own. Constraint: a link must differ from the text around it by more than color (WCAG 1.4.1), and charcoal links in charcoal text get no help from color, so it needs a visible mark.
- **Width.** Tim finds the 68ch writing area confining. To try: a wider measure with larger type (about 20-21px, up to about 80ch); a writing surface that takes the width while navigation collapses and guidance moves to a margin; a focus mode that opens the field as a near full-screen sheet; fields that grow with their text instead of scrolling.
- **Receding controls.** Whether controls fade while the writer types. Tim wants a couple of examples before deciding. Hidden controls cost discoverability and keyboard reach.
- **Writing size by depth.** A Seed is one sentence, so its field shouldn't look like it wants a page. Size follows the depth.
- **Fade and contrast.** Dimmed chrome fails contrast while it's dimmed. It has to come back at full contrast the moment the writer pauses or reaches for it.
- **Arrow underline at rest.** At 40% opacity the orange line is faint. Check that it still reads as a link for low-vision writers.
