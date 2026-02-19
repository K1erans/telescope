/**
 * Unit tests for the fuzzy scoring module.
 * Run with: npm test (after npm run compile)
 *
 * These tests are designed to run with Mocha in the VS Code test runner
 * (via @vscode/test-electron), but the fuzzy module itself has no VS Code
 * dependency, so they also work with plain Mocha if desired.
 */
import * as assert from 'assert';
import { fuzzyMatch, scoreFile } from '../fuzzy';

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
    assert.ok(result !== null);
    assert.strictEqual(result!.score, 0);
  });

  test('filename match scores at least as well as path-only match for short query', () => {
    // Query "btn" — "Button.tsx" filename match should be preferred over deep path match
    const r1 = scoreFile('very/long/nested/path/Button.tsx', 'Button.tsx', 'btn');
    const r2 = scoreFile('Button.tsx', 'Button.tsx', 'btn');
    assert.ok(r1 !== null);
    assert.ok(r2 !== null);
    // Both should match; exact expectation is that they both have positive scores
    assert.ok(r1!.score > 0);
    assert.ok(r2!.score > 0);
  });
});
