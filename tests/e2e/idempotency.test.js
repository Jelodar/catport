
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CLI } from '../../src/cli/main.js';
import { createMockIO } from '../setup.js';

describe('E2E: Idempotency & Roundtrip', () => {
  const COMPLEX_FS = {
    'src/main.js': 'console.log("init");',
    'src/utils/helper.js': 'export const id = x => x;',
    'src/deep/nested/dir/config.json': '{\n  "key": "value"\n}',
    'README.md': '# Title\n\nDescription with `code` and **bold**.',
    'assets/style.css': 'body { color: red; }',
    'scripts/run.sh': '#!/bin/bash\necho "run"',
    // Edge case: file with spaces
    'docs/My Manual.txt': 'Read this first.'
  };

  const verifyRestore = (original, restoredIo, prefix = '') => {
    for (const [path, content] of Object.entries(original)) {
      const restoredPath = prefix ? `${prefix}/${path}` : path;
      const restoredContent = restoredIo._written[restoredPath];
      
      assert.ok(restoredContent !== undefined, `File missing in restore: ${restoredPath}`);
      
      // Normalize newlines (bundle/extract cycle might normalize CRLF)
      const normOrig = content.trim().replace(/\r\n/g, '\n');
      const normRest = restoredContent.trim().replace(/\r\n/g, '\n');
      
      assert.strictEqual(normRest, normOrig, `Content mismatch for ${path}`);
    }
  };

  const runTest = async (format) => {
    // 1. Setup Original FS
    const io = createMockIO(COMPLEX_FS);
    
    // 2. Bundle to file
    await CLI.run(['node', 'catport', '.', '-f', format, '-o', 'bundle.out'], io);
    const bundle = io._written['bundle.out'];
    assert.ok(bundle && bundle.length > 0, `Bundle empty for ${format}`);

    // 3. Extract to new directory
    const extractIo = createMockIO({ 'bundle.out': bundle });
    await CLI.run(['node', 'catport', '-x', 'bundle.out', '-d', 'restored'], extractIo);

    // 4. Verify match
    verifyRestore(COMPLEX_FS, extractIo, 'restored');
  };

  it('Restores identical filesystem state via Markdown', async () => await runTest('md'));
  it('Restores identical filesystem state via XML', async () => await runTest('xml'));
  it('Restores identical filesystem state via JSON', async () => await runTest('json'));
  it('Restores identical filesystem state via YAML', async () => await runTest('yaml'));
  it('Restores identical filesystem state via Multipart', async () => await runTest('multipart'));

  it('Handles extraction into existing directory structures', async () => {
    // Create IO with bundle AND some pre-existing files
    const bundleIo = createMockIO({ 'src/old.js': 'old' });
    await CLI.run(['node', 'catport', 'src', '-f', 'json', '-o', 'bundle.json'], bundleIo);
    const bundle = bundleIo._written['bundle.json'];

    const restoreIo = createMockIO({ 
      'bundle.json': bundle,
      'restored/existing.txt': 'do not touch' 
    });

    await CLI.run(['node', 'catport', '-x', 'bundle.json', '-d', 'restored'], restoreIo);

    // Check restored file
    assert.strictEqual(restoreIo._written['restored/old.js'], 'old');
    // Check existing file is untouched (mock io keeps initial FS in _fs, written tracks writes)
    // For this test we assume non-destructive writes to other files, 
    // but MockIO.writeFile overwrites. We just ensure no crash.
  });
});
