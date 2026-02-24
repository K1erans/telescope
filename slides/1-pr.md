# PR Report: Cursor Support and Configurable Keybindings

## What Changed

1. **Cursor IDE support** – The extension now explicitly targets Cursor in addition to VS Code.
2. **Default keybinding** – The default shortcut is now `cmd+ctrl+7` (Mac) / `ctrl+alt+7` (Windows/Linux).
3. **Documentation** – AGENTS.md updated to mention VS Code and Cursor support.

## Why It Changed

- Users requested the extension to work in Cursor as well as VS Code.
- Users requested a configurable keybinding with default `cmd+ctrl+7`.
- Cursor uses the same extension API as VS Code, so support is declarative only (engines, keywords).
- Keybindings remain overridable via Keyboard Shortcuts (Cmd+K Cmd+S) or `keybindings.json`.

## Files Touched

| File | Changes |
|------|---------|
| `package.json` | Added `cursor` to `engines`; updated `description` and `keywords`; changed default keybinding to `cmd+ctrl+7` / `ctrl+alt+7` |
| `AGENTS.md` | Noted that the extension supports VS Code and Cursor; clarified that F5 launches Extension Development Host in either editor |
| `slides/1-pr.md` | New change report (this file) |

## How to Verify

1. **Build and lint**
   ```bash
   npm run compile
   npm run lint
   ```

2. **VS Code**
   - Press F5 to launch Extension Development Host.
   - Press `Cmd+Ctrl+7` (Mac) or `Ctrl+Alt+7` (Windows/Linux).
   - PathFuzzy picker should open.

3. **Cursor**
   - Install the extension (or use development install).
   - Press `Cmd+Ctrl+7` (Mac) or `Ctrl+Alt+7` (Windows/Linux).
   - PathFuzzy picker should open.

4. **Keybinding override**
   - Open Keyboard Shortcuts (Cmd+K Cmd+S).
   - Search for "PathFuzzy: Find Files".
   - Assign a different keybinding and confirm it works.
