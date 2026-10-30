# Fletcherling architecture

This document describes how Fletcherling is built and how its parts fit together. Decisions and their reasons are recorded in `docs/SPEC.md`. Working conventions for agents are in `CLAUDE.md`.

## Overview

Fletcherling walks a writer through building a Story Bible: a directory of Markdown files with YAML frontmatter, plus images and their metadata sidecars. The directory is the product. A later AI-assisted writing session reads it as the source of truth for the story, so the app never stores anything a plain text editor couldn't read.

Fletcherling runs in two editions that share one front end and one file format:

- **Local edition:** a small Node server launched with `fletcherling` from inside a story project. It reads and writes `./story-bible/`, watches it for outside edits, and uses Claude Code as its AI through a request queue.
- **Web edition (planned):** the same front end served as static files. Storage is a folder the writer picks or Google Drive, and AI is optional, through an Anthropic or OpenRouter connection.

## Current structure

As of the skeleton phase:

| Path | Role |
|---|---|
| `bin/fletcherling.js` | Launcher. Parses `--port` and `--no-open`, finds a free port from 3000, starts the server, and opens the browser at `127.0.0.1`. |
| `server/server.js` | HTTP server: static files, fonts from `node_modules/@fontsource`, the JSON API, and server-sent events. |
| `server/bible.js` | File access inside `story-bible/`: the path guard, atomic writes, content hashing, and frontmatter parsing and serialization. |
| `server/watch.js` | Recursive `fs.watch` on the bible. It reports a change only when a file's content hash differs from the last one seen or written. |
| `public/index.html` | Page shell: skip link, header, `main`, and footer with the save-status live region. |
| `public/js/app.js` | First-run setup and the entry editor: autosave, live updates, and the conflict panel. |
| `public/css/tokens.css` | Every color, type size, rhythm, and spacing value, plus the `@font-face` rules. |
| `public/css/base.css` | Layout and components, built only from tokens. |
| `sentinel-gate/` | The quality gate: `commit-msg` and `pre-push` hooks and the session-start hook. See `INTEGRATION_CHECKLIST.md`. |

### API

| Route | Purpose |
|---|---|
| `GET /api/project` | Project folder, bible folder, and settings from `story-bible/fletcherling.json` (null before setup). |
| `POST /api/setup` | Writes `fletcherling.json` and the first premise entry, then starts the watcher. |
| `GET /api/entry?path=` | Returns an entry's frontmatter, body, and content hash. |
| `PUT /api/entry` | Saves a body only if the file's current hash matches `baseHash`. Otherwise returns 409 with the version on disk. |
| `GET /api/events` | Server-sent events, one `change` event per real content change. |

### Saving and conflicts

The page keeps the hash of the version it loaded. It saves about 500 ms after typing stops, and on blur, sending that hash as `baseHash`. The server writes only if the file on disk still has that hash. Writes go to a temp file in the same folder, which is then renamed over the target, so another program never reads a half-written file.

When the watcher reports a change to the open file, the page reloads it if nothing is unsaved. If there are unsaved edits, it shows both versions and asks the writer which to keep. The server records the hash of each file it writes, so its own saves never come back as outside changes.

### Security

The server binds to `127.0.0.1` only. It rejects any request whose `Host` header isn't `127.0.0.1:<port>` or `localhost:<port>`, which blocks DNS rebinding. It also rejects any write whose `Origin` is a different site, so no other web page can write into the bible. Every API path must resolve inside `story-bible/`.

## Target structure

These changes come next, before the Premise section is built out.

### Shared core

Logic that both editions need moves into browser-side modules under `public/js/core/`:

- section definitions loaded from `sections/<story type>.json`
- entry templates
- Markdown and frontmatter parsing and serialization
- index and `BIBLE.md` generation
- link suggestions, and link rewriting when files move
- the structural audit

The core talks to storage only through one interface:

| Operation | Contract |
|---|---|
| `list(dir)` | Entries and folders under a path. |
| `read(path)` | Content and an opaque version (a hash, a Drive revision). |
| `write(path, content, baseVersion)` | Writes only if the stored version still matches. Otherwise it fails with the current content. |
| `delete(path)`, `move(from, to)` | The same version check. |
| `changes()` | A stream of outside changes, pushed (watcher, `FileSystemObserver`) or polled (focus, interval). |

### Storage backends

| Backend | Edition | Notes |
|---|---|---|
| `LocalServerStore` | Local | The Node server, reduced to file I/O, the path guard, atomic writes, and watching. |
| `FolderStore` | Web | The File System Access API, in Chrome and Edge. |
| `DriveStore` | Web | Google Drive with the `drive.file` scope. |
| `ZipStore` | Web | Open and save a zip, for Firefox and Safari. |

### AI

| Route | Edition | How it works |
|---|---|---|
| Claude Code | Local | "Ask Claude" writes a request file to `story-bible/.fletcherling/requests/`. The `fletcherling-process` skill handles it in a Claude Code session and writes the results back. |
| Provider adapter | Web | Anthropic or OpenRouter, called from the browser with the writer's own key or sign-in. Every response is validated before anything is written. |

Both routes follow the same writing rules. Changes to existing text become proposal files in `story-bible/.fletcherling/proposals/`, which the writer accepts or rejects. New entries are marked `author: ai-draft` until the writer settles them.

### Views

The writer can switch between views of the same files: document (default), board, canvas, and outline. Each view writes its changes back to the files, so it never holds state of its own. The one exception is canvas card positions, which live in `story-bible/.fletcherling/layout.json`. A shared drag engine, built on pointer events with FLIP animation and spring easing, serves the board and canvas. Details are in `Sentinel-Notes/layout-views-design-brief.md`.

### Claude Code skills

The `skills/` folder will hold four Claude Code skills (`fletcherling-interview`, `-process`, `-read`, `-audit`), installed into `~/.claude/skills/` by a script. They read the bible format directly and share no code with the app, so any change to the format must be made in both places.
