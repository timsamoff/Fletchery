# Fletchery maintainer guide

This guide is for a developer who has not seen this code. It records what Fletchery is, how it is built, where to change things, and what to watch for. The code wins wherever the guide and the code disagree. Fix the guide.

Anything marked `[UNVERIFIED]` was inferred from reading the code, not confirmed by running it.

## Files

| File | What it holds |
|---|---|
| `01-architecture.md` | Scope, current state, structure, and data flow |
| `02-glossary.md` | Domain terms and the identifiers that carry them |
| `03-where-to-change.md` | A task-indexed map: to do X, edit Y |
| `04-key-code-reference.md` | Important functions, classes, and constants |
| `05-state-and-data.md` | Where state lives, file formats, and the version scheme |
| `06-invariants.md` | Rules the code relies on, enforced or not |
| `07-decisions.md` | Decisions with reasons and rejected alternatives |
| `08-fragile-zones-and-debt.md` | Hard-to-change code, workarounds, and known issues |
| `09-dependencies-and-config.md` | Libraries, flags, and configuration files |
| `10-recipes.md` | Step-by-step procedures for common edits |
| `11-build-run-test.md` | Commands to run, test, and debug |
| `12-verification-checklists.md` | Manual steps that confirm each feature works |
| `CHANGELOG-human.md` | Progress log, newest first |

Other documents hold their own kinds of record, and this guide links to them instead of copying:

- `DESIGN.md`: the architecture overview, including the planned web edition and skills.
- `docs/SPEC.md`: decisions and their reasons. It wins over the original brief.
- `CLAUDE.md`: working conventions for agents, and design rules (colors, rhythm, motion).
- `INTEGRATION_CHECKLIST.md`: the touchpoints for adding a section, and how the quality gate checks them.
- `Sentinel-Notes/TODO.md`: the backlog.

## Coverage map

| Area | Paths | Coverage |
|---|---|---|
| Launcher | `bin/` | Covered |
| File server | `server/` | Covered |
| Browser app | `public/index.html`, `public/js/app.js`, `public/js/settings.js` | Covered |
| Shared core | `public/js/core/` | Covered |
| Styles | `public/css/` | Covered at the level of structure and rules, not every selector |
| Section data | `sections/` | Covered |
| Package config | `package.json` | Covered |
| Quality gate | `sentinel-gate/` | Not covered. See `INTEGRATION_CHECKLIST.md` and `CLAUDE.md`. |
| Planned work | web edition, Claude Code skills, request queue, other views | Not built. `DESIGN.md` describes the plan. |

## Update rule

Any change that adds, removes, renames, or moves a module, public function, state field, config option, dependency, or domain term, or changes what a documented thing does, updates the matching part of this guide in the same commit. Add or update the session's entry in `CHANGELOG-human.md` as well. The rule applies to the covered areas above.

To re-check the guide against the code, run `Sentinel-Prompts/04-maintainer-guide.md` and choose verify.

## Last verification

Written 2026-11-02 from commit `0996626`. Every path, identifier, and command was checked against the code on that date, except the items marked `[UNVERIFIED]`.
