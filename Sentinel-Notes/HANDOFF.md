# Handoff

Updated 2026-11-16. Nothing is in progress. The new look is committed as `3d2ece5`. It is not pushed, and Tim has not approved pushing it.

## 1. Current task and status

None. The look is built, checked in a browser, documented, and committed: pale gold page `#F3ECD8`, gold-white writing surface `#FBF8EC`, darker gold panels `#E7DAB6`, muted plum-gray sidebar `#DCD1D7` with dusty plum `#79516C` for the current item, raspberry `#A04459` for header, footer, buttons, underlines, and card spines, and gold `#C5A13B` for rules, the ribbon, and ornaments. Atkinson Hyperlegible Next is the default font (bold at 500). Notifications are a toast, and the footer's Show grid button is gone. Tim's last requests, darker-gold panels and a plum sidebar highlight, are both done. He has not seen the final version in the app yet.

## 2. Files touched

None uncommitted.

## 3. Next step

Tim restarts Fletchery (the server changed to serve the new font), reloads, opens Settings and picks Atkinson Hyperlegible Next (a saved setting overrides the new default), and says what to adjust. Then he makes the new icon (`assets/fletchery-icon.svg` is still the dark one; the header mark is 64px). Then the overall app design discussion he asked for: the look is done, so ask about layout and interaction, or the code's structure, before proposing anything. Characters step 4 (relationships) is the next build step.

## 4. Open questions for Tim

- OK to push `3d2ece5` and the handoff commit after it?
- Which flourishes stay (gilt rules, ribbon, card spines, ornament, endpaper)? The ornament glyph looks like a small fruit in the font; an SVG would fix it.
- Should unsaved, saving, and saved ever become toasts? They stay beside the editor for now.
- Sentinel 1.8.0: update now, not now, or skip.
- Delete a character: a real delete or a trash folder?

## 5. Tried and failed

- Backslashes and quotes in a Bash heredoc get mangled. Write patch scripts with the Write tool into `scratch/`, then run them.
- Several source files have CRLF line endings. Use the Edit tool, or normalize line endings in the script (see `scratch/look-patch*.cjs`).
- The gate's raw-token rule flags `4px`, `8px`, `28px`, `64px` and other token values in `base.css`. Use the token.
- The wide-screen sidebar padding rule is `.section-nav .nav-list a`, so sidebar overrides need that much specificity.
- An accent bar behind the ribbon bookmark fills its notch; the ribbon alone marks the current item.
- Playwright can't open `file:` pages. Serve the folder with `python -m http.server` and wait a moment before loading.
- After any server change, tell Tim to restart Fletchery first. A status-line message is invisible behind a modal dialog; use the toast.
- A saved Settings value wins over a new default, so a changed default needs Tim to re-pick it.
- The handoff-only push exception covers the handoff file alone. Pushing it carries every unpushed commit under it, so push only when no other commit is waiting on Tim's approval.
- Tim tests on his real EOL bible on port 3000. Never send it a request that changes anything.
