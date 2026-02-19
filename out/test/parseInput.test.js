"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Unit tests for input parsing logic.
 * parseInput is now pure (no VS Code API calls) — validated against a file list.
 */
const assert = __importStar(require("assert"));
const search_1 = require("../search");
const vscode = __importStar(require("vscode"));
function makeFiles(paths) {
    return paths.map(p => ({
        uri: vscode.Uri.file('/' + p),
        relativePath: p,
        filename: p.split('/').pop(),
    }));
}
suite('parseInput — unit logic', () => {
    test('plain query with no slash returns empty scope and full query', () => {
        const { scopePrefix, query } = (0, search_1.parseInput)('foo', makeFiles(['tests/a.py', 'src/b.ts']));
        assert.strictEqual(scopePrefix, '');
        assert.strictEqual(query, 'foo');
    });
    test('valid directory prefix "tests/" scopes correctly', () => {
        const files = makeFiles(['tests/submission_tests.py', 'tests/frozen_problem.py', 'src/main.ts']);
        const { scopePrefix, query } = (0, search_1.parseInput)('tests/', files);
        assert.strictEqual(scopePrefix, 'tests/');
        assert.strictEqual(query, '');
    });
    test('valid directory prefix with query remainder', () => {
        const files = makeFiles(['tests/submission_tests.py', 'src/main.ts']);
        const { scopePrefix, query } = (0, search_1.parseInput)('tests/sub', files);
        assert.strictEqual(scopePrefix, 'tests/');
        assert.strictEqual(query, 'sub');
    });
    test('non-existent directory prefix treated as plain query', () => {
        const files = makeFiles(['src/main.ts']);
        const { scopePrefix, query } = (0, search_1.parseInput)('notadirectory/', files);
        assert.strictEqual(scopePrefix, '');
        assert.strictEqual(query, 'notadirectory/');
    });
    test('gitignored directory (__pycache__) is NOT a valid scope', () => {
        // __pycache__ files are excluded by rg, so they never appear in allFiles
        const files = makeFiles(['tests/submission_tests.py', 'src/main.ts']);
        const { scopePrefix, query } = (0, search_1.parseInput)('tests/__pycache__/', files);
        assert.strictEqual(scopePrefix, 'tests/');
        assert.strictEqual(query, '__pycache__/');
    });
    test('longest valid prefix wins', () => {
        const files = makeFiles(['src/utils/helpers.ts', 'src/main.ts']);
        const { scopePrefix, query } = (0, search_1.parseInput)('src/utils/foo', files);
        assert.strictEqual(scopePrefix, 'src/utils/');
        assert.strictEqual(query, 'foo');
    });
    test('backslashes are normalized to forward slashes', () => {
        const files = makeFiles(['src/main.ts']);
        const { scopePrefix, query } = (0, search_1.parseInput)('src\\main', files);
        assert.strictEqual(scopePrefix, 'src/');
        assert.strictEqual(query, 'main');
    });
    test('empty input returns empty scope and empty query', () => {
        const { scopePrefix, query } = (0, search_1.parseInput)('', makeFiles([]));
        assert.strictEqual(scopePrefix, '');
        assert.strictEqual(query, '');
    });
    test('../ prefix is always blocked', () => {
        const files = makeFiles(['src/main.ts']);
        const { scopePrefix } = (0, search_1.parseInput)('../src/', files);
        assert.strictEqual(scopePrefix, '');
    });
});
//# sourceMappingURL=parseInput.test.js.map