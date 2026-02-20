import * as vscode from 'vscode';
export interface FileEntry {
    uri: vscode.Uri;
    relativePath: string;
    filename: string;
}
export declare class FileSearcher {
    private cache;
    private watcherDisposables;
    constructor();
    dispose(): void;
    getAllFiles(workspaceFolder: vscode.WorkspaceFolder): Promise<FileEntry[]>;
    getFiles(workspaceFolder: vscode.WorkspaceFolder, scopePrefix: string): Promise<FileEntry[]>;
    private fetchWithRipgrep;
    clearCache(): void;
}
export declare function buildValidDirSet(allFiles: FileEntry[]): Set<string>;
/**
 * Parses input into a scope prefix and query.
 * Validates scope against the actual rg file list — not fs.stat —
 * so gitignored directories like __pycache__ are never matched.
 */
export declare function parseInput(input: string, allFiles: FileEntry[], validDirs?: ReadonlySet<string>): {
    scopePrefix: string;
    query: string;
};
//# sourceMappingURL=search.d.ts.map