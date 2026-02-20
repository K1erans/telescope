import * as vscode from 'vscode';
import * as path from 'path';
import { execFile } from 'child_process';
import { log } from './logger';

export interface FileEntry {
  uri: vscode.Uri;
  relativePath: string;
  filename: string;
}

type CacheKey = string;

interface CacheEntry {
  files: FileEntry[];
  timestamp: number;
}

const CACHE_TTL_MS = 30_000;

export class FileSearcher {
  private cache = new Map<CacheKey, CacheEntry>();
  private watcherDisposables: vscode.Disposable[] = [];

  constructor() {
    const invalidate = () => this.cache.clear();
    this.watcherDisposables.push(
      vscode.workspace.onDidCreateFiles(invalidate),
      vscode.workspace.onDidDeleteFiles(invalidate),
      vscode.workspace.onDidRenameFiles(invalidate)
    );
  }

  dispose(): void {
    for (const d of this.watcherDisposables) {
      d.dispose();
    }
    this.watcherDisposables = [];
    this.cache.clear();
  }

  async getAllFiles(workspaceFolder: vscode.WorkspaceFolder): Promise<FileEntry[]> {
    const cacheKey = `workspace:${workspaceFolder.uri.toString()}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.files;
    }

    const files = await this.fetchWithRipgrep(workspaceFolder);
    this.cache.set(cacheKey, { files, timestamp: Date.now() });
    return files;
  }

  async getFiles(
    workspaceFolder: vscode.WorkspaceFolder,
    scopePrefix: string
  ): Promise<FileEntry[]> {
    const allFiles = await this.getAllFiles(workspaceFolder);

    if (!scopePrefix) {
      return allFiles;
    }

    const normalizedScope = scopePrefix.endsWith('/') ? scopePrefix : scopePrefix + '/';
    return allFiles.filter(f => f.relativePath.startsWith(normalizedScope));
  }

  private fetchWithRipgrep(workspaceFolder: vscode.WorkspaceFolder): Promise<FileEntry[]> {
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
      log(`[rg] running: rg ${args.join(' ')} (cwd: ${rootFsPath})`);
      log(`[rg] PATH: ${env.PATH}`);
      execFile('rg', args, { cwd: rootFsPath, maxBuffer: 50 * 1024 * 1024, env }, (err, stdout, stderr) => {
        if (err) {
          log(`[rg] error: ${err.message}`);
          log(`[rg] stderr: ${stderr}`);
          if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
            vscode.window.showErrorMessage('PathFuzzy: ripgrep (rg) not found. Install it with: brew install ripgrep');
          }
          resolve([]);
          return;
        }

        const lines = stdout.split('\n').filter(l => l.trim());
        log(`[rg] got ${lines.length} files`);
        if (lines.length > 0) {
          log(`[rg] first 5: ${lines.slice(0, 5).join(', ')}`);
        }

        const entries: FileEntry[] = [];
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

  clearCache(): void {
    this.cache.clear();
  }
}

function toForwardSlashes(p: string): string {
  return p.replace(/\\/g, '/');
}

export function buildValidDirSet(allFiles: FileEntry[]): Set<string> {
  const validDirs = new Set<string>();
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
export function parseInput(
  input: string,
  allFiles: FileEntry[],
  validDirs: ReadonlySet<string> = buildValidDirSet(allFiles)
): { scopePrefix: string; query: string } {
  const normalized = input.replace(/\\/g, '/');

  const slashPositions: number[] = [];
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
