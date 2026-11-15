# Starting Fletchery

## Start it

1. Open a terminal.
2. Go to the story's folder (the one that holds `story-bible/`, or will):

   ```
   cd C:\Users\Tim\Documents\_Writing\<story>
   ```

3. Run:

   ```
   fletchery
   ```

The browser opens at `http://127.0.0.1:3000/`. If port 3000 is taken, Fletchery uses the next free one and prints the address.

## Restart it

In the terminal where it's running, press Ctrl+C, then run `fletchery` again. Reload the browser tab afterward.

Restart after any change to `server/` or `bin/`. A change to `public/` only needs a page reload.

## Options

| Option | What it does |
|---|---|
| `--port <n>` | Start at a different port. |
| `--no-open` | Don't open the browser. |

## Test without touching a real story

1. Copy a story's `story-bible/` folder into `Documents\Fletchery\scratch\<name>\`.
2. From that folder, run:

   ```
   fletchery --port 3100 --no-open
   ```

3. Open `http://127.0.0.1:3100/`.

`scratch/` is gitignored, so nothing there gets committed.

## If `fletchery` isn't found

Run this once from `C:\Users\Tim\Documents\Fletchery`:

```
npm link
```

Or skip the link and run it by path from the story folder:

```
node C:\Users\Tim\Documents\Fletchery\bin\fletchery.js
```
