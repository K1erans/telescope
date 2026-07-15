import * as vscode from 'vscode';
import * as path from 'path';
import { execFile } from 'child_process';
import { parseRipgrepPaths } from './inventoryparse';

export interface InventoryEntry {
  readonly uri: vscode.Uri;
  readonly relativePath: string;
  readonly filename: string;
}

interface CacheEntry {
  readonly files: readonly InventoryEntry[];
  readonly timestamp: number;
}

const cacheTtlMs = 30_000;

export class RipgrepInventory implements vscode.Disposable {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly disposables: vscode.Disposable[];
  private readonly output = vscode.window.createOutputChannel('PathFuzzy');

  constructor() {
    const invalidate = () => this.cache.clear();
    this.disposables = [
      this.output,
      vscode.workspace.onDidCreateFiles(invalidate),
      vscode.workspace.onDidDeleteFiles(invalidate),
      vscode.workspace.onDidRenameFiles(invalidate),
    ];
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.cache.clear();
  }

  async load(workspaceFolder: vscode.WorkspaceFolder): Promise<readonly InventoryEntry[]> {
    const cacheKey = workspaceFolder.uri.toString();
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cacheTtlMs) {
      return cached.files;
    }

    const files = await this.fetch(workspaceFolder);
    this.cache.set(cacheKey, { files, timestamp: Date.now() });
    return files;
  }

  private fetch(workspaceFolder: vscode.WorkspaceFolder): Promise<readonly InventoryEntry[]> {
    const config = vscode.workspace.getConfiguration('pathfuzzy');
    const includeHidden = config.get<boolean>('includeHidden', false);
    const defaultExcludes = config.get<string[]>('defaultExcludes', [
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
      execFile(
        'rg',
        args,
        { cwd: rootFsPath, maxBuffer: 50 * 1024 * 1024, env: environment },
        (error, stdout, stderr) => {
          if (error) {
            this.log(`[rg] error: ${error.message}`);
            if (stderr) {
              this.log(`[rg] stderr: ${stderr}`);
            }
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
              void vscode.window.showErrorMessage(
                'PathFuzzy: ripgrep (rg) not found. Install ripgrep and ensure rg is on PATH.'
              );
            }
            resolve([]);
            return;
          }

          const paths = parseRipgrepPaths(stdout);
          const entries = paths.map(({ relativePath, filename }) => Object.freeze({
            uri: vscode.Uri.file(path.join(rootFsPath, relativePath)),
            relativePath,
            filename,
          }));

          this.log(`[rg] indexed ${entries.length} files`);
          resolve(Object.freeze(entries));
        }
      );
    });
  }

  private log(message: string): void {
    this.output.appendLine(message);
  }
}
