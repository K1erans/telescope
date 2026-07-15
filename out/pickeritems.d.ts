import type * as vscode from 'vscode';
import { PickerRow } from './pickermodel';
export interface FileQuickPickItem extends vscode.QuickPickItem {
    readonly relativePath?: string;
    readonly drillPath?: string;
}
export declare class PickerUpdateGeneration {
    private generation;
    begin(): number;
    isCurrent(generation: number): boolean;
    invalidate(): void;
}
export declare function toQuickPickItem(row: PickerRow, workspaceName?: string): FileQuickPickItem;
//# sourceMappingURL=pickeritems.d.ts.map