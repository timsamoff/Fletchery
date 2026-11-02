# Build, run, test

## Install and launch

There is no build step.

```
npm install        # installs dependencies and turns on the commit hooks (the prepare script)
npm link           # once, to put `fletchery` on the PATH
cd <a story project folder>
fletchery          # serves the bible in ./story-bible/ and opens the browser
```

Options: `--port <n>` and `--no-open`. Without `npm link`, run `node bin/fletchery.js` from the story folder. Edits to the repo take effect the next time it launches. Server changes need a restart; front end changes need a page reload (the server sends `Cache-Control: no-cache`, but a stale tab may still hold old modules).

Run it from the story project's folder, not from this repo, so app code and story data never mix.

## Test

There is no automated test suite (TODO T1). Verification is by hand in a real browser.

1. Copy a real bible into `scratch/` (gitignored), for example `scratch/<name>/story-bible/`.
2. From that folder, run `fletchery --port 3100 --no-open`, and open `http://127.0.0.1:3100/`.
3. Work through the checklist for what you changed in `12-verification-checklists.md`.
4. Edit a file in a text editor while the page is open to test live updates and conflicts.

One-off scripts go in `scratch/`, not the OS temp folder. Playwright output goes to `.playwright-mcp/` (gitignored). After changing JavaScript, reload the page before testing, or a browser driver may serve the cached copy.

## Debug

- The server logs to the terminal where `fletchery` runs. Unexpected errors print there and return a generic 500 to the page.
- The page puts save and load messages in the footer status line (`#save-status`) and, beside the editor, `#local-status`.
- Broken frontmatter shows a message in the page and logs the YAML error to the browser console.
- "Show grid" in the footer overlays the 4px and 28px rhythm lines.

## Quality gate

`npm install` or `npm run sentinel:install` sets `core.hooksPath` to `sentinel-gate/hooks`. The `commit-msg` hook checks the message and the staged files. The `pre-push` hook scans HEAD and the pushed messages. Never use `--no-verify`.

| Command | What it does |
|---|---|
| `npm run sentinel:full` | The blocking full scan |
| `npm run sentinel:report` | Lists every finding, including the baselined backlog |
| `npm run sentinel:spec-reviewed` | Records that `docs/SPEC.md` was reread against the code |

Details are in `INTEGRATION_CHECKLIST.md`.

## Deploy

None. The app runs locally. A hosted web edition is planned (`DESIGN.md`).
