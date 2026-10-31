# Fletchery spec

This file records the decisions agreed in Phase 0. The build prompt in `first-prompt/FLETCHERLING-PROMPT.md` is still the full brief. Where this file and the prompt differ, this file wins.

## Environment

- Windows 11. Node 25.2 and npm 11.6 are installed. Claude Code 2.1.314 is on the path.
- The Fletchery repo lives at `C:\Users\Tim\Documents\Fletchery`.

## Decided

### Name

The app is Fletchery, renamed from Fletcherling on 2026-10-30. Bibles made before then have `story-bible/fletcherling.json`, which the app renames to `fletchery.json` the first time it opens them. The GitHub repo and the local folder were renamed to Fletchery the same day.

### Stack

Node, with a plain HTML, CSS, and JavaScript front end and no build step. The reasons: the `@fontsource` packages for Source Sans 3, Atkinson Hyperlegible, and Literata (the serif for the writer's own text, added 2026-10-30) are npm packages, `npm link` gives a global command on Windows with no extra setup, and Node's built-in recursive `fs.watch` works on Windows. Dependencies stay few, and each one needs a reason. No database.

A build step is allowed (decided 2026-10-30), for example for a formatting editor. Tim runs it for the web edition. A local writer gets instructions plain enough to follow themselves or hand to their AI.

### Install and launch

- The code stays in this repo. Running `npm link` once puts `fletchery` on the PATH, and edits to the repo take effect on the next launch.
- Run `fletchery` from a story project directory. The bible is read and created at `./story-bible/`.
- The default port is 3000. If it's taken, Fletchery tries 3001, 3002, and so on, and prints the URL it used. `--port <n>` overrides the default.
- Launch opens the default browser. `--no-open` skips that.
- One project per launch. Several projects can run at once on different ports.

### Story project CLAUDE.md

On first run, Fletchery asks once whether it may add a pointer to the project's `CLAUDE.md`. If you say yes, it appends a short block between marker comments that points to `story-bible/BIBLE.md`, creating `CLAUDE.md` if it doesn't exist. The answer is stored in `fletchery.json` so the question isn't asked again. Fletchery only ever edits its own marked block.

### Style files

- Before writing UI copy or documentation, Claude loads the `tim-writing-style` skill and reads the global `~/.claude/CLAUDE.md`. (`~/.claude/WritingStyle.md`, named in the prompt, doesn't exist.)
- Each bible's Voice section has a list of style file paths. It defaults to the four files in `~/.claude/skills/tim-writing-style/`: `SKILL.md`, `full-guide.md`, `samples.md`, and `edit-pairs.md`. The list can be edited per project. Voice links to these files and never copies them.

### AI proposals

When the AI wants to change writer text, it writes a proposal file to `story-bible/.fletchery/proposals/`, one per change. The app shows the current text beside the proposed text with Accept and Reject. Entry files don't change until a proposal is accepted.

### Git

Fletchery writes no ignore files. Everything in `story-bible/`, including `.fletchery/` requests, proposals, and app state, is meant to be tracked, so the history of AI work stays in the repo.

## Settled in plan review

- **Series scope.** One bible for the whole series. The top-level layout matches a standalone. A series adds `books/<slug>/` (that book's `premise.md` and `plot/`) and `series/` (continuity). Characters, relationships, world, timeline, themes, and voice are shared. Top-level `premise/` holds the series premise. A standalone has no `books/` or `series/`, and `plot/` sits at the top level.
- **Bridge.** The request queue is built first. A "Run now" option using `claude -p` (restricted tools, budget cap, off by default) may come after the bridge phase, but only with approval.
- **Section lists.** Screenplay and Game narrative use the lists in the approved plan, stored as `sections/<type>.json` and open to later edits.
- **Colors.** The UI uses only the icon's colors on cream. No white text anywhere.
  - Charcoal `#2A2D32`: body text, headings, borders, rules, icons (11.74:1 on cream `#F1ECE2`, 12.70:1 on card cream `#F8F5EF`).
  - Spine charcoal `#1D1F23`: labels on orange buttons (4.61:1 on `#E0601E`).
  - Mid charcoal `#3B3F46`: secondary text and quiet borders (8.98:1 on cream).
  - Rust orange `#E0601E`: button fills, focus rings, status marks, link underlines, and large text only. It's 3.04:1 on cream, so it never carries small text.
  - Links are charcoal text with an orange underline.
- **Security.** The server binds to `127.0.0.1`, checks the `Host` header, and refuses writes from any other `Origin`.
- **Rhythm.** Base unit 8px, body 18px on a 28px line height, a 4px baseline grid, and a "Show grid" overlay for checking it.

## Section lists

Each story type's sections live in `sections/<type>.json`, by ID and title. IDs are stable because they name folders and files. Every story type also has the Notes and media area (`notes`).

| ID | Prose fiction | Screenplay | Game narrative |
|---|---|---|---|
| `premise` | Premise | Logline and premise | Premise |
| `characters` | Characters | Characters | Characters |
| `relationships` | Relationships | Relationships | Relationships |
| `world` | World and settings | World and settings | World and settings |
| `factions` | | | Factions |
| `timeline` | Timeline and events | Timeline and events | Timeline and events |
| `plot` | Plot and structure | | Plot and structure |
| `structure` | | Structure | |
| `quests` | | | Quests |
| `choices` | | | Choices and branching |
| `mechanics` | | | Narrative and mechanics |
| `items` | | | Items and glossary |
| `themes` | Themes, motifs, and symbols | Themes, motifs, and symbols | Themes, motifs, and symbols |
| `voice` | Voice and style | Voice and format | Voice and dialogue conventions |
| `series` | Series continuity (series only) | Series continuity (series only) | Series continuity (series only) |

What each section covers is in the approved plan and `first-prompt/FLETCHERLING-PROMPT.md`. It's recorded in each section's data as the section is built.

### Characters (step 1 built 2026-10-30)

Each character is `characters/<slug>/<slug>.md`, its folder created with the entry. The name the writer gives is the frontmatter `title`; the slug comes from it. Renaming in the app moves the folder and the file together and updates `title`, so the folder stays readable for writers who work in it directly. A character entry may carry `silhouette: neutral | female | male` for its placeholder portrait. Pages have addresses: `#/premise`, `#/characters`, and `#/characters/<slug>`. Seed and Sketch have one prompt each, and the Sheet is a form of seventeen optional fields (more for screenplay and game), each with a short description, stored as `###` parts; Archetype is plain text such as `Sage, Trickster`. Empty fields are never counted or flagged.

### Entry depths (built 2026-10-30)

An entry's body holds up to three layers under `## Seed`, `## Sketch`, and `## Sheet` headings. A Sheet whose section data gives it its own `questions` is one box of free text, like Seed and Sketch (the Premise, decided 2026-10-30). A Sheet made of separate fields, as Characters will be, stores each field as a `###` subsection named by its label. Only layers with text are written. A body with no layer headings is read as the Seed, and text the app doesn't recognize is kept. Frontmatter `depth` is the deepest layer with text. Status is empty or draft from the text, and canon only by the writer. Editing a canon entry's text returns it to draft. (Renamed from "settled" on 2026-10-30: "canon" is the term writers use for established bible facts, and "final" would imply a fact never changes. Files with `status: settled` read as canon.)

## Web edition (decided 2026-10-30)

Fletchery also runs as a static web app, with no install and no server. Working detail and open questions are in `Sentinel-Notes/web-edition-design-brief.md`.

- **AI is a choice.** A writer can work without AI, or connect a provider: Claude Code on this computer (local edition), the Anthropic API (Claude, with an Anthropic key), the Google Gemini API (a key from Google AI Studio, added 2026-10-30), or OpenRouter (sign-in or key), which reaches OpenAI, Google, and other models. Choosing no AI shows plainly which features go away. The guided interview, depths, status, indexes, `BIBLE.md`, link suggestions, and the structural audit all work without AI.
- **Provider interface.** Each provider sits behind one adapter interface, so more can be added later (direct Gemini, local Ollama). Every AI response is validated against the expected proposal or draft format before anything is written, and a response that fails shows a clear message instead of producing a broken file.
- **Storage is a choice.** On this computer (a folder the writer picks), or Google Drive. The bible format is identical in both, and in the local edition.
- **Same rules for AI writing.** API-generated content follows the same rules as Claude Code: proposals for existing text, `author: ai-draft` for new entries, and nothing becomes canon without the writer.
- **Shared core.** Entry templates, index and `BIBLE.md` generation, link handling, and the audit live in browser-side modules behind one storage interface. The local server becomes one storage backend among several.
- **Shared core, first step (built 2026-10-30).** The local server is now a plain file store with a version check on every change. Frontmatter parsing, serialization, and new-entry rules live in `public/js/core/entry.js`, which runs in the browser and in Node through an import map that points the bare name `yaml` at the package's browser build. The page validates and writes `fletchery.json` itself.
- **Network.** The web edition contacts Google only when Drive storage is chosen, and an AI provider only when one is connected. Fonts stay self-hosted, and nothing else leaves the browser.
- **Out of scope:** GitHub storage.
- **Both editions stay (decided 2026-10-30).** The web edition doesn't replace the local edition. Every user-facing description of Fletchery (README, first-run screens, settings, any landing page) explains what each edition and each choice gives and costs, so writers can pick knowingly. The comparison to draw from is in the web edition brief, under "Edition comparison". It's written plainly, per the style rules, as information rather than promotion.

## Defaults adopted for ambiguities in the prompt

Each of these is a default. Any of them can be changed during plan review.

1. **AI writing versus "never overwrites."** The `fletchery-process` skill writes results back to the bible, but the AI never overwrites writer text. Default: the AI may create a new entry, or fill an empty one, directly as `author: ai-draft`. Any change to existing text goes through a proposal.
2. **Canon.** Depth and status are independent. Marking an entry as canon sets `status: canon` (originally `settled`). If the entry was `ai-draft`, it also sets `author: ai-reviewed`. A writer edit alone doesn't change `author`.
3. **Character depths.** Seed is the one-sentence storyline and Sketch is the one-paragraph storyline. Sheet is the full field list. The same pattern applies to other per-item entries: Seed and Sketch are their one-line and one-paragraph summaries.
4. **Depth scope.** Depth levels apply to section entries only. Notes have no depth, as the prompt says.
5. **World images.** World's single documents (culture, history, rules) share `world/images/`. Each location keeps its images in its own folder.
6. **Timeline.** Each event has its own folder. Character timelines are generated views built from events, not separate files. Relevant history is one document, `timeline/history.md`.
7. **Scenes.** The scene list is one document, `plot/scenes.md`, with one line per scene. Per-scene files are out of scope.
8. **Generated indexes when the app isn't running.** Claude Code may edit the bible while Fletchery is closed. Default: index generation is also available as a command (`fletchery index`), and the skills run it after they change files. `BIBLE.md` tells the AI not to edit `index.md` files by hand.
9. **Saving.** The browser saves about 500 ms after typing stops, and on blur. Each save carries the version the browser last loaded. If the file changed on disk since then, the server refuses the write and the page shows both versions and asks which to keep.
10. **Story type.** It's asked once, but it can be changed later in settings, with a warning. Changing it never deletes files.
11. **Writer's settings** (changed 2026-10-30). The writer's settings live in `story-bible/fletchery-settings.json`, never in browser storage, and are edited in a Settings panel opened from the header. That file holds the author and co-authors (as credited, so a pen name works), the interface font (Source Sans 3 or Atkinson Hyperlegible), the writing font, how pastes are handled, the fade options, and layout choices such as the last question layout and the folded section list. `fletchery.json` keeps the bible's own record (story type, title, skips). A `font` left in an older `fletchery.json` is read once as the starting interface font. Each story keeps its own settings. API keys never go in a story folder, because story folders get synced, shared, uploaded, or committed (some are git repos, many aren't): they live in `fletchery-api.json` in the per-user config folder (`%APPDATA%\Fletchery\` on Windows, `~/Library/Application Support/Fletchery/` on macOS, `$XDG_CONFIG_HOME/fletchery/` or `~/.config/fletchery/` on Linux), readable only by the user, and only the local server touches them.
12. **Fonts and the network.** Fonts come from `@fontsource` at `npm install` time and are served locally. The local edition makes no external requests. The web edition's exceptions are listed above.
