# PR Report: Prevent Stale Inventory Writes

## What Changed

- Added a generation-aware `InvalidatableCache`.
- An inventory scan stores its result only when no invalidating file-system or configuration event
  occurred while ripgrep was running.
- Added deterministic tests for both the stale-write rejection and current-write acceptance paths.

## Why It Changed

An invalidating event could previously clear the cache while a ripgrep scan was in flight, after
which that old scan would repopulate the cache. The generation guard preserves event-driven cache
correctness without forcing a second scan immediately.

## Files Touched

- `src/invalidatablecache.ts` — generation-aware cache primitive.
- `src/inventory.ts` — rejects stale scan results.
- `src/test/invalidatablecache.test.ts` — deterministic race-condition coverage.

## How to Verify

1. Run `npm run compile` and `npm run lint`.
2. Run `npm test` where the VS Code test runtime is available.
3. Trigger a file-list invalidation while an inventory scan is running, then reopen the picker;
   it must run a fresh scan instead of retaining the earlier result.
