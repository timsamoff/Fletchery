# Project profile: Fletcherling

Produced by Sentinel `00-project-discovery.md`, version 1.6.1, on 2026-10-29.

## Run type

- **Sentinel version:** 1.6.1 (checked against GitHub: current).
- **Run:** fresh run. No earlier `PROJECT_PROFILE.md` existed, so there is no existing quality gate to re-validate.
- **Blank-project run:** no. The project is small (2 commits, skeleton phase), but it has a manifest, real source files, and a working app. Nothing was deferred for blankness.
- **Renamed conventions:** a pre-1.0 `production_notes/` folder existed. The user chose to rename it, and it is now `Sentinel-Notes/` (holding `todo.md`). `.gitignore` and `CLAUDE.md` were updated to the new name.
- **Leftover renamed prompt files:** none (`03-gate-check-implementation.md` is not present).

## Agent and environment

- **AI coding agent:** Claude Code (VS Code extension, Windows 11).
- **Project context file:** `CLAUDE.md` (this project's name for `AGENTS.md`). It exists at the root and is gitignored by the user's choice.
- **Permission mechanism:** `.claude/settings.json` (project) or `.claude/settings.local.json`. Neither exists yet.

## Values for `[PROJECT-SPECIFIC]` brackets

- **Project name:** Fletcherling (confirmed by the user; matches `README.md` title and `package.json` `name`).
- **Tech stack:** JavaScript (ES modules) on Node 20+ (developed on Node 25.2). Server uses Node's built-in `http`, `fs`, and recursive `fs.watch`; no framework. Front end is plain HTML, CSS, and JavaScript with no build step. Package manager: npm (`package.json`, `package-lock.json`). Dependencies: `@fontsource/source-sans-3`, `@fontsource/atkinson-hyperlegible`, `yaml`.
- **Application surfaces:**
  1. The local web app: CLI launcher (`bin/fletcherling.js`), server (`server/`), and browser front end (`public/`). One surface; the three folders share one process and one API.
  - Planned, not yet built: Claude Code skills (`skills/`) and an install script (`scripts/`). These will be a second surface that reads the same bible format but shares no code with the app.
- **Design/token system file:** `public/css/tokens.css` (CSS custom properties for palette, type, rhythm, and spacing; `public/css/base.css` consumes them).
- **Recurring unit of work:** a bible section (confirmed by the user). Adding one touches its data file in `sections/`, the section page, server read and write, generated indexes, `BIBLE.md`, and the skills.
- **Existing design document:** `DESIGN.md` (architecture overview, added 2026-10-30). `docs/SPEC.md` holds the agreed decisions and wins over the brief. Supporting: `first-prompt/FLETCHERLING-PROMPT.md` (the original brief, untracked) and the approved plan at `C:\Users\Tim\.claude\plans\bubbly-enchanting-trinket.md` (outside the repo).

## VCS and release

- **VCS:** git. 2 commits, 1 author (Tim Samoff). Branch `main`, 1 commit ahead of `origin/main` (not pushed).
- **Remote:** `https://github.com/timsamoff/Fletcherling.git`, **public**.
- **Commit-message convention detected:** single-line subjects, no bodies, no prefixes (both commits). This matches the user's global preference: single-line summaries by default, a few single-sentence bullets only when genuinely needed, no co-author trailers.
- **Version/release status:** `package.json` version `0.1.0`; no tags or releases. Pre-release.

## Existing automation

- Git hooks: none (only samples; `core.hooksPath` unset).
- CI: none.
- npm scripts: none.
- Pre-commit framework: none.
- No existing quality-gate or enforcement system.
- Testing so far is manual: Playwright-driven browser checks during development, plus the user's own testing.

## Existing docs and scaffolding

| Item | Present |
|---|---|
| `AGENTS.md` / `CLAUDE.md` | `CLAUDE.md` yes (gitignored) |
| `README.md` | yes (two lines; full README is Phase 8 of the build) |
| `LICENSE` | yes, MIT, matches `package.json` |
| `.gitignore` | yes |
| `Sentinel-Notes/` | yes (renamed this run; gitignored) |
| `scratch/` | no |

## Flagged for follow-up

- **Public repo and untracked folders.** `first-prompt/` (the brief) and `Sentinel-Prompts/` are untracked and not ignored, so a careless `git add .` would publish them. Decide whether each should be tracked, ignored, or kept as is.
- **Gitignored context in a public repo.** `CLAUDE.md` and `Sentinel-Notes/` are gitignored. That keeps them private, but a remote or cloud session would not see either. Relevant to the remote-session question in `01`, Part 11.
- **No automated tests.** Verification depends on manual browser runs. The conflict-detection and path-guard logic in `server/` are the parts most worth covering first.
- **`.gitattributes` uses `* text=auto`.** Every commit on Windows prints LF-to-CRLF warnings. Harmless for now; noted so it isn't mistaken for a problem later.
- **Unpushed commit.** `main` is 1 ahead of `origin/main`.

## How to use this

When running `01-design-quality-audit.md` or `02-integration-audit.md`, fill their `[PROJECT-SPECIFIC]` brackets from the values above instead of re-detecting. `03-quality-gate-implementation.md` can reuse the "Existing automation" section: there is none, so it builds from scratch.

Next step: run the Design & Code Quality Audit (`01-design-quality-audit.md`).
