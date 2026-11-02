# Decisions

`docs/SPEC.md` is the record of decisions and wins over the original brief. This log gives the short reason and the rejected alternative for the ones that shape the code, and points to the SPEC section. Decisions already explained there are not repeated.

| Decision | Reason | Rejected or deferred | Where |
|---|---|---|---|
| Plain Node `http`, plain HTML, CSS, and JavaScript, no build step | Few dependencies, `npm link` works on Windows, recursive `fs.watch` works on Windows | A framework or bundler. A build step is allowed later (for a formatting editor or the web edition). | SPEC "Stack" |
| The server is a dumb file store | The same page and core must run against other storage in a web edition | Entry logic on the server | SPEC "Shared core"; `DESIGN.md` |
| Version check on every change; 409 returns the stored file | The writer may edit in another editor or with Claude Code at the same time. Nothing is silently overwritten. | Last write wins; file locks | SPEC "Defaults" item 9 |
| Version is a content hash | It works for any backend (a Drive revision can stand in) and needs no extra state | Modified time | `DESIGN.md` "Saving and conflicts" |
| Entry logic in `public/js/core/`, importable in Node | Tests and a later web edition share it | Keeping it in `app.js` | `CLAUDE.md` Project |
| Layers (Seed, Sketch, Sheet) in one file, as `##` headings | A plain text editor and the AI read one file. Only layers with text are written. | A file per layer | SPEC "Entry depths" |
| Sheet fields stored as `###` parts matched by label | Readable by hand | Frontmatter or JSON | SPEC "Entry depths" |
| Canon is the writer's decision only | The AI never makes something canon | Auto-canon on length or completeness | SPEC "Defaults" item 2 |
| Folder per character, named by slug | Images and sidecars sit with the entry, and relative links stay stable | One flat file per character | SPEC "Characters" |
| Rename moves folder and file together | The folder stays readable for writers who work in it directly | Keeping a permanent id as the folder name | SPEC "Characters" |
| A portrait is stored as crop data and a 512 pixel copy | The crop can be redone; cards load fast; the folder reads on its own | Only the copy, or only the crop | SPEC "Characters" |
| Reordering is drawn by hand with pointer events | The browser's drag and drop always shows a faint ghost copy | HTML5 drag and drop | `app.js` comment above `setupCardReorder` |
| Settings live in `fletchery-settings.json`, never in browser storage; API keys never go in a story folder | Story folders get synced, shared, or committed | `localStorage` | SPEC "Defaults" item 11 |
| Bible record and writer's settings are separate files | The record is the story's facts; settings are the writer's preferences | One file | SPEC "Defaults" item 11 |
| Server binds to 127.0.0.1, checks `Host` and `Origin` | Blocks DNS rebinding and other sites writing to the bible | Open binding | `DESIGN.md` "Security" |
| Launch URL uses 127.0.0.1, not `localhost` | The browser could reach a different server on the IPv6 address | `localhost` | Comment in `bin/fletchery.js` |
| Premise questions are about change and consequences | Fits stories without a central conflict (Tim's choice) | The Snowflake Method's disasters | `CLAUDE.md` Project |
| Colors: icon colors only, on cream | Contrast and identity. Numbers are in `CLAUDE.md`. | White text on cream | SPEC "Colors"; `CLAUDE.md` |
| Animate state changes, briefly and eased | A fluid feel is a global aesthetic choice. Reduced motion is honored. | Instant changes | `CLAUDE.md` "Design rules" |
| `CLAUDE.md` and `Sentinel-Notes/` are tracked in the public repo | Remote sessions need the same context | Gitignoring them | `CLAUDE.md` top |
| The brief `first-prompt/` stays out of git | Kept private by choice. `docs/SPEC.md` carries the decisions. | Committing it | `CLAUDE.md` Project |
| Renamed from Fletcherling to Fletchery on 2026-10-30 | Name change by Tim | None | SPEC "Name" |

Decisions still open or deferred are in `Sentinel-Notes/TODO.md` and the design briefs in `Sentinel-Notes/`.
