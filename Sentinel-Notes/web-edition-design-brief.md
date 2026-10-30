# Web edition: design brief

Decided 2026-10-30. The settled decisions are in `docs/SPEC.md` under "Web edition". This brief holds the detail and the open questions.

## What it is

A static build of Fletchery that runs from any web host, with no install and no Node server. The writer picks two things on first run, and can change either later in settings:

1. **AI:** none, Anthropic, or OpenRouter.
2. **Storage:** this computer, or Google Drive.

The local edition (`fletchery` launched from a story folder, with Claude Code as the AI) stays as it is. All editions read and write the same bible format, so a bible can move between them.

## AI choice

**Without AI**, the writer keeps:
- the guided interview and full form, depths, status, and Skip for now
- entries, folders, images, sidecars, and the media library
- Notes, the Inbox, and quick capture
- generated indexes and `BIBLE.md`
- link suggestions
- the structural audit: broken links, missing alt text, unfiled Inbox items, and ages against the timeline from structured dates

**Without AI**, the writer loses:
- Ask Claude: AI interviews that follow up on answers, expand this, check against the rest of the bible, and suggest what's missing
- AI suggestions for where to file Inbox items
- contradiction checks that need judgment, beyond what structured fields allow

The first-run screen and the settings page list these losses plainly before the writer confirms.

**Providers (researched 2026-10-30):**

| Provider | From a static page | Status |
|---|---|---|
| Anthropic | Works, with the direct-browser-access header | At launch |
| OpenRouter | Works. OAuth PKCE sign-in runs in the browser with no backend, so the writer clicks "Connect" instead of pasting a key. One account reaches OpenAI, Google, Anthropic, Meta, and other models. | At launch |
| Google Gemini direct | Likely works; not confirmed in Google's docs | Later, if asked for |
| OpenAI direct | Unreliable: reports conflict on whether it accepts browser calls | Use OpenRouter instead |
| Ollama (local models) | Works once the writer adds the site to `OLLAMA_ORIGINS` and restarts Ollama | Later, if asked for |

- **Adapter:** each provider implements one interface: connect, forget, list models, send a request, and estimate cost when possible.
- **Validation:** models differ in how reliably they follow a format. Every response is validated against the expected proposal or draft structure before anything is written. On failure, the writer sees "This response couldn't be used" with the option to retry, and no file changes.
- **Testing:** each provider and its default model gets the same set of format tests before release.

**With a connected provider:**
- **Key handling:**
  - The key (or OpenRouter token) is stored only in this browser (localStorage), and sent only to that provider. Anthropic calls use the direct-browser-access header.
  - The settings page states that the key stays on this device, that anyone with access to this browser profile could read it, and that API use is billed to the writer's provider account, separately from any Claude or ChatGPT subscription.
  - A "Forget key" control removes it.
- **Context:** each request sends `BIBLE.md`, the current entry, and the entries it links to, trimmed to a token budget. The AI sees only what's sent, unlike Claude Code, which reads the whole folder.
- **Writing rules:** results come back as proposals (shown side by side, with Accept and Reject) or new `ai-draft` entries, the same as with Claude Code.
- **Settings:** a model choice (Anthropic default: the current Sonnet), and a per-request cost estimate when it's practical.

## Storage choice

**This computer:**
- **Chrome and Edge:** the writer picks a folder, through the File System Access API (`showDirectoryPicker`), and the app reads and writes it directly. Permission is re-requested on each visit, since browsers don't keep it.
- **Outside edits:** with `FileSystemObserver` (Chrome 133+, still experimental), edits made outside the app, such as by Claude Code, appear live. Without it, the app re-checks when the tab regains focus.
- **Conflict detection:** works as in the local edition. Before writing, the app compares the file with the version it loaded, and asks if they differ.
- **Firefox and Safari:** neither supports writing to a folder, and neither plans to. Recommended default: suggest Google Drive. If the writer still wants local, offer "Open a bible" (read a folder) plus "Save a copy" (download a zip) as a manual round trip, with a clear note that the app doesn't save on its own in this mode. Don't offer browser-only storage (OPFS) as a home for the bible, since clearing site data deletes it.

**Google Drive:**
- **Sign-in:** through Google Identity Services, with only a client ID and no secret.
- **Scope:** `drive.file`, so the app sees only files it created or the writer picked. Google classifies this scope as non-sensitive. It still needs basic OAuth app verification before the public can use it without a warning screen, and that requires a privacy policy page and a verified domain.
- **Layout:** the app creates `Fletchery/<working title>/story-bible/` in the writer's Drive, with the same layout as on disk.
- **Conflict detection:** before writing, the app checks the file's revision against the one it loaded. Drive has no push notifications for a static page, so it re-checks on focus and on a slow interval.

## Architecture changes (do these before Premise phase 2)

- **Shared core (`public/js/core/`):**
  - entry templates from `sections/*.json`
  - Markdown and frontmatter parsing and serialization
  - index and `BIBLE.md` generation
  - link suggestion and link rewriting for Move to library and Move to entry
  - the audit
- **Storage interface:** `list`, `read` (returns content and a version), `write(path, content, baseVersion)` (refuses on a version mismatch), `delete`, `move`, and `changes` (a push or polling stream).
- **Backends:**
  - `LocalServerStore`: the current Node server, now reduced to file I/O, path guarding, and watching
  - `FolderStore`: File System Access
  - `DriveStore`
  - `ZipStore`: import and export only
- **Builds:** the local edition serves the same front end with `LocalServerStore`. The web edition is the same front end, deployed static, with `FolderStore` or `DriveStore`.
- **Moves:** the server's frontmatter and serialization code moves into the core. Server-side writes then just store what the page sends, and the path guard and atomic writes stay on the server.

## Open questions

- **Hosting:** GitHub Pages from this repo, or another static host? Drive verification needs a domain Tim controls, plus a privacy policy page.
- **Claude Code with the web edition:** in "this computer" mode, the folder is an ordinary story folder, so Claude Code can work in it, and the request queue could still apply. Offer that as a third AI option ("Claude Code on this computer"), or keep the web edition to none or an API key?
- **Build order:** build the shared core and storage interface now, with the web edition itself after the local edition's phases? Or ship the web edition earlier?
- **Drive and Claude Code:** the Drive for desktop sync client would put a Drive bible on disk where Claude Code could reach it. Mention this in docs, or leave it out?

## Edition comparison (source for user-facing copy)

Decided 2026-10-30: both editions stay. README, first-run screens, settings, and any landing page draw on this so writers can choose knowingly.

| | Local edition | Web edition |
|---|---|---|
| Install | Node and one `npm` command; launch with `fletchery` in a story folder | None; open a web page |
| Browsers | Any | Folder storage in Chrome and Edge; Google Drive anywhere; zip open and save in Firefox and Safari |
| Live sync with outside edits | Yes, through the file watcher | In Chrome and Edge, through `FileSystemObserver` (experimental) or a re-check on focus; Drive re-checks on focus and on an interval |
| AI | Claude Code, through the request queue, on the writer's Claude plan | None, or Anthropic or OpenRouter, billed per use to the writer's own provider account |
| What the AI can see | The whole project folder, including manuscript chapters and style skills | The bible, sent with each request (the whole bible fits in one request on current models) |
| AI work style | Open-ended: reads many files, follows leads, rewrites several entries | Structured actions: interview, expand, check, suggest; one request each |
| Network | None | Only Google (if Drive) and the connected AI provider |
| Claude Code for drafting prose | Yes | Yes, in folder mode, since the bible is an ordinary folder on disk |

Takeaways to state in copy:

- **Local:** the full Claude Code experience, on the writer's existing plan, with nothing leaving the computer. Needs Node and a terminal.
- **Web:** no install, works from anywhere, AI optional and paid per use, with the whole bible in view on every request. Live local editing needs Chrome or Edge.
- **Both:** the same files, so a bible moves freely between editions and into a Claude Code drafting session.
