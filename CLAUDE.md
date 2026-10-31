# Fletchery

Local web app that walks a writer through building a Story Bible, saved as Markdown and images in `./story-bible/` inside a story project.

This file and `Sentinel-Notes/` are committed to the public repo by deliberate choice, so remote sessions get the same context.

## Project

- Renamed from Fletcherling on 2026-10-30. The GitHub repo is now `timsamoff/Fletchery`, and the local folder is `Documents/Fletchery`. Dated records (the design audit report, commit history) keep the old name.
- Brief: `first-prompt/FLETCHERLING-PROMPT.md`, deliberately kept out of git (gitignored, never committed). Remote sessions can't see it; `docs/SPEC.md` carries the decisions they need. Decisions: `docs/SPEC.md`, which wins where the two differ. Architecture overview: `DESIGN.md`.
- Approved plan: `C:\Users\Tim\.claude\plans\bubbly-enchanting-trinket.md` (outside the repo; see TODO Doc1).
- Backlog: `Sentinel-Notes/TODO.md`. Project profile: `PROJECT_PROFILE.md`.
- Stop after each phase for Tim's review. Test in a real browser before saying anything works.
- Load the tim-writing-style skill before writing UI copy or docs.
- Stack: Node `http`, plain HTML/CSS/JS, no build step yet (one is allowed; see `docs/SPEC.md`). Launch with `fletchery` from a story project.
- Tim keeps stories in `Documents/_Writing/<story>/`, each its own private git repo, and runs `fletchery` from inside the story folder. App code and story data never mix.
- Entry logic lives in `public/js/core/` and must run in both the browser and Node: import only the bare name `yaml` and relative paths there, never browser globals at module level. The server is a file store and knows nothing about entries.
- Entry bodies hold `## Seed`, `## Sketch`, and `## Sheet` layers (`public/js/core/layers.js`). A Sheet whose section data has its own `questions` (the Premise) is one box of free text; a Sheet of `fields` stores each as a `###` part, and `form: true` shows them all at once with descriptions (Characters) instead of one question at a time. A depth with a single prompt shows just that prompt, with no guide line, tabs, or numbers. Characters live at `characters/<slug>/<slug>.md`; rename through the app (it moves the folder and file together). Premise questions are built around change and its consequences, not the Snowflake Method's disasters, so they fit stories without a central conflict (Tim's choice). Never drop text the parser doesn't recognize. Frontmatter `depth` and the empty and draft statuses follow the text; only the writer marks an entry as canon (`status: canon`, read from the older `settled` too).
- The writer's settings live in `story-bible/fletchery-settings.json` through `public/js/settings.js`, separate from the bible's own `fletchery.json`. Never keep settings or preferences in browser storage. Don't assume a story folder is a git repo: Tim's are, but other writers' may be synced folders, downloads from the web edition, or Google Drive.
- Write one-off verification scripts to `scratch/` (gitignored), not the OS temp folder. Playwright saves to `.playwright-mcp/` (gitignored).

## Design rules

- Colors: icon colors only, on cream. No white or light text on cream. Light text is allowed on charcoal and spine when contrast passes. Tokens live in `public/css/tokens.css`. Contrast on cream `#F1ECE2`: charcoal 11.74:1, mid charcoal 8.98:1, orange 3.04:1. Spine charcoal on orange is 4.61:1. Orange never carries small text. It's for button fills, focus rings, borders, status marks, link underlines, and large text.
- Rhythm: 8px base unit, 4px baseline, 28px body line. Every vertical size is a multiple of 4, and blocks take whole 28px lines where possible. The 84px header is 82px plus a 2px border, and `main` has two lines of top padding, so content starts on a line. Text fields are 28px plus 12px padding plus a 2px border on each side, which comes to 40px for inputs and one extra line for text areas.
- Motion: a modern, fluid feel is a global aesthetic choice. Err on the side of animation for most things (opening, closing, moving, and state changes), short (150-300ms) and eased: indicators glide, content slides in the direction of travel, heights ease, lists stagger in, swapped text cross-fades. Always honor `prefers-reduced-motion`; scripted animations go through `animate()` in `app.js`, which does. Tim may change or remove individual animations.
- Breakpoint: 720px, repeated in two media queries because CSS custom properties can't be used there.

## Working conventions

- **Comments:** one or two sentences at most, saying what the code is for or why. Longer background, history, or reasoning goes here, or into `docs/SPEC.md` if it's an architectural decision.
- **Documentation routing:** a tracked, unresolved inconsistency goes to `Sentinel-Notes/TODO.md` (plus a one-line pointer here if it could be mistaken for convention). A settled operational convention goes here. A settled architectural decision goes in `docs/SPEC.md`, and `DESIGN.md` changes whenever the decision changes how the parts fit together. Anything an external user needs goes in the README. A declined suggestion is either "not now" (TODO) or a settled rejection (here or SPEC.md, with the reason).
- **TODO items:** one line each, and anything longer gets `Sentinel-Notes/<issue>-design-brief.md`. Move a finished item's line to the Done section at the bottom. Move a finished item's brief to `Sentinel-Notes/archive/`. Updating `TODO.md` is part of finishing the work, not a follow-up.
- **After finishing a TODO item:** name the item most worth doing next with a reason, then start on it unless Tim redirects. TODO items carry no priority, effort, or dependency data, so the pick is judgment from the item text, and should be stated that way. If two are close, name both with a one-line reason each, then proceed on the stronger.
- **Backlog mention:** when any distinct task reaches a natural stopping point, check whether `Sentinel-Notes/TODO.md` has open items not touched or acknowledged since the task started, and if so, name the strongest candidate before ending the response. Skip this if the backlog was already surfaced this session and nothing changed.
- **Commits:** a single-line subject is the norm. A body of a few one-sentence bullets is allowed only when one coherent change has three or more separate parts, or changes behavior someone reading history later needs to know about. Unrelated changes get split into separate commits, not bulleted. One commit per session by default, more only when the work is large. Messages describe the change in Tim's own voice and never mention the agent, the session, or "the user." No co-author lines, tool attribution, or session links. The only allowed trailer is `Sentinel-Override: <reason>`, and only Tim writes it: if a check blocks my commit, I split it or ask, and never add the override myself.
- **Commit autonomy:** commit on my own once the hooks pass, at sensible points (one commit per session by default). Ask Tim before every push, except the handoff file below.
- **Adding a bible section:** follow the section touchpoints in `INTEGRATION_CHECKLIST.md`. Adding a section also updates `docs/SPEC.md` (its section lists) and `sentinel-gate/readme-map.json`. Section data files keep the shape `{ "sections": [{ "id": ... }] }` (or a top-level array of `{ id }`), because the gate reads section ids from it.
- **Quality gate:** `sentinel-gate/` holds the `commit-msg` and `pre-push` hooks, turned on by `npm install` or `npm run sentinel:install`. Never bypass them with `--no-verify`. When a commit is blocked, fix the cause or split the commit. Standing exceptions go in `sentinel-gate/exceptions.json`, and only Tim adds them. `npm run sentinel:full` runs the blocking full scan by hand. `npm run sentinel:report` lists everything, including the baselined backlog.
- **New file type:** when the gate's `new-file-type` check fires, ask Tim its three questions (what the file is, whether it needs the design audit's creative-media check, whether it needs an integration touchpoint), route the answers as it says, then commit again with `sentinel-gate/known-extensions.txt` staged.
- **SPEC review:** when the full scan reminds you, reread `docs/SPEC.md` against the code, raise any drift with Tim, then run `npm run sentinel:spec-reviewed`.
- **Session-start hook:** `.claude/settings.json` runs `sentinel-gate/session-start.js`, which prints the handoff if one exists and checks weekly for a newer Sentinel. The read-order note below still applies when the hook doesn't run.

## Sessions

- **Remote sessions:** Tim sometimes works away from this machine. This file and `Sentinel-Notes/` are committed so remote sessions see them.
- **Read order at session start:** before answering the first message, whatever it is, read `Sentinel-Notes/HANDOFF.md` if it exists, then the open items in `Sentinel-Notes/TODO.md`. If a handoff exists, say briefly what it describes before starting anything else. Check it against `git status`, and say so if there are uncommitted changes it doesn't account for.
- **Handoff:** `Sentinel-Notes/HANDOFF.md`, replacing any earlier version, under one page. Write it when work stops unfinished: Tim wraps up, a usage or context limit approaches, or a task is left partway. Rewrite it whenever the state of unfinished work changes (a step finishes, the plan changes, an attempt fails), so an abrupt end leaves it at most one step behind. Clear it once the work it describes is done. Contents:
  1. Current task and its status
  2. Files touched, with a one-line note on each change
  3. Next step, specific enough to start without re-reading the chat
  4. Open questions or decisions waiting on Tim
  5. Anything tried that failed, so it is not repeated
- **Usage limits (from Tim's global CLAUDE.md, word for word):**
  - Before starting a large task, read the file. If either figure is above 90%, tell me before you begin.
  - If a hook message or a usable file shows either figure at 95% or higher, stop and write the handoff file before doing anything else.
  - Do not start new work after writing the handoff. Tell me it is written and wait.
  - (The file is `~/.claude/usage.json`: usable only if `updated_at` is within 15 minutes and the reset time hasn't passed. In VS Code it's usually missing, which is expected.)
- **Close-out:** run whenever the handoff is written and whenever a distinct task finishes.
  1. Rewrite or clear `Sentinel-Notes/HANDOFF.md`.
  2. Update `Sentinel-Notes/TODO.md` to match what was done.
  3. Commit and push `Sentinel-Notes/HANDOFF.md` alone when it changes. Tim has approved this one without asking. Every other commit or push still needs his OK.
  4. End with one line saying what was done and what was skipped, and why.
