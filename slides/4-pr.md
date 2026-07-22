# PR Report: Keep the File Inventory Until It Changes

## What Changed

- Removed PathFuzzy's fixed 30-second inventory expiry.
- The ripgrep inventory now remains cached until VS Code reports a create, delete, or rename.
- Changing `pathfuzzy.includeHidden` or `pathfuzzy.defaultExcludes` also invalidates the cache.

## Why It Changed

An unchanged workspace has an unchanged set of searchable paths. Re-running `rg --files`
after an arbitrary time interval walks the entire workspace without improving results.
Event-driven invalidation retains correct file lists after relevant changes while eliminating
periodic full scans.

## Files Touched

- `src/inventory.ts` — event-driven cache lifetime and configuration invalidation.

## How to Verify

1. Open `PathFuzzy: Find Files`; the Output panel logs one `rg` invocation.
2. Close and reopen the picker after more than 30 seconds without changing files; no second
   `rg` invocation should appear.
3. Create, rename, or delete a workspace file, then reopen the picker; one new inventory scan
   should occur and results should reflect the change.
4. Change `pathfuzzy.includeHidden` or `pathfuzzy.defaultExcludes`, reopen the picker, and
   confirm that the new inventory respects the setting.
