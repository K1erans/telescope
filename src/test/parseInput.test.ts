/**
 * Unit tests for input parsing logic.
 * parseInput is now pure (no VS Code API calls) — validated against a file list.
 */
import * as assert from 'assert';
import { parseInput, FileEntry } from '../search';
import * as vscode from 'vscode';

function makeFiles(paths: string[]): FileEntry[] {
  return paths.map(p => ({
    uri: vscode.Uri.file('/' + p),
    relativePath: p,
    filename: p.split('/').pop()!,
  }));
}

suite('parseInput — unit logic', () => {
  test('plain query with no slash returns empty scope and full query', () => {
    const { scopePrefix, query } = parseInput('foo', makeFiles(['tests/a.py', 'src/b.ts']));
    assert.strictEqual(scopePrefix, '');
    assert.strictEqual(query, 'foo');
  });

  test('valid directory prefix "tests/" scopes correctly', () => {
    const files = makeFiles(['tests/submission_tests.py', 'tests/frozen_problem.py', 'src/main.ts']);
    const { scopePrefix, query } = parseInput('tests/', files);
    assert.strictEqual(scopePrefix, 'tests/');
    assert.strictEqual(query, '');
  });

  test('valid directory prefix with query remainder', () => {
    const files = makeFiles(['tests/submission_tests.py', 'src/main.ts']);
    const { scopePrefix, query } = parseInput('tests/sub', files);
    assert.strictEqual(scopePrefix, 'tests/');
    assert.strictEqual(query, 'sub');
  });

  test('non-existent directory prefix treated as plain query', () => {
    const files = makeFiles(['src/main.ts']);
    const { scopePrefix, query } = parseInput('notadirectory/', files);
    assert.strictEqual(scopePrefix, '');
    assert.strictEqual(query, 'notadirectory/');
  });

  test('gitignored directory (__pycache__) is NOT a valid scope', () => {
    // __pycache__ files are excluded by rg, so they never appear in allFiles
    const files = makeFiles(['tests/submission_tests.py', 'src/main.ts']);
    const { scopePrefix, query } = parseInput('tests/__pycache__/', files);
    assert.strictEqual(scopePrefix, 'tests/');
    assert.strictEqual(query, '__pycache__/');
  });

  test('longest valid prefix wins', () => {
    const files = makeFiles(['src/utils/helpers.ts', 'src/main.ts']);
    const { scopePrefix, query } = parseInput('src/utils/foo', files);
    assert.strictEqual(scopePrefix, 'src/utils/');
    assert.strictEqual(query, 'foo');
  });

  test('backslashes are normalized to forward slashes', () => {
    const files = makeFiles(['src/main.ts']);
    const { scopePrefix, query } = parseInput('src\\main', files);
    assert.strictEqual(scopePrefix, 'src/');
    assert.strictEqual(query, 'main');
  });

  test('empty input returns empty scope and empty query', () => {
    const { scopePrefix, query } = parseInput('', makeFiles([]));
    assert.strictEqual(scopePrefix, '');
    assert.strictEqual(query, '');
  });

  test('../ prefix is always blocked', () => {
    const files = makeFiles(['src/main.ts']);
    const { scopePrefix } = parseInput('../src/', files);
    assert.strictEqual(scopePrefix, '');
  });
});
