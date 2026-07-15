# PR Report: Deepen Picker Architecture

## What Changed

1. Added one pure picker-model interface that owns input parsing, internal Scope
   resolution, indexed inventory lookup, directory drilling, bounded ranking, and
   typed Picker Rows.
2. Split editor effects into a ripgrep inventory adapter and a thin QuickPick
   adapter. Removed the mixed search module and shallow logger wrapper.
3. Added stale-update generation checks so an older cold load cannot replace newer
   input, while warm updates use an already-built model without awaiting inventory.
4. Changed file ranking to return scores only, reuse scorer buffers, lowercase
   inventory metadata once, and retain only the best configured result count.
5. Removed settings that promised unimplemented behavior: `inventoryMode`,
   `sortWhenEmpty`/`recent`, and `allowDotDot`.
6. Documented that PathFuzzy searches paths and filenames, not file contents.
7. Follow-up review fixes removed eager non-root sorting, added lazy immutable
   directory-row caching, made QuickPick busy finalization generation-safe, added
   direct scorer parity coverage, and moved ripgrep stdout parsing into a tested
   single-pass pure helper.

## Why It Changed

The old picker mixed ripgrep, Scope parsing, full-list filtering and sorting,
QuickPick allocation, and editor effects in one update function. Every keystroke
awaited inventory, rescanned Scope candidates, allocated match positions that the
VS Code 1.85 QuickPick interface cannot render, sorted every match, and built UI
items before truncation.

The new picker model is a deep module: callers provide input and a result limit,
then receive typed rows. Scope remains internal. Editor and process details stay
in adapters, while behavior is tested through the same pure interface used by the
QuickPick caller.

## Performance Diagnosis and Measurements

Methodology:

- Apple Silicon macOS host, Node.js in the repository toolchain.
- Deterministic synthetic paths shaped as
  `packages/pkg-N/src/features/feature-N/ComponentN.tsx`.
- Query `cmp42`, maximum 200 rows, three warmups, then ten measured updates.
- Timings use `performance.now()` in one process; medians are compared.
- These are development diagnostics, not CI assertions.

Results:

- 10,000 paths: median warm update improved from **7.69 ms** to **5.53 ms**
  (28.1% faster).
- 100,000 paths: median warm update improved from **96.02 ms** to **63.57 ms**
  (33.8% faster).
- Final one-time model index construction measured **27.05 ms** for 10,000 paths
  and **199.89 ms** for 100,000 paths. Before the lazy-sort follow-up it measured
  44.85 ms and 483.27 ms respectively.
- One diagnostic scoped empty-query call took **0.316 ms** at 10,000 paths and
  **0.717 ms** at 100,000 paths; the immediately repeated cached calls took
  **0.008 ms** and **0.011 ms**. These one-shot cache diagnostics are not treated
  as stable benchmark statistics.

The synthetic setup separates model indexing from warm typeahead. It does not
claim a cold `rg --files` number because a generated in-memory inventory bypasses
filesystem and subprocess costs; a workspace-specific cold ripgrep number would
not be a comparable synthetic measurement.

## Files Touched

- `src/pickermodel.ts`: new pure indexed picker model.
- `src/inventory.ts`: new ripgrep inventory, cache, URI, diagnostics, and output
  channel lifecycle adapter.
- `src/inventoryparse.ts`: single-pass path normalization and stdout parsing.
- `src/picker.ts`: reduced to workspace, QuickPick, debounce, preview, and open
  effects.
- `src/pickeritems.ts`: pure row mapping and update-generation guard.
- `src/fuzzy.ts`: score-only file ranking, pooled buffers, and indexed lowercase
  candidate support.
- `src/extension.ts`: wires inventory and picker adapters.
- `src/search.ts`, `src/logger.ts`: deleted.
- `src/test/pickermodel.test.ts`: picker-model interface behavior.
- `src/test/picker.test.ts`: stale-generation and row-mapping behavior.
- `src/test/fuzzy.test.ts`: score-only and scoring-equivalence coverage.
- `src/test/inventoryparse.test.ts`: empty output and Windows-separator coverage.
- `src/test/parseInput.test.ts`: replaced by picker-model interface tests.
- `src/test/runTests.ts`: pins the Extension Host test target to supported VS Code
  1.85.2 rather than drifting beyond the extension's compatibility baseline.
- `package.json`, `README.md`, `CONTEXT.md`, `AGENTS.md`: settings, architecture,
  domain language, and path-only search documentation.
- `out/`: regenerated compiled artifacts, with deleted-module artifacts removed.

## How to Verify

- `npm run compile` — passed.
- `npm run lint` — passed.
- `./node_modules/.bin/mocha --ui tdd "out/test/*.test.js"` — 32 passing.
- `npm test` — compilation passed, but the downloaded VS Code 1.85.2 Extension
  Host again exited with code 1 before emitting test output on macOS 27. The same
  deterministic tests passed directly under Mocha; manual Extension Host smoke
  testing remains.
- VSIX packaging was skipped because the repository has no package script and no
  installed `vsce` tool. The existing VSIX was not modified or installed.

Manual smoke checklist:

1. Open the picker cold and type rapidly while inventory loads.
2. Drill through nested scopes and verify alphabetical empty-scope ordering.
3. Verify file preview when enabled.
4. Verify workspace detail in a multi-root workspace.
5. Open a selected file and confirm a non-preview editor.
