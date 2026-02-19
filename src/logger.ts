import * as vscode from 'vscode';

export let outputChannel: vscode.OutputChannel;

export function initLogger(): vscode.OutputChannel {
  outputChannel = vscode.window.createOutputChannel('PathFuzzy');
  return outputChannel;
}

export function log(msg: string): void {
  outputChannel?.appendLine(msg);
}
