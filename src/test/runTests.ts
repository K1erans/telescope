import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  const extensionDevelopmentPath = path.resolve(__dirname, '..', '..');
  const extensionTestsPath = path.resolve(__dirname, 'index');

  try {
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      version: '1.85.2',
    });
  } catch (err) {
    console.error('Failed to run tests', err);
    process.exit(1);
  }
}

void main();
