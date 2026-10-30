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
- **One layout for every depth.** Seed, Sketch, and Sheet share the same layout. The question sits above the writing surface, never beside it, and looks the same at every depth: a count and guide line, the question in large sans, and Back and Next to the right.
- **Section list:** the writer can show or hide it on every depth. Hidden, it collapses to a strip of status shapes.
- **Focus:** available from every depth.
- **Receding controls:** Tim leans toward Fade (dim the chrome while typing) over Tuck, and may change his mind.
- **Links:** the fletching mark (two small orange chevrons after the link text, shifting right on hover). An arrow underline was compared and not chosen.
- **Writer's text size:** the same at every depth (20px Literata on the 28px line). A zoom option for the writer's text is worth adding with the formatting editor.
- **Motion:** err on the side of animation (CLAUDE.md design rule). The section list animates its width as it opens and closes, crossfading between the full list and the strip.
- **Focus sheet questions:** the same question area as the depth screens, mode buttons and Back and Next included (the board 3 mockup doesn't match; build it to match boards 1 and 2).
- **Focus animation:** Rise. The sheet rises about 48px as it fades in over a dark backdrop, and sinks back on close. Fade, Lift, and Dim the room were compared.

## Build

1. Foundation (built 2026-10-30): Literata for the writer's text, new tokens (deep cream, rule, paper shadow, motion), charcoal primary buttons with cream labels, quieter header with the project title in serif italic, restyled section list and status label.
2. Section page: one layout for every depth with the question card on top, the writing surface filling the screen, the animated section list, and Focus with Rise.
3. Details: fletching links, fading chrome while typing, and the Google Docs paste fix.

## Open

- **Links.** No underlines. Tim wants a distinctive touch of the app's own. Constraint: a link must differ from the text around it by more than color (WCAG 1.4.1), and charcoal links in charcoal text get no help from color, so it needs a visible mark.
- **Width.** Tim finds the 68ch writing area confining. To try: a wider measure with larger type (about 20-21px, up to about 80ch); a writing surface that takes the width while navigation collapses and guidance moves to a margin; a focus mode that opens the field as a near full-screen sheet; fields that grow with their text instead of scrolling.
- **Receding controls.** Whether controls fade while the writer types. Tim wants a couple of examples before deciding. Hidden controls cost discoverability and keyboard reach.
- **Writing size by depth.** A Seed is one sentence, so its field shouldn't look like it wants a page. Size follows the depth.
- **Fade and contrast.** Dimmed chrome fails contrast while it's dimmed. It has to come back at full contrast the moment the writer pauses or reaches for it.
- **Links that wrap.** The fletching mark keeps a link on one line, so a long link drops whole to the next line.
