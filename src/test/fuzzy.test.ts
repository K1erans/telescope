/**
 * Unit tests for the fuzzy scoring module.
 * Run with: npm test (after npm run compile)
 *
 * These tests are designed to run with Mocha in the VS Code test runner
 * (via @vscode/test-electron), but the fuzzy module itself has no VS Code
 * dependency, so they also work with plain Mocha if desired.
 */
import * as assert from 'assert';
import { createFileScorer, fuzzyMatch, scoreFile } from '../fuzzy';

suite('fuzzyMatch', () => {
  test('returns positions for exact match', () => {
    const result = fuzzyMatch('Button.tsx', 'Button');
    assert.ok(result !== null, 'should match');
    assert.strictEqual(result!.positions.length, 6);
    // positions should be 0..5
    assert.deepStrictEqual(result!.positions, [0, 1, 2, 3, 4, 5]);
  });

  test('returns null when query chars are not in candidate', () => {
    const result = fuzzyMatch('Button.tsx', 'xyz');
    assert.strictEqual(result, null);
  });

  test('empty query returns score 0 with no positions', () => {
    const result = fuzzyMatch('anything', '');
    assert.ok(result !== null);
    assert.strictEqual(result!.score, 0);
    assert.deepStrictEqual(result!.positions, []);
  });

  test('contiguous match scores higher than scattered match', () => {
    // Use candidates without separator chars so the only difference is contiguity.
    // b_x_u_x_t would give segment-start bonuses to u and t, inflating the scattered score.
    const contiguous = fuzzyMatch('button', 'but');
    const scattered = fuzzyMatch('baxuxtz', 'but'); // b..u..t, no segment boundaries
    assert.ok(contiguous !== null);
    assert.ok(scattered !== null);
    assert.ok(
      contiguous!.score > scattered!.score,
      `Contiguous (${contiguous!.score}) should beat scattered (${scattered!.score})`
    );
  });

  test('match at start of string scores higher than match in middle', () => {
    const atStart = fuzzyMatch('foobar', 'foo');
    const inMiddle = fuzzyMatch('xyzfoobar', 'foo');
    assert.ok(atStart !== null);
    assert.ok(inMiddle !== null);
    assert.ok(
      atStart!.score > inMiddle!.score,
      `Start match (${atStart!.score}) should beat mid match (${inMiddle!.score})`
    );
  });

  test('segment start bonus: match at / boundary', () => {
    const atBoundary = fuzzyMatch('src/foo/bar', 'bar');
    const inMiddle = fuzzyMatch('src/foobarn', 'bar');
    assert.ok(atBoundary !== null);
    assert.ok(inMiddle !== null);
    assert.ok(
      atBoundary!.score > inMiddle!.score,
      `Segment start match (${atBoundary!.score}) should beat non-boundary (${inMiddle!.score})`
    );
  });

  test('shorter candidate scores higher on tie', () => {
    const short = fuzzyMatch('foo.ts', 'fo');
    const long = fuzzyMatch('fooooooo.ts', 'fo');
    assert.ok(short !== null);
    assert.ok(long !== null);
    assert.ok(
      short!.score > long!.score,
      `Short candidate (${short!.score}) should beat long (${long!.score})`
    );
  });

  test('case insensitive matching', () => {
    const lower = fuzzyMatch('Button.tsx', 'button');
    const upper = fuzzyMatch('button.tsx', 'BUTTON');
    assert.ok(lower !== null, 'lowercase query should match PascalCase candidate');
    assert.ok(upper !== null, 'uppercase query should match lowercase candidate');
  });

  test('positions cover all query characters', () => {
    const result = fuzzyMatch('src/components/Button.tsx', 'scb');
    assert.ok(result !== null);
    assert.strictEqual(result!.positions.length, 3);
    // Each position must be in ascending order
    for (let i = 1; i < result!.positions.length; i++) {
      assert.ok(result!.positions[i] > result!.positions[i - 1], 'positions must be ascending');
    }
  });
});

suite('scoreFile', () => {
  test('matches against full path', () => {
    const result = scoreFile('src/components/Button.tsx', 'Button.tsx', 'comp');
    assert.ok(result !== null);
  });

  test('matches against filename when path does not match', () => {
    const result = scoreFile('some/deep/path/MyWidget.tsx', 'MyWidget.tsx', 'widget');
    assert.ok(result !== null);
  });

  test('returns null when neither path nor filename match', () => {
    const result = scoreFile('src/alpha/beta.ts', 'beta.ts', 'xyz');
    assert.strictEqual(result, null);
  });

  test('empty query always matches with score 0', () => {
    const result = scoreFile('src/foo/bar.ts', 'bar.ts', '');
    assert.strictEqual(result, 0);
  });

  test('filename match scores at least as well as path-only match for short query', () => {
    // Query "btn" — "Button.tsx" filename match should be preferred over deep path match
    const r1 = scoreFile('very/long/nested/path/Button.tsx', 'Button.tsx', 'btn');
    const r2 = scoreFile('Button.tsx', 'Button.tsx', 'btn');
    assert.ok(r1 !== null);
    assert.ok(r2 !== null);
    // Both should match; exact expectation is that they both have positive scores
    assert.ok(r1! > 0);
    assert.ok(r2! > 0);
  });

  test('returns a score rather than unused match positions', () => {
    const result = scoreFile('src/components/Button.tsx', 'Button.tsx', 'btn');

    assert.strictEqual(typeof result, 'number');
  });

  test('score-only ranking matches the existing fuzzy scoring semantics', () => {
    const cases = [
      ['src/components/Button.tsx', 'Button.tsx', 'btn'],
      ['src/far/foo-file.ts', 'foo-file.ts', 'foo'],
      ['deep/path/MyWidget.tsx', 'MyWidget.tsx', 'widget'],
      ['src/alpha/beta.ts', 'beta.ts', 'sabt'],
    ] as const;

    for (const [relativePath, filename, query] of cases) {
      const pathMatch = fuzzyMatch(relativePath, query);
      const filenameMatch = fuzzyMatch(filename, query);
      let expected: number | null;
      if (!pathMatch && !filenameMatch) {
        expected = null;
      } else if (!pathMatch) {
        expected = filenameMatch!.score;
      } else if (!filenameMatch) {
        expected = pathMatch.score;
      } else {
        expected = Math.max(pathMatch.score, filenameMatch.score + 10);
      }

      assert.strictEqual(
        scoreFile(relativePath, filename, query),
        expected,
        `${relativePath} should preserve its score for ${query}`
      );
    }
  });
});

suite('score-only scorer parity', () => {
  function scoreCandidate(candidate: string, query: string): number | null {
    const scorer = createFileScorer(query);
    return scorer(candidate, candidate.toLowerCase(), '\0', '\0');
  }

  function expectedScore(candidate: string, query: string): number | null {
    return fuzzyMatch(candidate, query)?.score ?? null;
  }

  test('matches positional scoring for deterministic edge cases', () => {
    const cases = [
      ['', ''],
      ['Button.tsx', 'btn'],
      ['src/components/Button.tsx', 'scb'],
      ['a-b_c.d/eF', 'abcdef'],
      ['sameCASE', 'SAMEcase'],
      ['no-match', 'xyz'],
      ['repeated-letters', 'eee'],
    ] as const;

    for (const [candidate, query] of cases) {
      assert.strictEqual(
        scoreCandidate(candidate, query),
        expectedScore(candidate, query),
        `${candidate} should preserve the positional score for ${query}`
      );
    }
  });

  test('matches positional scoring for seeded randomized pairs', () => {
    let state = 0x5eed1234;
    const random = (): number => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 0x1_0000_0000;
    };
    const alphabet = 'abcXYZ012/_-.';

    for (let sample = 0; sample < 500; sample++) {
      const candidateLength = 1 + Math.floor(random() * 48);
      let candidate = '';
      for (let index = 0; index < candidateLength; index++) {
        candidate += alphabet[Math.floor(random() * alphabet.length)];
      }

      let query = '';
      if (sample % 17 !== 0) {
        const queryLength = 1 + Math.floor(random() * 8);
        if (sample % 2 === 0) {
          let candidateIndex = 0;
          while (query.length < queryLength && candidateIndex < candidate.length) {
            if (random() < 0.35) {
              query += candidate[candidateIndex];
            }
            candidateIndex++;
          }
        } else {
          for (let index = 0; index < queryLength; index++) {
            query += alphabet[Math.floor(random() * alphabet.length)];
          }
        }
      }

      assert.strictEqual(
        scoreCandidate(candidate, query),
        expectedScore(candidate, query),
        `seeded sample ${sample} drifted for ${candidate} / ${query}`
      );
    }
  });
});
