# Handoff

Written 2026-10-30 for the first session after Tim renames the local folder (`Documents/Fletcherling`, probably to `Documents/Fletchery`). Everything is committed and pushed through `17acc0d`.

## 1. Current task and status

- **The app is Fletchery.** It was renamed from Fletcherling on 2026-10-30. The command is `fletchery`, and the GitHub repo is `timsamoff/Fletchery`. Only the local folder still had the old name when this was written.
- **Fresh session:** Claude Code keys project memory and settings to the folder path, so this session starts without the previous conversation. Nothing was lost: the project memory folder was empty, and every decision lives in the repo (CLAUDE.md, `docs/SPEC.md`, `DESIGN.md`, `Sentinel-Notes/`). The approved plan is outside the repo, at `C:\Users\Tim\.claude\plans\bubbly-enchanting-trinket.md`, and doesn't depend on the folder name.
- **Build status:** Premise end to end is **built and waiting on Tim's review**. That includes the shared core, depths, Interview and Full form, canon status, Skip, and the section list. Tim is also sending edits to the Premise question set.

## 2. Files touched

None since the last commit. This handoff only.

## 3. Next steps, in order

1. **Relink the command.** From the new folder, run `npm link`, then `fletchery --help`. If `fletchery` still points at the old path, run `npm unlink -g fletchery` first, then link again.
2. **Check the quality gate.** Run `git config --get core.hooksPath`, which should print `sentinel-gate/hooks`. It's a relative path stored in `.git`, so it should survive the rename. Then run `npm run sentinel:full`, which should pass with 14 known backlog items.
3. **Confirm the session hook.** If this session started by showing this handoff, it works from the new path. If not, check `.claude/settings.json` (it uses `$CLAUDE_PROJECT_DIR`).
4. **Update the old folder path in the docs.** It appears in CLAUDE.md (`Documents/Fletcherling`, in the Project section), `docs/SPEC.md` (the Environment section and the Name section), and `PROJECT_PROFILE.md`. Find them with `git grep -n "Documents.Fletcherling"`. `first-prompt/FLETCHERLING-PROMPT.md` is Tim's brief and keeps its name.
5. **Then the build work:** ask Tim for his Premise review and question edits. Question edits go in `sections/*.json` with no code changes.

## 4. Open questions for Tim

- **Premise:** review, and edits to the question set.
- **What next after Premise:** Characters (images, media library, relationships, indexes), or more of the web edition's shared core. Ask which.
- **Layout views brief:** which views, one file per scene or not, and whether to prototype the drag and drop first.
- **Web edition brief:** hosting, a Claude Code option in local-folder mode, build order, and Drive for desktop.
- **G1:** should the spec gate also require DESIGN.md?

## 5. Tried and failed

- **Stopping test servers:** port tables (netstat, Get-NetTCPConnection) are unreliable on this machine. Stop a test server by command line: `Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -match 'fletchery' }`, then `Stop-Process`, then confirm with a request to the port.
- **Session hook:** `fetch()` followed by `process.exit()` crashed Node on Windows, so the hook uses `node:https`.
- **YAML import:** the `yaml` browser build has no default export. Import `parse` and `stringify` by name.
- **Button-styled links:** inline `<button>` elements sit on the text baseline and add a pixel. Use `display: block`.
- **Bulk edits with backslashes:** bulk renames with `sed` through Git Bash mishandle backslash paths. Use a small Node script in `scratch/` instead.
- **Brief edits and the gate:** wording-only edits to a design brief trip the gate's `todo-sync` check. Tim's choice is to note the change on the brief's TODO line, keeping the line at or under 200 characters.
