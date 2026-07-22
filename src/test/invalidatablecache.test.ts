import * as assert from 'assert';
import { InvalidatableCache } from '../invalidatablecache';

suite('invalidatable cache', () => {
  test('does not cache a scan that completed after invalidation', () => {
    const cache = new InvalidatableCache<readonly string[]>();
    const generation = cache.beginLoad();

    cache.invalidate();

    assert.strictEqual(
      cache.setIfCurrent('workspace', ['stale'], generation),
      false
    );
    assert.strictEqual(cache.get('workspace'), undefined);
  });

  test('caches a scan when no invalidation occurred', () => {
    const cache = new InvalidatableCache<readonly string[]>();
    const generation = cache.beginLoad();
    const files = Object.freeze(['current']);

    assert.strictEqual(cache.setIfCurrent('workspace', files, generation), true);
    assert.strictEqual(cache.get('workspace'), files);
  });
});
