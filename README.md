# PathFuzzy Finder

A VS Code extension that provides a fast, Telescope-inspired file picker with path-prefix scoping and fuzzy filtering.

## Features

- **Path-prefix scoping** — restrict search to any directory by typing its path followed by `/`
- **Fuzzy matching** — scores matches by contiguity, segment boundaries, and CamelCase transitions
- **Live updates** — results refresh as you type, with configurable debounce
- **Multi-root workspaces** — automatically picks the active editor's workspace folder or prompts you to choose
- **Cache** — file lists are cached per session and invalidated on file system changes
- **Configurable** — excludes, result limits, preview, and more

## Usage

### Open the picker

- **Command Palette**: `PathFuzzy: Find Files`
- **Keybinding**: `Cmd+Shift+J` (macOS) / `Ctrl+Alt+P` (Windows/Linux)

### Typing patterns

| Input | Behavior |
|---|---|
| `src/` | Show all files inside `src/` |
| `src/components/` | Scope to `src/components/` |
| `src/components/but` | Fuzzy-filter within `src/components/` for `but` |
| `button` | Fuzzy-search across the entire workspace |
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
```

## Configuration

All settings are under the `pathfuzzy` namespace.

| Setting | Type | Default | Description |
|---|---|---|---|
| `pathfuzzy.maxResults` | number | 200 | Maximum items shown in the picker |
| `pathfuzzy.debounceMs` | number | 100 | Debounce delay (ms) for input |
| `pathfuzzy.showPreview` | boolean | false | Preview files on navigation |
| `pathfuzzy.defaultExcludes` | string[] | `["**/node_modules/**", "**/.git/**", ...]` | Glob patterns to exclude |
| `pathfuzzy.inventoryMode` | `"workspaceCache"` \| `"scopedQuery"` | `"workspaceCache"` | File inventory strategy |
| `pathfuzzy.sortWhenEmpty` | `"alphabetical"` \| `"recent"` | `"alphabetical"` | Sort order with no query |
| `pathfuzzy.includeHidden` | boolean | false | Include hidden files (`.dotfiles`) |
| `pathfuzzy.allowDotDot` | boolean | false | Allow `../` in scope prefix |

### inventoryMode

- **`workspaceCache`** (default): fetches all workspace files once, caches them, then filters in-memory. Fast for repeated searches. Cache is invalidated on file create/delete/rename.
- **`scopedQuery`**: runs a new `findFiles` call for each scope prefix. Better for very large monorepos where loading everything upfront is too slow.

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
├── extension.ts    — activation, command registration, searcher lifecycle
├── picker.ts       — QuickPick UI, input parsing orchestration, file opening
├── search.ts       — vscode.workspace.findFiles wrapper, caching, parseInput
├── fuzzy.ts        — pure fuzzy scoring (no VS Code dependency)
└── test/
    ├── index.ts         — Mocha test runner entry point
    ├── runTests.ts      — @vscode/test-electron launcher
    ├── fuzzy.test.ts    — unit tests for fuzzy scoring
    └── parseInput.test.ts — integration tests for input parsing
```

## License

MIT
