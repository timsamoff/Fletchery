# Architecture

`DESIGN.md` is the full overview, including the planned parts. This file says what is true in the code now.

## Scope and current state

Fletchery is a local web app that walks a writer through building a Story Bible. The bible is a folder of Markdown files with YAML frontmatter, plus images and sidecar files, in `./story-bible/` inside a story project. The folder is the product. Nothing the app stores is unreadable to a plain text editor.

Built:

- First-run setup (story type, title, standalone or series).
- Two sections: Premise (one entry) and Characters (many entries, one folder each).
- The three-depth entry editor (Seed, Sketch, Sheet), with two question layouts, Focus mode, autosave, live updates from disk, and conflict handling.
- Character cards with drag reordering, add, and rename.
- Portraits (ten silhouettes or a cropped photo) and an Images tab with captions, alt text, notes, duplicate, remove, and drag reordering.
- A Settings panel (credit, fonts, paste handling, sidebar fade).
- A quality gate on commits and pushes (`sentinel-gate/`, not covered here).

Not built, though some UI mentions it: every other section (shown in the sidebar as "Not built yet"), the Ask AI button (disabled), the media library, relationships, generated indexes, `BIBLE.md`, the web edition, the Claude Code skills, and the other views. The next planned step is Characters step 3, the media library (see `Sentinel-Notes/characters-design-brief.md`).

Version is `0.1.0`. There are no tags or releases.

## Structure

One Node process serves a static front end and a small file API. The browser does all the entry logic.

```
fletchery (bin/fletchery.js)
  starts createServer(projectDir) from server/server.js
    Bible (server/bible.js)     file operations inside story-bible/
    Watcher (server/watch.js)   reports real content changes
    routes: static files, /sections, /fonts, /vendor/yaml, /api/*
browser (public/)
  index.html                    shell: header, #view, Settings dialog, footer
  js/app.js                     the whole page: setup, nav, editor, characters, images
  js/settings.js                the writer's settings and the Settings panel
  js/core/*.js                  entry logic that also runs in Node
  css/tokens.css, base.css      design tokens, then components
sections/<type>.json            section definitions, fetched by the page
```

The server is a file store. It knows nothing about entries, sections, depths, or statuses. It stores and returns text, checks a version on every change, and tells the page when a file changed.

## Data flow: opening and saving an entry

1. The page loads `story-bible/fletchery.json` (the bible's own record) through `store.read`. If it is missing, `showSetup` runs.
2. `showEditor` fetches `/sections/<storyType>.json`, builds the page frame once, then calls `route`.
3. `route` reads the address (`#/premise`, `#/characters`, `#/characters/<slug>`). A section with `many` and no slug shows the cards. Anything else calls `openEntry`.
4. `openEntry` reads the entry file. `load` stores its version and content in `state`, splits the body into layers with `parseLayers`, and renders.
5. Typing sets `state.layers` and starts a 500 ms timer (`SAVE_DELAY_MS`). `save` calls `writeEntry`.
6. `writeEntry` builds the new file with `updateEntry` (core), then `store.write(path, content, state.baseVersion)`.
7. The server compares `baseVersion` to the SHA-256 of the file on disk. A match writes through a temp file and a rename. A mismatch returns 409 with the current file, and the page shows the conflict panel.
8. The watcher sees the write, finds its hash equals the one the server recorded with `expect`, and stays quiet. A change from another program has a different hash, so the watcher sends a server-sent event. The page then reloads the entry if nothing is unsaved, or opens the conflict panel if there are unsaved edits.

## Pages and the sidebar

The sidebar (`renderNav`) lists every section in the section file. Built sections link to their pages. Unbuilt ones show "Not built yet". Characters opens like a folder and lists each character. Status shows as a shape plus a word (empty, draft, canon), never color alone.

One page frame holds every entry page. `renderAll` redraws the head, nav, status, depth steps, and the question area. The Focus dialog and the name, image, and crop dialogs are created once in `showEditor`.

## Two editions

Only the local edition exists. `store.js` is the seam that a web edition would replace: `app.js` talks to storage through `LocalServerStore`, with two exceptions listed in `08-fragile-zones-and-debt.md`.
