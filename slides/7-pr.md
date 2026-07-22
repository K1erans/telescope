# Literal Content Search

## What changed

- PathFuzzy now treats multi-word picker input as a literal content search.
- For example, entering `const cache` returns files containing that exact text.
- Valid directory prefixes still constrain the search, so `src/const cache` searches within `src/`.
- Single-word input remains the existing fuzzy path-and-filename search.

## Why it changed

Developers often remember a line of code but not the file containing it. The picker can now use that remembered text to locate the file directly.

## Files touched

- Picker model: determines content-search input, filters scoped matches, and provides an empty state.
- Ripgrep inventory: queries literal content matches while honoring existing hidden-file and exclude settings.
- Picker adapter: requests content matches without allowing stale async results to overwrite newer input.
- Tests and documentation: cover and describe literal content search.

## How to verify

1. Run `npm run lint`.
2. Run `npm test`.
3. Open PathFuzzy in a workspace containing `const cache` in more than one file.
4. Type `const cache` and confirm each matching file is listed; type `src/const cache` to confirm results are scoped to `src/`.
