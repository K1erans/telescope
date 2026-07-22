# PathFuzzy Domain Context

PathFuzzy is a path and filename picker with literal multi-word content search.

- **File Inventory** — the normalized workspace-relative paths returned by `rg --files`,
  plus the URI needed to open each file.
- **Scope** — the longest valid directory prefix in the current input. Scope is internal
  to the picker model because no second caller needs that interface.
- **Query** — the input remaining after Scope is removed. If no valid Scope exists, the
  complete normalized input is the Query.
- **Content Query** — a Query containing whitespace. It is searched as literal file content by
  ripgrep; matching files are returned as Picker Rows. A single-word Query remains a Fuzzy Match.
- **Picker Row** — a typed information, directory, or file result returned by the pure
  picker model and mapped to a VS Code QuickPick item by the picker adapter.
- **Directory Drill** — selecting a directory Picker Row to replace the input with that
  directory's path and reveal its immediate contents.
- **Fuzzy Match** — a case-insensitive, in-order path or filename match ranked by
  contiguity, segment starts, CamelCase transitions, start position, and candidate length.
