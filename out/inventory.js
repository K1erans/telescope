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
exports.RipgrepInventory = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const invalidatablecache_1 = require("./invalidatablecache");
const inventoryparse_1 = require("./inventoryparse");
class RipgrepInventory {
    cache = new invalidatablecache_1.InvalidatableCache();
    disposables;
    output = vscode.window.createOutputChannel('PathFuzzy');
    constructor() {
        const invalidate = () => this.cache.invalidate();
        this.disposables = [
            this.output,
            vscode.workspace.onDidCreateFiles(invalidate),
            vscode.workspace.onDidDeleteFiles(invalidate),
            vscode.workspace.onDidRenameFiles(invalidate),
            vscode.workspace.onDidChangeConfiguration(event => {
                if (event.affectsConfiguration('pathfuzzy.includeHidden')
                    || event.affectsConfiguration('pathfuzzy.defaultExcludes')) {
                    invalidate();
                }
            }),
        ];
    }
    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.cache.invalidate();
    }
    async load(workspaceFolder) {
        const cacheKey = workspaceFolder.uri.toString();
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const generation = this.cache.beginLoad();
        const files = await this.fetch(workspaceFolder);
        this.cache.setIfCurrent(cacheKey, files, generation);
        return files;
    }
    fetch(workspaceFolder) {
        const config = vscode.workspace.getConfiguration('pathfuzzy');
        const includeHidden = config.get('includeHidden', false);
        const defaultExcludes = config.get('defaultExcludes', [
            'node_modules',
            '.git',
            'dist',
            'out',
            '.next',
        ]);
        const rootFsPath = workspaceFolder.uri.fsPath;
        const args = ['--files', '--follow'];
        if (includeHidden) {
            args.push('--hidden');
        }
        for (const exclude of defaultExcludes) {
            args.push('--glob', `!${exclude}`);
        }
        const environment = { ...process.env };
        environment.PATH = [
            environment.PATH,
            '/opt/homebrew/bin',
            '/usr/local/bin',
            '/usr/bin',
        ].filter(Boolean).join(':');
        this.log(`[rg] running: rg ${args.join(' ')} (cwd: ${rootFsPath})`);
        return new Promise(resolve => {
            (0, child_process_1.execFile)('rg', args, { cwd: rootFsPath, maxBuffer: 50 * 1024 * 1024, env: environment }, (error, stdout, stderr) => {
                if (error) {
                    this.log(`[rg] error: ${error.message}`);
                    if (stderr) {
                        this.log(`[rg] stderr: ${stderr}`);
                    }
                    if (error.code === 'ENOENT') {
                        void vscode.window.showErrorMessage('PathFuzzy: ripgrep (rg) not found. Install ripgrep and ensure rg is on PATH.');
                    }
                    resolve([]);
                    return;
                }
                const paths = (0, inventoryparse_1.parseRipgrepPaths)(stdout);
                const entries = paths.map(({ relativePath, filename }) => Object.freeze({
                    uri: vscode.Uri.file(path.join(rootFsPath, relativePath)),
                    relativePath,
                    filename,
                }));
                this.log(`[rg] indexed ${entries.length} files`);
                resolve(Object.freeze(entries));
            });
        });
    }
    log(message) {
        this.output.appendLine(message);
    }
}
exports.RipgrepInventory = RipgrepInventory;
//# sourceMappingURL=inventory.js.map