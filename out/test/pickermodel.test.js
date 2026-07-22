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
const assert = __importStar(require("assert"));
const pickermodel_1 = require("../pickermodel");
function makeFiles(paths) {
    return paths.map(relativePath => ({
        relativePath,
        filename: relativePath.split(/[\\/]/).pop(),
    }));
}
function fileRows(rows) {
    return rows.filter((row) => row.kind === 'file');
}
function directoryRows(rows) {
    return rows.filter((row) => row.kind === 'directory');
}
suite('PickerModel', () => {
    test('uses the longest valid scope and searches relative to it', () => {
        const model = (0, pickermodel_1.createPickerModel)(makeFiles([
            'src/utils/helpers.ts',
            'src/utils/format.ts',
            'src/main.ts',
        ]));
        const rows = fileRows(model.update('src/utils/help', 20));
        assert.deepStrictEqual(rows.map(row => row.relativePath), ['src/utils/helpers.ts']);
        assert.strictEqual(rows[0].description, 'src/utils/');
    });
    test('returns content-matching files for a literal multi-word query', () => {
        const model = (0, pickermodel_1.createPickerModel)(makeFiles([
            'src/cache.ts',
            'src/request.ts',
            'src/config.ts',
        ]));
        const rows = fileRows(model.contentMatches('const cache', makeFiles([
            'src/cache.ts',
            'src/request.ts',
        ]), 20));
        assert.deepStrictEqual(rows.map(row => row.relativePath), [
            'src/cache.ts',
            'src/request.ts',
        ]);
        assert.deepStrictEqual(fileRows(model.contentMatches('const cache', makeFiles([
            'src/cache.ts',
            'src/request.ts',
        ]), 1)).map(row => row.relativePath), ['src/cache.ts']);
    });
    test('uses the scoped portion of a multi-word content query', () => {
        const model = (0, pickermodel_1.createPickerModel)(makeFiles([
            'src/cache.ts',
            'src/request.ts',
            'test/cache.test.ts',
        ]));
        assert.strictEqual(model.contentQuery('src/const cache'), 'const cache');
        assert.deepStrictEqual(fileRows(model.contentMatches('src/const cache', makeFiles([
            'src/cache.ts',
            'src/request.ts',
            'test/cache.test.ts',
        ]), 20)).map(row => row.relativePath), ['src/cache.ts', 'src/request.ts']);
    });
    test('shows a content-specific empty state when no files match', () => {
        const model = (0, pickermodel_1.createPickerModel)(makeFiles(['src/cache.ts']));
        assert.deepStrictEqual(model.contentMatches('const cache', [], 20), [{
                kind: 'info',
                message: 'No files contain that text.',
            }]);
    });
    test('preserves literal whitespace in a content query', () => {
        const model = (0, pickermodel_1.createPickerModel)(makeFiles(['src/cache.ts']));
        assert.strictEqual(model.contentQuery(' const cache '), ' const cache ');
    });
    test('treats an invalid directory prefix as the query', () => {
        const model = (0, pickermodel_1.createPickerModel)(makeFiles(['src/main.ts']));
        assert.deepStrictEqual(model.update('not-a-directory/', 20), []);
    });
    test('normalizes backslashes in input and inventory paths', () => {
        const model = (0, pickermodel_1.createPickerModel)(makeFiles(['src\\components\\Button.tsx']));
        const rows = fileRows(model.update('src\\components\\but', 20));
        assert.deepStrictEqual(rows.map(row => row.relativePath), [
            'src/components/Button.tsx',
        ]);
    });
    test('does not treat parent traversal as a scope', () => {
        const model = (0, pickermodel_1.createPickerModel)(makeFiles(['src/main.ts']));
        const rows = model.update('../src/', 20);
        assert.strictEqual(directoryRows(rows).length, 0);
        assert.strictEqual(fileRows(rows).length, 0);
    });
    test('orders directory drill rows before direct and deep files', () => {
        const model = (0, pickermodel_1.createPickerModel)(makeFiles([
            'src/zeta/deep.ts',
            'src/alpha/deep.ts',
            'src/direct-b.ts',
            'src/direct-a.ts',
        ]));
        const rows = model.update('src/', 20);
        assert.deepStrictEqual(rows.map(row => {
            if (row.kind === 'directory') {
                return `directory:${row.name}:${row.drillPath}`;
            }
            if (row.kind === 'file') {
                return `file:${row.relativePath}`;
            }
            return `info:${row.message}`;
        }), [
            'directory:alpha:src/alpha/',
            'directory:zeta:src/zeta/',
            'file:src/direct-a.ts',
            'file:src/direct-b.ts',
            'file:src/alpha/deep.ts',
            'file:src/zeta/deep.ts',
        ]);
    });
    test('ranks by score and breaks score ties by path', () => {
        const model = (0, pickermodel_1.createPickerModel)(makeFiles([
            'z/foo.ts',
            'a/foo.ts',
            'src/far-foo-file.ts',
        ]));
        const rows = fileRows(model.update('foo', 20));
        assert.deepStrictEqual(rows.slice(0, 2).map(row => row.relativePath), [
            'a/foo.ts',
            'z/foo.ts',
        ]);
    });
    test('truncates ranked and directory results', () => {
        const model = (0, pickermodel_1.createPickerModel)(makeFiles([
            'src/a/file.ts',
            'src/b/file.ts',
            'src/c/file.ts',
            'src/direct.ts',
        ]));
        assert.strictEqual(model.update('file', 2).length, 2);
        assert.deepStrictEqual(directoryRows(model.update('src/', 2)).map(row => row.name), ['a', 'b']);
        assert.strictEqual(model.update('src/', 20).length, 7);
    });
    test('returns immutable row collections and rows', () => {
        const model = (0, pickermodel_1.createPickerModel)(makeFiles([
            'src/components/Button.tsx',
            'src/main.ts',
        ]));
        for (const rows of [
            model.update('', 20),
            model.update('src/', 20),
            model.update('button', 20),
        ]) {
            assert.strictEqual(Object.isFrozen(rows), true);
            assert.strictEqual(rows.every(Object.isFrozen), true);
        }
    });
    test('returns root files alphabetically for empty input', () => {
        const model = (0, pickermodel_1.createPickerModel)(makeFiles(['z.ts', 'a.ts', 'm.ts']));
        assert.deepStrictEqual(fileRows(model.update('', 20)).map(row => row.relativePath), ['a.ts', 'm.ts', 'z.ts']);
    });
    test('returns a typed information row for an empty inventory', () => {
        const model = (0, pickermodel_1.createPickerModel)([]);
        assert.deepStrictEqual(model.update('', 20), [{
                kind: 'info',
                message: 'No files found in workspace.',
            }]);
    });
});
//# sourceMappingURL=pickermodel.test.js.map