import * as vscode from 'vscode';
import { FileSearcher } from './search';
/**
 * Opens the PathFuzzy file picker for the given workspace folder.
 * If workspaceFolder is not supplied it will be determined automatically.
 */
export declare function openPicker(searcher: FileSearcher, workspaceFolder?: vscode.WorkspaceFolder): Promise<void>;
//# sourceMappingURL=picker.d.ts.map