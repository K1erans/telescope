# PR Report: Rebrand and Package Teleskope

## What Changed

- Renamed the extension's marketplace-facing display name to `Teleskope`.
- Renamed the README heading to `Teleskope`.
- Packaged the compiled extension as `Teleskope.vsix`, installed it into the local editor, and
  removed the obsolete `pathfuzzy-0.1.0.vsix` artifact.

## Why It Changed

Provides a clearly named replacement for the previous `pathfuzzy-0.1.0.vsix` package while
retaining the existing extension identifier and command/configuration compatibility.

## Files Touched

- `package.json` — extension display name.
- `README.md` — product heading.
- `Teleskope.vsix` — packaged extension artifact.
- `pathfuzzy-0.1.0.vsix` — removed obsolete package artifact.

## How to Verify

1. In the editor's Extensions view, verify the extension is displayed as `Teleskope`.
2. Run `PathFuzzy: Find Files` from the Command Palette.
3. Confirm that reopening the picker without file-list changes does not rerun ripgrep.
