import type * as vscode from 'vscode';
import { PickerRow } from './pickermodel';

export interface FileQuickPickItem extends vscode.QuickPickItem {
  readonly relativePath?: string;
  readonly drillPath?: string;
}

export class PickerUpdateGeneration {
  private generation = 0;

  begin(): number {
    return ++this.generation;
  }

  isCurrent(generation: number): boolean {
    return generation === this.generation;
  }

  invalidate(): void {
    this.generation++;
  }
}

export function toQuickPickItem(
  row: PickerRow,
  workspaceName?: string
): FileQuickPickItem {
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
