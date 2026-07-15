import * as assert from 'assert';
import { parseRipgrepPaths } from '../inventoryparse';

suite('ripgrep inventory parser', () => {
  test('returns an immutable empty inventory for empty stdout', () => {
    const entries = parseRipgrepPaths('');

    assert.deepStrictEqual(entries, []);
    assert.strictEqual(Object.isFrozen(entries), true);
  });

  test('normalizes Windows separators and derives filenames', () => {
    const entries = parseRipgrepPaths(
      'src\\components\\Button.tsx\r\nREADME.md\n\n'
    );

    assert.deepStrictEqual(entries, [
      {
        relativePath: 'src/components/Button.tsx',
        filename: 'Button.tsx',
      },
      {
        relativePath: 'README.md',
        filename: 'README.md',
      },
    ]);
    assert.strictEqual(entries.every(Object.isFrozen), true);
  });
});
