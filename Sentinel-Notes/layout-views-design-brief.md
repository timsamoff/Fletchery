# Layout views: design brief

Proposed 2026-10-30. The writer can switch between views of the same bible. Each view reads the files and writes changes back to them, so edits from Claude Code still appear live and conflict detection still applies. Inspired by the drag-and-drop blocks in Storyflow (storyflow.so), adopted as a layout pattern only. None of its collaboration features are in scope.

## Views (proposed; not yet chosen)

1. **Document (default):** one section at a time, with guided questions and the text area. This is where the writing happens.
2. **Board (kanban):** every drag changes something real.
   - **Status board, any section:** columns Empty, Draft, Settled, with entries as cards. Dropping on Settled settles the entry, and `ai-draft` becomes `ai-reviewed`. An optional depth board uses Seed, Sketch, and Sheet columns.
   - **Plot board:** columns are acts, sequences, or chapters, with scenes as cards. Dragging reorders and moves scenes.
   - **Inbox board:** the Inbox plus section columns. Dropping a card on a section files it.
3. **Canvas (freeform):** cards placed anywhere, grouped by nearness, with connector lines.
   - **Relationship map:** drawing a line between two characters creates a relationship entry.
   - **Idea board:** for Notes and media.
   - **Positions:** stored in `story-bible/.fletcherling/layout.json`, never in entries. `BIBLE.md` tells the AI to ignore that file.
4. **Outline:** a compact, keyboard-friendly tree of sections and entries. It doubles as navigation and as the accessible alternative to dragging.

Recommended order: Document now. The Board (plot and status boards first) after Characters exists, since a board needs several entries. The Canvas later, as its own phase. The Outline folded into navigation.

## Motion and layering

- **Pick up (about 120 ms):** the card scales up about 3%, tilts 1-2 degrees, and moves from the resting to the lifted shadow. Its old slot becomes a recessed outline.
- **Drag:**
  - The card follows the pointer with slight lag, and its tilt leans with speed and direction.
  - Cards underneath slide apart to open a gap, with a small stagger.
  - The target column rises a layer, with a heavier border and a text label ("Drop to move to Settled"), so the target is never shown by color alone.
- **Drop (about 250-350 ms):** the card springs into its slot with a small overshoot, its shadow settles, and the neighbors close up.
- **Cancel (Esc, or a drop outside any target):** the card springs back to its origin.
- **Edges:** the board scrolls on its own, faster near the edge. Panning the canvas keeps some momentum and slows gently.
- **Layers:**
  - Three elevation tokens (resting, hovered, lifted), with shadows built from the icon's charcoal.
  - Shadows appear only to show depth during interaction, not as decoration on every card.
  - Stacking order: lifted card, then target column, then the board.
- **Grid:** card heights are whole 28px lines, so everything lands on the grid.

## Implementation

- **Drag engine:** a small custom one on pointer events (mouse, touch, pen), with no library. SortableJS's animation is too plain for this, and the browser's built-in drag and drop is weak on touch.
- **Reflow:** FLIP animation for the cards that move aside, animating `transform` and `opacity` only.
- **Easing:** spring curves through CSS `linear()` easing, which current Chrome, Edge, Firefox, and Safari support.
- **Tokens:** durations, easings, and elevations live in `tokens.css`, so the whole feel is tuned in one place.
- **Editions:** the engine lives in the shared front-end core, so it works in both the local and web editions.

## Accessibility (required)

- **Single-pointer alternative:** every drag has a non-drag equivalent (WCAG 2.2, criterion 2.5.7): a "Move to..." menu on each card, plus keyboard pick-up and drop (Space to lift, arrow keys to move, Space to drop, Esc to cancel).
- **Animated keyboard moves:** keyboard and menu moves get the same lift, glide, and settle animation.
- **Reduced motion:** under `prefers-reduced-motion`, nothing travels or springs. The card fades at its origin and fades in at its destination.
- **Announcements:** every move is announced through a live region ("Scene 4 moved to Act 2, position 3").

## Open questions

- **Which views:** confirm or adjust the four views and the order above.
- **Scene files:** `docs/SPEC.md` (default 7) keeps scenes as one line each in `plot/scenes.md`. Rich scene cards (notes, POV, images) would need one file per scene. Keep the single file, or change the decision?
- **Prototype first:** a throwaway prototype in `scratch/`, with one plot board, fake cards, and the drag engine and easing, to tune the feel in Tim's browser before building anything real.
