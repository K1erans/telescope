import * as path from 'path';
import Mocha from 'mocha';
// glob is a CommonJS module bundled with @vscode/test-electron; use require
// eslint-disable-next-line @typescript-eslint/no-require-imports
const globModule = require('glob') as { glob: (pattern: string, opts: { cwd: string }) => Promise<string[]> };

export async function run(): Promise<void> {
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 10000,
  });

  const testsRoot = path.resolve(__dirname);

  const files = await globModule.glob('**/*.test.js', { cwd: testsRoot });
  files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

  return new Promise((resolve, reject) => {
    mocha.run(failures => {
      if (failures > 0) {
        reject(new Error(`${failures} tests failed.`));
      } else {
        resolve();
      }
    });
  });
}
