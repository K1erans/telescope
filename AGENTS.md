# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the extension source.
- `src/extension.ts` is the activation entrypoint and command registration.
- `src/picker.ts` and `src/inventory.ts` are the QuickPick and ripgrep adapters; `src/pickermodel.ts` and `src/fuzzy.ts` hold pure picker and scoring logic.
- `src/test/` contains Mocha tests (`*.test.ts`) plus the VS Code test launcher (`runTests.ts`).
- Compiled artifacts go to `out/` and should be treated as generated output.

## Build, Test, and Development Commands
- `npm run compile`: TypeScript build (`src` -> `out`).
- `npm run watch`: incremental TypeScript build during development.
- `npm run lint`: ESLint for `src/**/*.ts`.
- `npm test`: compiles first, then runs extension tests via `out/test/runTests.js`.
- The extension supports both VS Code and Cursor. Press `F5` to launch an Extension Development Host in whichever editor you are using.

## Coding Style & Naming Conventions
- Language: TypeScript (`strict` mode enabled in `tsconfig.json`).
- Indentation: 2 spaces; keep functions small and module-focused.
- Imports and symbols should use `camelCase` or `PascalCase` (enforced by `@typescript-eslint/naming-convention`).
- Prefer explicit equality (`===`/`!==`), braces for control blocks, and semicolons (warned by ESLint).
- File naming: concise lowercase names by responsibility (for example, `search.ts`, `logger.ts`).

## Testing Guidelines
- Framework: Mocha with `@vscode/test-electron` harness.
- Location/pattern: add tests under `src/test/` with suffix `.test.ts`.
- Keep core matching and parsing logic covered with deterministic unit tests.
- Run `npm test` before opening a PR.

## Commit & Pull Request Guidelines
- Current history is minimal (`main`, `fixing with codex 5.3 xhigh`), so use short, imperative commit subjects and include scope when useful (example: `picker: handle empty scope input`).
- Keep commits focused; avoid mixing refactors with behavior changes.
- PRs should include:
  - concise description of behavior changes,
  - linked issue/task when available,
  - test evidence (`npm run lint`, `npm test`),
  - screenshots or GIFs for QuickPick/UI behavior changes.

## Team Learning Tips (Agentic Assistants)
- Use these when the goal is learning, onboarding, or code walkthroughs.

- Always use an explanatory/learning response style so outputs include the reasoning behind changes, not just the edits.
- Always generate a visual HTML presentation for unfamiliar modules; it is useful for architecture overviews and team knowledge sharing.
- Keep generated slides in a disposable path unless the team explicitly wants them versioned.
## Plan Mode Behavior
- Use these rules whenever operating in Plan mode.
- Before implementing anything, ask 10 hard, specific questions that stress-test requirements, edge cases, failure modes, testing strategy, and rollout/risk.
- Do not provide a plan until all 10 questions are answered.
- Push back on vague, hand-wavy, or incomplete answers and ask follow-up questions until answers are concrete.
- Do not write or modify code until the user explicitly justifies architectural decisions, including key tradeoffs and constraints.
- If architectural justification is missing or weak, continue questioning and do not proceed to coding.
## Default prompt policy for Plan mode:
- "Before implementing anything, ask me 10 hard, specific questions that stress-test requirements, edge cases, failure modes, testing strategy, and rollout/risk. Do not give a plan until I answer all questions. Push back on vague answers."
## Change Reporting
- Always create a Markdown report in slides/ whenever code is generated or modified.
- Always name report files using the number-pr.md pattern (example: 1-pr.md, 2-pr.md).
- Include: what changed, why it changed, files touched, and how to verify.
- Keep numbering sequential across reports.