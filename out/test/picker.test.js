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
const pickeritems_1 = require("../pickeritems");
suite('QuickPick adapter', () => {
    test('rejects stale update generations', () => {
        const generations = new pickeritems_1.PickerUpdateGeneration();
        const first = generations.begin();
        const second = generations.begin();
        assert.strictEqual(generations.isCurrent(first), false);
        assert.strictEqual(generations.isCurrent(second), true);
        generations.invalidate();
        assert.strictEqual(generations.isCurrent(second), false);
    });
    test('maps typed rows to QuickPick items', () => {
        assert.deepStrictEqual((0, pickeritems_1.toQuickPickItem)({
            kind: 'directory',
            name: 'components',
            scopePrefix: 'src/',
            drillPath: 'src/components/',
        }, 'workspace'), {
            label: '$(folder) components/',
            description: 'src/',
            detail: 'workspace',
            alwaysShow: true,
            drillPath: 'src/components/',
        });
        assert.deepStrictEqual((0, pickeritems_1.toQuickPickItem)({
            kind: 'file',
            relativePath: 'src/main.ts',
            filename: 'main.ts',
            description: 'src/',
        }), {
            label: 'main.ts',
            description: 'src/',
            detail: undefined,
            alwaysShow: true,
            relativePath: 'src/main.ts',
        });
        assert.deepStrictEqual((0, pickeritems_1.toQuickPickItem)({
            kind: 'info',
            message: 'No files found in workspace.',
        }), {
            label: '$(info) No files found in workspace.',
            alwaysShow: true,
        });
    });
});
//# sourceMappingURL=picker.test.js.map