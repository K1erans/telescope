import * as assert from 'assert';
import { PickerUpdateGeneration, toQuickPickItem } from '../pickeritems';

suite('QuickPick adapter', () => {
  test('rejects stale update generations', () => {
    const generations = new PickerUpdateGeneration();
    const first = generations.begin();
    const second = generations.begin();

    assert.strictEqual(generations.isCurrent(first), false);
    assert.strictEqual(generations.isCurrent(second), true);

    generations.invalidate();
    assert.strictEqual(generations.isCurrent(second), false);
  });

  test('maps typed rows to QuickPick items', () => {
    assert.deepStrictEqual(
      toQuickPickItem({
        kind: 'directory',
        name: 'components',
        scopePrefix: 'src/',
        drillPath: 'src/components/',
      }, 'workspace'),
      {
        label: '$(folder) components/',
        description: 'src/',
        detail: 'workspace',
        alwaysShow: true,
        drillPath: 'src/components/',
      }
    );

    assert.deepStrictEqual(
      toQuickPickItem({
        kind: 'file',
        relativePath: 'src/main.ts',
        filename: 'main.ts',
        description: 'src/',
      }),
      {
        label: 'main.ts',
        description: 'src/',
        detail: undefined,
        alwaysShow: true,
        relativePath: 'src/main.ts',
      }
    );

    assert.deepStrictEqual(
      toQuickPickItem({
        kind: 'info',
        message: 'No files found in workspace.',
      }),
      {
        label: '$(info) No files found in workspace.',
        alwaysShow: true,
      }
    );
  });
});
