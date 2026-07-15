import * as vscode from 'vscode';
import { InventoryEntry, RipgrepInventory } from './inventory';
import { createPickerModel, PickerModel } from './pickermodel';
import {
  FileQuickPickItem,
  PickerUpdateGeneration,
  toQuickPickItem,
} from './pickeritems';

export async function openPicker(
  inventory: RipgrepInventory,
  workspaceFolder?: vscode.WorkspaceFolder
): Promise<void> {
  const root = workspaceFolder ?? (await resolveWorkspaceFolder());
  if (!root) {
    vscode.window.showInformationMessage('Open a folder/workspace to search files.');
    return;
  }

  const config = vscode.workspace.getConfiguration('pathfuzzy');
  const debounceMs = config.get<number>('debounceMs', 100);
  const maxResults = config.get<number>('maxResults', 200);
  const showPreview = config.get<boolean>('showPreview', false);

  const qp = vscode.window.createQuickPick<FileQuickPickItem>();
  qp.title = 'PathFuzzy: Find Files';
  qp.placeholder = 'Type to search (use "src/" to scope to a directory)';
  qp.matchOnDescription = false;
  qp.matchOnDetail = false;

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let previewThrottle: ReturnType<typeof setTimeout> | undefined;
  let model: PickerModel | undefined;
  let entriesByPath = new Map<string, InventoryEntry>();
  let loadPromise: Promise<void> | undefined;
  const updateGeneration = new PickerUpdateGeneration();
  let disposed = false;

  const loadModel = async (): Promise<void> => {
    if (!loadPromise) {
      loadPromise = inventory.load(root).then(entries => {
        entriesByPath = new Map(entries.map(entry => [entry.relativePath, entry]));
        model = createPickerModel(entries);
      });
    }
    return loadPromise;
  };

  const updateItems = async (value: string): Promise<void> => {
    const generation = updateGeneration.begin();
    qp.busy = true;
    try {
      try {
        if (!model) {
          await loadModel();
        }
      } catch {
        model = createPickerModel([]);
      }

      if (disposed || !updateGeneration.isCurrent(generation) || !model) {
        return;
      }

      const isMultiRoot = (vscode.workspace.workspaceFolders?.length ?? 0) > 1;
      qp.items = model.update(value, maxResults)
        .map(row => toQuickPickItem(row, isMultiRoot ? root.name : undefined));
    } catch {
      if (!disposed && updateGeneration.isCurrent(generation)) {
        qp.items = [{
          label: '$(error) PathFuzzy could not update results.',
          alwaysShow: true,
        }];
      }
    } finally {
      if (!disposed && updateGeneration.isCurrent(generation)) {
        qp.busy = false;
      }
    }
  };

  const scheduleUpdate = (value: string): void => {
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      void updateItems(value);
    }, debounceMs);
  };

  void updateItems('');
  qp.onDidChangeValue(value => {
    scheduleUpdate(value);
  });

  if (showPreview) {
    qp.onDidChangeActive(items => {
      const item = items[0];
      const entry = item?.relativePath
        ? entriesByPath.get(item.relativePath)
        : undefined;
      if (!entry || item.drillPath) {
        return;
      }
      if (previewThrottle !== undefined) {
        clearTimeout(previewThrottle);
      }
      previewThrottle = setTimeout(() => {
        void vscode.commands.executeCommand('vscode.open', entry.uri, {
          preview: true,
          preserveFocus: true,
        });
      }, 150);
    });
  }

  qp.onDidAccept(() => {
    const selected = qp.activeItems[0];
    if (!selected) {
      return;
    }

    if (selected.drillPath) {
      qp.value = selected.drillPath;
      return;
    }

    const entry = selected.relativePath
      ? entriesByPath.get(selected.relativePath)
      : undefined;
    if (!entry) {
      return;
    }
    qp.hide();
    void vscode.window.showTextDocument(entry.uri, {
      preview: false,
      preserveFocus: false,
    });
  });

  qp.onDidHide(() => {
    disposed = true;
    updateGeneration.invalidate();
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer);
    }
    if (previewThrottle !== undefined) {
      clearTimeout(previewThrottle);
    }
    qp.dispose();
  });

  qp.show();
}

async function resolveWorkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return undefined;
  }

  if (folders.length === 1) {
    return folders[0];
  }

  const activeDoc = vscode.window.activeTextEditor?.document;
  if (activeDoc && !activeDoc.isUntitled) {
    const folder = vscode.workspace.getWorkspaceFolder(activeDoc.uri);
    if (folder) { return folder; }
  }

  const picked = await vscode.window.showQuickPick(
    folders.map(f => ({ label: f.name, description: f.uri.fsPath, folder: f })),
    { title: 'PathFuzzy: Select workspace folder', placeHolder: 'Choose a root to search' }
  );

  return picked?.folder;
}
