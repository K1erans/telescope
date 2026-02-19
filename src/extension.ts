import * as vscode from 'vscode';
import { FileSearcher } from './search';
import { openPicker } from './picker';
import { initLogger } from './logger';

let searcher: FileSearcher | undefined;

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(initLogger());

  searcher = new FileSearcher();
  context.subscriptions.push(searcher);

  const findFilesCmd = vscode.commands.registerCommand('pathfuzzy.findFiles', () => {
    if (!searcher) { return; }
    void openPicker(searcher);
  });

  context.subscriptions.push(findFilesCmd);
}

export function deactivate(): void {
  searcher?.dispose();
  searcher = undefined;
}
