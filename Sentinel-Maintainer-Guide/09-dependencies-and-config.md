# Dependencies and configuration

## Runtime

Node 20 or later (`engines` in `package.json`); developed on Node 25.2 on Windows 11. No framework. The server uses `node:http`, `fs`, `path`, `crypto`, and `child_process` (to open the browser).

## npm dependencies

| Package | Purpose | What breaks if it changes |
|---|---|---|
| `yaml` | Frontmatter parsing and serialization in `entry.js`. Node loads it from `node_modules`; the browser loads its prebuilt browser build, served from `node_modules/yaml/browser/dist` at `/vendor/yaml/`. | A new major version may move the browser build path, which `YAML_DIR` in `server.js` and the import map in `index.html` assume. Its output formatting affects how frontmatter is written. |
| `@fontsource/source-sans-3` | Interface font | Font file names are matched by name in `serveStatic` |
| `@fontsource/atkinson-hyperlegible` | The accessible interface font option | Same |
| `@fontsource/literata` | The serif for the writer's own text | Same |

Fonts are served from `node_modules/@fontsource/<name>/files` at `/fonts/<file>`. The `@font-face` rules are in `public/css/tokens.css`. The local edition makes no external requests.

Dev tooling: none. The gate hooks are installed by the `prepare` script. A Playwright connection is used by agents for browser checks and is not a project dependency.

## Command line

`fletchery [--port <number>] [--no-open]`. The default start port is 3000; if taken, the server tries up to 50 higher ports and prints the one it used. `--port=<n>` also works. `--help` and `-h` print usage. Unknown options exit with an error. The bible is always `./story-bible/` under the current directory.

## Environment variables

The app reads none. `CLAUDE_PROJECT_DIR` is read only by `sentinel-gate/session-start.js`.

## Configuration files

| File | Purpose |
|---|---|
| `story-bible/fletchery.json` | The bible record. See `05-state-and-data.md`. |
| `story-bible/fletchery-settings.json` | The writer's settings. See `05-state-and-data.md`. |
| `sections/<type>.json` | Section definitions. Top-level keys: `storyType`, `sections`, `areas`. A section has `id`, `title`, and for built sections `built`, `file` or `many` and `folder`, `descriptionFrom`, `why`, and `depths` (`seed`, `sketch`, `sheet`, each with `label`, `guide`, `questions` or `fields`, and optionally `form: true`). Optional `onlyFor: "series"`. `areas` holds Notes and media. |
| `package.json` | Name, version, `bin` (`fletchery`), `engines`, scripts. |
| `.claude/settings.json` | Runs `sentinel-gate/session-start.js` at session start. |
| `.gitattributes` | `* text=auto`, with LF forced for `sentinel-gate/hooks/*`. LF-to-CRLF warnings on Windows are expected. |
| `sentinel-gate/*.json`, `known-extensions.txt` | Gate configuration. Not covered here. |

Planned and not present: an API keys file in the per-user config folder (`fletchery-api.json`), described in `docs/SPEC.md`. API keys must never go in a story folder.

## Section data fields in use

- `kind` on a Sheet field: `short` or `archetype` (with `options`). Other fields have no `kind`.
- `form: true` on `depths.sheet` shows every field at once with its description (Characters). Without it, a Sheet of fields shows one question at a time.
- `descriptionFrom` names the layer whose first line becomes the entry's `description`.
