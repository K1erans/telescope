# Teleskope

A VS Code extension that provides a fast, Telescope-inspired file picker with path-prefix scoping and fuzzy filtering.

## Features

- **Path-prefix scoping** — restrict search to any directory by typing its path followed by `/`
- **Fuzzy path and literal content search** — scores filenames and paths by contiguity, segment boundaries, and CamelCase transitions; multi-word queries find files containing the typed text
- **Live updates** — results refresh as you type, with configurable debounce
- **Multi-root workspaces** — automatically picks the active editor's workspace folder or prompts you to choose
- **Ripgrep inventory** — `rg --files` builds a cached path inventory that is invalidated on file system changes
- **Configurable** — excludes, result limits, preview, and more

## Usage

### Open the picker

- **Command Palette**: `PathFuzzy: Find Files`
- **Keybinding**: `Cmd+Ctrl+7` (macOS) / `Ctrl+Alt+7` (Windows/Linux)

### Typing patterns

| Input | Behavior |
|---|---|
| `src/` | Show all files inside `src/` |
| `src/components/` | Scope to `src/components/` |
| `src/components/but` | Fuzzy-filter within `src/components/` for `but` |
| `button` | Fuzzy-search across the entire workspace |
| `const cache` | Find files containing the literal text `const cache` |
| `src/const cache` | Find files containing `const cache` within `src/` |
| `srcx/` | `srcx/` is not a directory — treated as a plain query |

### Examples

```
src/
└── Shows every file under src/ alphabetically

src/components/
└── Shows every file under src/components/

src/components/but
└── Matches: src/components/Button.tsx
             src/components/ButtonGroup.tsx
             src/components/submit/SubmitButton.tsx

Button
└── Matches any file with "Button" anywhere in its path

const cache
└── Matches every eligible file containing the literal text "const cache"
```

## Configuration

All settings are under the `pathfuzzy` namespace.

| Setting | Type | Default | Description |
|---|---|---|---|
| `pathfuzzy.maxResults` | number | 200 | Maximum items shown in the picker |
| `pathfuzzy.debounceMs` | number | 100 | Debounce delay (ms) for input |
| `pathfuzzy.showPreview` | boolean | false | Preview files on navigation |
| `pathfuzzy.defaultExcludes` | string[] | `["node_modules", ".git", ...]` | Glob patterns passed to ripgrep as excludes |
| `pathfuzzy.includeHidden` | boolean | false | Include hidden files (`.dotfiles`) |

### Search scope

Single-word queries search path and filename metadata with scoped fuzzy typeahead in memory.
Multi-word queries use ripgrep to find files containing the exact literal text. Both modes respect
the hidden-file and default-exclude settings, and parent traversal (`../`) is never accepted as a
scope.

## Fuzzy Scoring

The scorer ranks candidates by:

1. **Contiguous runs** — `but` matching `Button` consecutively scores higher than scattered characters
2. **Segment-start matches** — matching at `/`, `-`, `_`, or `.` boundaries gets a bonus
3. **CamelCase transitions** — matching at uppercase transitions scores extra
4. **Start-of-string match** — matching from the very beginning gets the highest bonus
5. **Shorter candidates** win on ties (small length penalty)

## Development

```bash
npm install
npm run compile       # one-off build
npm run watch         # watch mode
npm test              # run tests in VS Code test runner
```

Press `F5` in VS Code to launch the Extension Development Host.

## Architecture

```
src/
├── extension.ts    — activation and adapter wiring
├── inventory.ts    — ripgrep inventory and literal content search, URI construction, diagnostics
├── inventoryparse.ts — pure single-pass ripgrep output parsing
├── picker.ts       — QuickPick mapping, debounce, preview, and open effects
├── pickeritems.ts  — typed-row mapping and stale-update generation guard
├── pickermodel.ts  — pure indexed scope, ranking, and typed-row model
├── fuzzy.ts        — pure fuzzy scoring (no VS Code dependency)
└── test/
    ├── index.ts             — Mocha test runner entry point
    ├── runTests.ts          — @vscode/test-electron launcher
    ├── fuzzy.test.ts        — fuzzy scoring tests
    ├── picker.test.ts       — QuickPick adapter tests
    └── pickermodel.test.ts  — picker-model interface tests
```

## License

MIT
