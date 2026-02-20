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
exports.FileSearcher = void 0;
exports.buildValidDirSet = buildValidDirSet;
exports.parseInput = parseInput;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const logger_1 = require("./logger");
const CACHE_TTL_MS = 30_000;
class FileSearcher {
    cache = new Map();
    watcherDisposables = [];
    constructor() {
        const invalidate = () => this.cache.clear();
        this.watcherDisposables.push(vscode.workspace.onDidCreateFiles(invalidate), vscode.workspace.onDidDeleteFiles(invalidate), vscode.workspace.onDidRenameFiles(invalidate));
    }
    dispose() {
        for (const d of this.watcherDisposables) {
            d.dispose();
        }
        this.watcherDisposables = [];
        this.cache.clear();
    }
    async getAllFiles(workspaceFolder) {
        const cacheKey = `workspace:${workspaceFolder.uri.toString()}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return cached.files;
        }
        const files = await this.fetchWithRipgrep(workspaceFolder);
        this.cache.set(cacheKey, { files, timestamp: Date.now() });
        return files;
    }
    async getFiles(workspaceFolder, scopePrefix) {
        const allFiles = await this.getAllFiles(workspaceFolder);
        if (!scopePrefix) {
            return allFiles;
        }
        const normalizedScope = scopePrefix.endsWith('/') ? scopePrefix : scopePrefix + '/';
        return allFiles.filter(f => f.relativePath.startsWith(normalizedScope));
    }
    fetchWithRipgrep(workspaceFolder) {
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
        const args = [
            '--files',
            '--follow',
        ];
        if (includeHidden) {
            args.push('--hidden');
        }
        for (const exclude of defaultExcludes) {
            args.push('--glob', `!${exclude}`);
        }
        // Augment PATH so rg can be found even in the limited extension host environment
        const env = { ...process.env };
        env.PATH = [
            env.PATH,
            '/opt/homebrew/bin',
            '/usr/local/bin',
            '/usr/bin',
        ].filter(Boolean).join(':');
        return new Promise((resolve) => {
            (0, logger_1.log)(`[rg] running: rg ${args.join(' ')} (cwd: ${rootFsPath})`);
            (0, logger_1.log)(`[rg] PATH: ${env.PATH}`);
            (0, child_process_1.execFile)('rg', args, { cwd: rootFsPath, maxBuffer: 50 * 1024 * 1024, env }, (err, stdout, stderr) => {
                if (err) {
                    (0, logger_1.log)(`[rg] error: ${err.message}`);
                    (0, logger_1.log)(`[rg] stderr: ${stderr}`);
                    if (err.code === 'ENOENT') {
                        vscode.window.showErrorMessage('PathFuzzy: ripgrep (rg) not found. Install it with: brew install ripgrep');
                    }
                    resolve([]);
                    return;
                }
                const lines = stdout.split('\n').filter(l => l.trim());
                (0, logger_1.log)(`[rg] got ${lines.length} files`);
                if (lines.length > 0) {
                    (0, logger_1.log)(`[rg] first 5: ${lines.slice(0, 5).join(', ')}`);
                }
                const entries = [];
                for (const line of lines) {
                    const relativePath = toForwardSlashes(line.trim());
                    const filename = path.basename(relativePath);
                    const uri = vscode.Uri.file(path.join(rootFsPath, relativePath));
                    entries.push({ uri, relativePath, filename });
                }
                resolve(entries);
            });
        });
    }
    clearCache() {
        this.cache.clear();
    }
}
exports.FileSearcher = FileSearcher;
function toForwardSlashes(p) {
    return p.replace(/\\/g, '/');
}
function buildValidDirSet(allFiles) {
    const validDirs = new Set();
    for (const f of allFiles) {
        const parts = f.relativePath.split('/');
        let prefix = '';
        for (let i = 0; i < parts.length - 1; i++) {
            prefix += parts[i] + '/';
            validDirs.add(prefix);
        }
    }
    return validDirs;
}
/**
 * Parses input into a scope prefix and query.
 * Validates scope against the actual rg file list — not fs.stat —
 * so gitignored directories like __pycache__ are never matched.
 */
function parseInput(input, allFiles, validDirs = buildValidDirSet(allFiles)) {
    const normalized = input.replace(/\\/g, '/');
    const slashPositions = [];
    for (let i = 0; i < normalized.length; i++) {
        if (normalized[i] === '/') {
            slashPositions.push(i);
        }
    }
    if (slashPositions.length === 0) {
        return { scopePrefix: '', query: normalized };
    }
    // Try from longest to shortest prefix
    for (let i = slashPositions.length - 1; i >= 0; i--) {
        const prefix = normalized.slice(0, slashPositions[i] + 1);
        if (prefix.includes('../')) {
            continue;
        }
        if (validDirs.has(prefix)) {
            return {
                scopePrefix: prefix,
                query: normalized.slice(prefix.length),
            };
        }
    }
    return { scopePrefix: '', query: normalized };
}
//# sourceMappingURL=search.js.map