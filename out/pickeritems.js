"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PickerUpdateGeneration = void 0;
exports.toQuickPickItem = toQuickPickItem;
class PickerUpdateGeneration {
    generation = 0;
    begin() {
        return ++this.generation;
    }
    isCurrent(generation) {
        return generation === this.generation;
    }
    invalidate() {
        this.generation++;
    }
}
exports.PickerUpdateGeneration = PickerUpdateGeneration;
function toQuickPickItem(row, workspaceName) {
    if (row.kind === 'info') {
        return {
            label: `$(info) ${row.message}`,
            alwaysShow: true,
        };
    }
    if (row.kind === 'directory') {
        return {
            label: `$(folder) ${row.name}/`,
            description: row.scopePrefix,
            detail: workspaceName,
            alwaysShow: true,
            drillPath: row.drillPath,
        };
    }
    return {
        label: row.filename,
        description: row.description,
        detail: workspaceName,
        alwaysShow: true,
        relativePath: row.relativePath,
    };
}
//# sourceMappingURL=pickeritems.js.map