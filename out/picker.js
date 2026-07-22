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
const pickermodel_1 = require("./pickermodel");
const pickeritems_1 = require("./pickeritems");
async function openPicker(inventory, workspaceFolder) {
    const root = workspaceFolder ?? (await resolveWorkspaceFolder());
    if (!root) {
        vscode.window.showInformationMessage('Open a folder/workspace to search files.');
        return;
    }
    const config = vscode.workspace.getConfiguration('pathfuzzy');
    const debounceMs = config.get('debounceMs', 100);
    const maxResults = config.get('maxResults', 200);
    const showPreview = config.get('showPreview', false);
    const qp = vscode.window.createQuickPick();
    qp.title = 'PathFuzzy: Find Files';
    qp.placeholder = 'Type to search (use "src/" to scope to a directory)';
    qp.matchOnDescription = false;
    qp.matchOnDetail = false;
    let debounceTimer;
    let previewThrottle;
    let model;
    let entriesByPath = new Map();
    let loadPromise;
    const updateGeneration = new pickeritems_1.PickerUpdateGeneration();
    let disposed = false;
    const loadModel = async () => {
        if (!loadPromise) {
            loadPromise = inventory.load(root).then(entries => {
                entriesByPath = new Map(entries.map(entry => [entry.relativePath, entry]));
                model = (0, pickermodel_1.createPickerModel)(entries);
            });
        }
        return loadPromise;
    };
    const updateItems = async (value) => {
        const generation = updateGeneration.begin();
        qp.busy = true;
        try {
            try {
                if (!model) {
                    await loadModel();
                }
            }
            catch {
                model = (0, pickermodel_1.createPickerModel)([]);
            }
            if (disposed || !updateGeneration.isCurrent(generation) || !model) {
                return;
            }
            const isMultiRoot = (vscode.workspace.workspaceFolders?.length ?? 0) > 1;
            const contentQuery = model.contentQuery(value);
            const rows = contentQuery
                ? await contentRows(model, inventory, root, value, contentQuery, maxResults)
                : model.update(value, maxResults);
            if (disposed || !updateGeneration.isCurrent(generation)) {
                return;
            }
            qp.items = rows
                .map(row => (0, pickeritems_1.toQuickPickItem)(row, isMultiRoot ? root.name : undefined));
        }
        catch {
            if (!disposed && updateGeneration.isCurrent(generation)) {
                qp.items = [{
                        label: '$(error) PathFuzzy could not update results.',
                        alwaysShow: true,
                    }];
            }
        }
        finally {
            if (!disposed && updateGeneration.isCurrent(generation)) {
                qp.busy = false;
            }
        }
    };
    const scheduleUpdate = (value) => {
        if (debounceTimer !== undefined) {
            clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
            void updateItems(value);
        }, debounceMs);
    };
    void updateItems('');
    qp.onDidChangeValue(value => {
        scheduleUpdate(value);
    });
    if (showPreview) {
        qp.onDidChangeActive(items => {
            const item = items[0];
            const entry = item?.relativePath
                ? entriesByPath.get(item.relativePath)
                : undefined;
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
        if (selected.drillPath) {
            qp.value = selected.drillPath;
            return;
        }
        const entry = selected.relativePath
            ? entriesByPath.get(selected.relativePath)
            : undefined;
        if (!entry) {
            return;
        }
        qp.hide();
        void vscode.window.showTextDocument(entry.uri, {
            preview: false,
            preserveFocus: false,
        });
    });
    qp.onDidHide(() => {
        disposed = true;
        updateGeneration.invalidate();
        if (debounceTimer !== undefined) {
            clearTimeout(debounceTimer);
        }
        if (previewThrottle !== undefined) {
            clearTimeout(previewThrottle);
        }
        qp.dispose();
    });
    qp.show();
}
async function contentRows(model, inventory, root, input, query, maxResults) {
    const matches = await inventory.findContent(root, query);
    return model.contentMatches(input, matches, maxResults);
}
async function resolveWorkspaceFolder() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
        return undefined;
    }
    if (folders.length === 1) {
        return folders[0];
    }
    const activeDoc = vscode.window.activeTextEditor?.document;
    if (activeDoc && !activeDoc.isUntitled) {
        const folder = vscode.workspace.getWorkspaceFolder(activeDoc.uri);
        if (folder) {
            return folder;
        }
    }
    const picked = await vscode.window.showQuickPick(folders.map(f => ({ label: f.name, description: f.uri.fsPath, folder: f })), { title: 'PathFuzzy: Select workspace folder', placeHolder: 'Choose a root to search' });
    return picked?.folder;
}
//# sourceMappingURL=picker.js.map