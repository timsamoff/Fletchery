# Project profile: Fletchery

Produced by Sentinel `00-project-discovery.md`, version 1.7.1, on 2026-11-02. This is an update run over the 1.6.1 profile of 2026-10-29.

The app was renamed from Fletcherling to Fletchery on 2026-10-30. Dated records (the design audit report, early commits) keep the old name.

## Run type

- **Sentinel version:** 1.7.1 (installed and GitHub agree, so no update offered).
- **Run:** update run, from 1.6.1.
- **Blank-project run:** no.
- **Quality gate re-validation:** a quality gate exists (`sentinel-gate/`, hooks `commit-msg` and `pre-push`, wired through `core.hooksPath`). It was built after the 1.6.1 profile, so it should already reflect 1.7.x, but `03` has not re-checked it against 1.7.1. Items to confirm there: the trailer allowlist (present: `ALLOWED_TRAILERS`), the version-check in the session-start hook (present: `session-start.js` mentions version), and the guide-change check (not applicable, since no maintainer guide exists).
- **Renamed conventions:** none left. `Sentinel-Notes/` is correctly spelled and tracked; no `production_notes/` folder remains.
- **Leftover renamed prompt files:** none (`03-gate-check-implementation.md` is not present).
- **Maintainer guide:** Full guide, tracked, last verified 2026-11-02 at 0996626. Folder `Sentinel-Maintainer-Guide/`. Check strictness: reminder. `INTEGRATION_CHECKLIST.md` has the proposed check; `03` has not built it yet.
Maintainer guide: full, tracked, last verified 2026-11-02 at 0996626
- **Skipped update:** none recorded.

## Agent and environment

- **AI coding agent:** Claude Code (VS Code extension, Windows 11).
- **Project context file:** `CLAUDE.md`. Now tracked in git (changed since 1.6.1, when it was gitignored).
- **Permission mechanism:** `.claude/settings.json` (tracked). It holds the SessionStart hook that runs `sentinel-gate/session-start.js`.

## Values for `[PROJECT-SPECIFIC]` brackets

- **Project name:** Fletchery (confirmed earlier; matches the `README.md` title and `package.json` `name`).
- **Tech stack:** JavaScript (ES modules) on Node 20+. Server uses Node's built-in `http` and `fs`, no framework. Front end is plain HTML, CSS, and JavaScript with no build step yet (one is allowed by `docs/SPEC.md`). Package manager: npm. Dependencies: `@fontsource/source-sans-3`, `@fontsource/atkinson-hyperlegible`, `@fontsource/literata`, `yaml`. Entry logic in `public/js/core/` runs in both browser and Node.
- **Application surfaces:**
  1. The local web app: CLI launcher (`bin/fletchery.js`), server (`server/`: `server.js`, `bible.js`, `watch.js`), and browser front end (`public/`: `index.html`, `js/app.js`, `js/settings.js`, `js/core/`, `css/`). One surface; the folders share one process and one API.
  2. The quality gate (`sentinel-gate/`): tooling for the repo, not part of the product.
  - Planned, not built: Claude Code skills and an install script; the web edition (see `Sentinel-Notes/web-edition-design-brief.md`).
- **Design/token system file:** `public/css/tokens.css` (palette, type, rhythm, spacing); `public/css/base.css` consumes it.
- **Recurring unit of work:** a bible section (confirmed earlier). Section data files live in `sections/` (`prose.json`, `game.json`, `screenplay.json`). `INTEGRATION_CHECKLIST.md` lists the touchpoints.
- **Existing design document:** `DESIGN.md` (architecture overview). `docs/SPEC.md` holds the decisions and wins over the brief. Also `docs/premise-end-to-end-design-brief.md`. The original brief, `first-prompt/FLETCHERLING-PROMPT.md`, is gitignored on purpose.

## VCS and release

- **VCS:** git. 109 commits, 1 author (Tim Samoff), 2026-10-29 to 2026-10-31. Branch `main`, in sync with `origin/main`. Working tree clean.
- **Remote:** `https://github.com/timsamoff/Fletchery.git`, public.
- **Commit-message convention:** single-line subjects in plain sentence form, no prefixes, bodies rare. Recorded in `CLAUDE.md` under Commits, including the one allowed trailer (`Sentinel-Override`, written only by Tim) and the agent-voice ban.
- **Version/release status:** `package.json` version `0.1.0`; no tags or releases. Pre-release, in active build (Characters step 2 of 5 done).

## Existing automation

- **Git hooks:** `core.hooksPath` is `sentinel-gate/hooks`, with `commit-msg` and `pre-push`. Installed by `npm install` (`prepare`) or `npm run sentinel:install`.
- **Gate logic:** `sentinel-gate/check.js`, with `baseline.json`, `exceptions.json` (empty), `known-extensions.txt`, `readme-map.json`, and `spec-review.json` (in `Sentinel-Notes/`).
- **npm scripts:** `sentinel:install`, `sentinel:full`, `sentinel:report`, `sentinel:spec-reviewed`.
- **Session-start hook:** yes, tracked in `.claude/settings.json`, as the remote-session answer requires.
- **CI:** none.
- **Pre-existing, non-Sentinel gate:** none. All of the above is Sentinel's own.
- **Tests:** none automated. Verification is manual browser runs (Playwright) plus Tim's own testing.

## Existing docs and scaffolding

| Item | Present |
|---|---|
| `CLAUDE.md` (the `AGENTS.md` equivalent) | yes, tracked |
| `README.md` | yes |
| `LICENSE` | yes, MIT, matches `package.json` |
| `.gitignore` | yes |
| `Sentinel-Notes/` | yes, tracked (`TODO.md`, `HANDOFF.md`, design briefs, `archive/`) |
| `scratch/` | yes, gitignored |
| `Sentinel-Prompts/` | yes, gitignored |
| `Sentinel-Maintainer-Guide/` | yes, tracked (14 files) |

## Session conventions (recorded in `CLAUDE.md`)

- Remote sessions: yes. `CLAUDE.md` and `Sentinel-Notes/` are tracked for that reason.
- Handoff: `Sentinel-Notes/HANDOFF.md`, with a full rewrite rule and a close-out section in `CLAUDE.md`.

## Flagged for follow-up

- **Stale 1.6.1 flags resolved.** `first-prompt/` and `Sentinel-Prompts/` are now gitignored; `CLAUDE.md` and `Sentinel-Notes/` are now tracked; the unpushed commit is pushed. `.gitattributes` still uses `* text=auto` (with LF forced for the hook scripts), so LF-to-CRLF warnings on Windows are expected and harmless.
- **No automated tests.** Already tracked as TODO item T1 (conflict detection, path guard, frontmatter completeness in `server/`). The portable `public/js/core/` modules are another good candidate.

## How to use this

When running `01-design-quality-audit.md` or `02-integration-audit.md`, fill their `[PROJECT-SPECIFIC]` brackets from the values above instead of re-detecting. `03-quality-gate-implementation.md` should reuse "Existing automation": the gate exists, so `03` re-validates it rather than building from scratch.

Next step: this project is well past a fresh start, and the audit (`Sentinel-Notes/design-quality-audit.md`), integration work, and gate have all run once. The specific follow-up from this update is to run `03-quality-gate-implementation.md` to re-validate the existing gate against 1.7.1. Re-running `01` and `02` is only worth it if Tim wants a fresh audit after the Characters work; nothing in the 1.6.1 to 1.7.1 history requires it. `04-maintainer-guide.md` is optional and only runs on request.
