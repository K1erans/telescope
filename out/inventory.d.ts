import * as vscode from 'vscode';
export interface InventoryEntry {
    readonly uri: vscode.Uri;
    readonly relativePath: string;
    readonly filename: string;
}
export declare class RipgrepInventory implements vscode.Disposable {
    private readonly cache;
    private readonly disposables;
    private readonly output;
    constructor();
    dispose(): void;
    load(workspaceFolder: vscode.WorkspaceFolder): Promise<readonly InventoryEntry[]>;
    private fetch;
    private log;
}
//# sourceMappingURL=inventory.d.ts.map