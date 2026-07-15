import * as vscode from 'vscode';
import { RipgrepInventory } from './inventory';
import { openPicker } from './picker';

let inventory: RipgrepInventory | undefined;

export function activate(context: vscode.ExtensionContext): void {
  inventory = new RipgrepInventory();
  context.subscriptions.push(inventory);

  const findFilesCmd = vscode.commands.registerCommand('pathfuzzy.findFiles', () => {
    if (!inventory) { return; }
    void openPicker(inventory);
  });

  context.subscriptions.push(findFilesCmd);
}

export function deactivate(): void {
  inventory?.dispose();
  inventory = undefined;
}
