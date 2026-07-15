# PR Report: Add Global Terminal `gacp` Command

## What Changed

1. Added `scripts/gacp.fish`, a fish function that runs `git add -A`, `git commit -m`,
   and `git push` in sequence.
2. Installed the function to `~/.config/fish/functions/gacp.fish`.
3. Ensured `~/bin` is on fish `PATH` via `fish_add_path` in `~/.config/fish/config.fish`.
4. Kept `scripts/gacp` as a bash fallback for non-fish shells.

## Why It Changed

Provides a single terminal shortcut for the common add-commit-push workflow instead
of typing three separate git commands.

## Files Touched

- `scripts/gacp.fish` — source fish function
- `scripts/gacp` — bash fallback script
- `~/.config/fish/functions/gacp.fish` — installed fish function
- `~/.config/fish/config.fish` — adds `~/bin` to PATH

## How to Verify

In fish, from a git repo:

```fish
gacp "your commit message"
```

Expected behavior:

1. Stages all changes (`git add -A`)
2. Creates a commit with the given message
3. Pushes to the configured remote

If no message is provided, the function prints usage and exits with status 1.

Fish loads new functions immediately; no restart required.
