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
exports.openPicker = openPicker;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const search_1 = require("./search");
const fuzzy_1 = require("./fuzzy");
/**
 * Opens the PathFuzzy file picker for the given workspace folder.
 * If workspaceFolder is not supplied it will be determined automatically.
 */
async function openPicker(searcher, workspaceFolder) {
    const root = workspaceFolder ?? (await resolveWorkspaceFolder());
    if (!root) {
        vscode.window.showInformationMessage('Open a folder/workspace to search files.');
        return;
    }
    const config = vscode.workspace.getConfiguration('pathfuzzy');
    const debounceMs = config.get('debounceMs', 100);
    const maxResults = config.get('maxResults', 200);
    const showPreview = config.get('showPreview', false);
    const sortWhenEmpty = config.get('sortWhenEmpty', 'alphabetical');
    const qp = vscode.window.createQuickPick();
    qp.title = 'PathFuzzy: Find Files';
    qp.placeholder = 'Type to search (use "src/" to scope to a directory)';
    qp.matchOnDescription = false;
    qp.matchOnDetail = false;
    let debounceTimer;
    let lastScopePrefix = '';
    let previewDisposable;
    const updateItems = async (value) => {
        qp.busy = true;
        // Fetch all files first, then parse input against the real file list
        let allFiles;
        try {
            allFiles = await searcher.getAllFiles(root);
        }
        catch {
            allFiles = [];
        }
        const { scopePrefix, query } = (0, search_1.parseInput)(value, allFiles);
        const candidates = scopePrefix
            ? allFiles.filter(f => f.relativePath.startsWith(scopePrefix))
            : allFiles;
        if (candidates.length === 0) {
            const message = scopePrefix
                ? `No files in scope: ${scopePrefix}`
                : 'No files found in workspace.';
            qp.items = [
                {
                    label: '$(info) ' + message,
                    description: '',
                    alwaysShow: true,
                    fileEntry: null,
                },
            ];
            qp.busy = false;
            return;
        }
        lastScopePrefix = scopePrefix;
        let items;
        if (!query) {
            if (scopePrefix) {
                // Directory listing: show immediate subdirs first, then files at this level,
                // then deeper files — all sorted alphabetically within each group.
                items = buildDirectoryListing(candidates, scopePrefix, maxResults, root);
            }
            else {
                // No scope, no query: flat list sorted by configured strategy
                const sorted = sortWhenEmpty === 'alphabetical'
                    ? [...candidates].sort((a, b) => a.relativePath.localeCompare(b.relativePath))
                    : candidates;
                items = sorted.slice(0, maxResults).map(f => toPickItem(f, scopePrefix, root));
            }
        }
        else {
            // Score and rank
            const scored = [];
            for (const f of candidates) {
                // Score against path relative to scope
                const pathInScope = scopePrefix
                    ? f.relativePath.slice(scopePrefix.length)
                    : f.relativePath;
                const match = (0, fuzzy_1.scoreFile)(pathInScope, f.filename, query);
                if (match) {
                    scored.push({ item: toPickItem(f, scopePrefix, root), score: match.score });
                }
            }
            scored.sort((a, b) => b.score - a.score);
            items = scored.slice(0, maxResults).map(s => s.item);
        }
        qp.items = items;
        qp.busy = false;
    };
    const scheduleUpdate = (value) => {
        if (debounceTimer !== undefined) {
            clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => updateItems(value), debounceMs);
    };
    // Initial load
    void updateItems('');
    qp.onDidChangeValue(value => {
        scheduleUpdate(value);
    });
    // Preview on active item change (throttled — only when showPreview is on)
    let previewThrottle;
    if (showPreview) {
        qp.onDidChangeActive(items => {
            const item = items[0];
            const entry = item?.fileEntry;
            if (!entry || item.drillPath) {
                return;
            }
            if (previewThrottle !== undefined) {
                clearTimeout(previewThrottle);
            }
            previewThrottle = setTimeout(() => {
                void vscode.commands.executeCommand('vscode.open', entry.uri, {
                    preview: true,
                    preserveFocus: true,
                });
            }, 150);
        });
    }
    qp.onDidAccept(() => {
        const selected = qp.activeItems[0];
        if (!selected) {
            return;
        }
        // Directory item: drill into it by updating the input
        if (selected.drillPath) {
            qp.value = selected.drillPath;
            // updateItems will fire via onDidChangeValue
            return;
        }
        if (!selected.fileEntry) {
            return;
        }
        qp.hide();
        void vscode.window.showTextDocument(selected.fileEntry.uri, {
            preview: false,
            preserveFocus: false,
        });
    });
    qp.onDidHide(() => {
        if (debounceTimer !== undefined) {
            clearTimeout(debounceTimer);
        }
        if (previewThrottle !== undefined) {
            clearTimeout(previewThrottle);
        }
        previewDisposable?.dispose();
        qp.dispose();
    });
    qp.show();
}
function toPickItem(f, scopePrefix, root) {
    const pathInScope = scopePrefix ? f.relativePath.slice(scopePrefix.length) : f.relativePath;
    const dir = path.dirname(pathInScope);
    const isMultiRoot = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 1;
    return {
        label: f.filename,
        description: dir === '.' ? (scopePrefix || '') : (scopePrefix || '') + dir + '/',
        detail: isMultiRoot ? root.name : undefined,
        alwaysShow: true,
        fileEntry: f,
    };
}
/**
 * Builds a directory-listing view for when the user has typed a valid scope
 * prefix with no query. Shows:
 *   1. Immediate subdirectories ($(folder) icon, selectable to drill down)
 *   2. Files directly in the scope directory
 *   3. Files in deeper subdirectories (dimmed description showing full subpath)
 */
function buildDirectoryListing(candidates, scopePrefix, maxResults, root) {
    const isMultiRoot = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 1;
    // Strip the scope prefix to get each file's path relative to the scope root
    const relativized = candidates.map(f => ({
        f,
        rel: f.relativePath.slice(scopePrefix.length), // e.g. "components/Button.tsx"
    }));
    // Collect immediate subdirectory names (first path segment)
    const subdirSet = new Set();
    for (const { rel } of relativized) {
        const slash = rel.indexOf('/');
        if (slash !== -1) {
            subdirSet.add(rel.slice(0, slash));
        }
    }
    const subdirItems = [...subdirSet]
        .sort()
        .map(name => ({
        label: `$(folder) ${name}/`,
        description: scopePrefix,
        detail: isMultiRoot ? root.name : undefined,
        alwaysShow: true,
        fileEntry: null,
        drillPath: scopePrefix + name + '/',
    }));
    // Files directly in the scope (no slash in rel path)
    const directFiles = relativized
        .filter(({ rel }) => !rel.includes('/'))
        .sort((a, b) => a.rel.localeCompare(b.rel));
    const directItems = directFiles.map(({ f }) => ({
        label: f.filename,
        description: scopePrefix,
        detail: isMultiRoot ? root.name : undefined,
        alwaysShow: true,
        fileEntry: f,
    }));
    // Files in subdirectories
    const deepFiles = relativized
        .filter(({ rel }) => rel.includes('/'))
        .sort((a, b) => a.rel.localeCompare(b.rel));
    const deepItems = deepFiles.map(({ f, rel }) => ({
        label: f.filename,
        description: scopePrefix + path.dirname(rel) + '/',
        detail: isMultiRoot ? root.name : undefined,
        alwaysShow: true,
        fileEntry: f,
    }));
    return [...subdirItems, ...directItems, ...deepItems].slice(0, maxResults);
}
/**
 * Determines the workspace folder to use:
 *   1. Active editor's folder (if any).
 *   2. Single workspace folder.
 *   3. Prompt user to pick.
 */
async function resolveWorkspaceFolder() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
        return undefined;
    }
    if (folders.length === 1) {
        return folders[0];
    }
    // Try active editor
    const activeDoc = vscode.window.activeTextEditor?.document;
    if (activeDoc && !activeDoc.isUntitled) {
        const folder = vscode.workspace.getWorkspaceFolder(activeDoc.uri);
        if (folder) {
            return folder;
        }
    }
    // Ask user
    const picked = await vscode.window.showQuickPick(folders.map(f => ({ label: f.name, description: f.uri.fsPath, folder: f })), { title: 'PathFuzzy: Select workspace folder', placeHolder: 'Choose a root to search' });
    return picked?.folder;
}
//# sourceMappingURL=picker.js.map