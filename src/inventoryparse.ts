export interface InventoryPath {
  readonly relativePath: string;
  readonly filename: string;
}

export function parseRipgrepPaths(stdout: string): readonly InventoryPath[] {
  const entries: InventoryPath[] = [];
  let lineStart = 0;

  for (let index = 0; index <= stdout.length; index++) {
    if (index < stdout.length && stdout.charCodeAt(index) !== 10) {
      continue;
    }

    const line = stdout.slice(lineStart, index).trim();
    lineStart = index + 1;
    if (line.length === 0) {
      continue;
    }

    const relativePath = normalizePath(line);
    const slashIndex = relativePath.lastIndexOf('/');
    entries.push(Object.freeze({
      relativePath,
      filename: relativePath.slice(slashIndex + 1),
    }));
  }

  return Object.freeze(entries);
}

function normalizePath(value: string): string {
  return value.includes('\\') ? value.replace(/\\/g, '/') : value;
}
