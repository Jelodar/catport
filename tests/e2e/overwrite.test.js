import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CLI } from '../../src/cli/main.js';
import { createMockIO } from '../setup.js';
import { FILE_MARKER } from '../../src/formatters/markdown.js';

describe('E2E: Overwrite Existing', () => {
  it('bundles and extracts over existing files ensuring idempotency', async () => {
    const fs = {
      'src/a.js': 'const a = 1;',
      'src/b.js': 'const b = 2;',
      'README.md': '# Hello World'
    };
    const io = createMockIO(fs);

    await CLI.run(['node', 'catport', '.', '-o', 'bundle.md'], io);
    const bundle = io._written['bundle.md'];
    assert.ok(bundle.length > 0);

    await CLI.run(['node', 'catport', '-x', 'bundle.md', '-d', '.'], io);

    assert.strictEqual(io._written['src/a.js'], 'const a = 1;');
    assert.strictEqual(io._written['src/b.js'], 'const b = 2;');
    assert.strictEqual(io._written['README.md'], '# Hello World');
  });

  it('updates files with new content from bundle', async () => {
    const fs = {
      'file.txt': 'old content'
    };
    const io = createMockIO(fs);

    const newBundle = `${FILE_MARKER} file.txt` + '\n```\nnew content\n```';
    io.writeFile('bundle.md', newBundle);
    io._fs['bundle.md'] = newBundle;

    await CLI.run(['node', 'catport', '-x', 'bundle.md', '-d', '.'], io);

    assert.strictEqual(io._written['file.txt'], 'new content');
  });

  it('creates new files from bundle', async () => {
    const fs = { 'existing.txt': 'A' };
    const io = createMockIO(fs);

    const bundle = `${FILE_MARKER} new.txt` + '\n```\nB\n```';
    io._fs['bundle.md'] = bundle;

    await CLI.run(['node', 'catport', '-x', 'bundle.md', '-d', '.'], io);

    assert.strictEqual(io._written['existing.txt'], undefined); 
    assert.strictEqual(io._fs['existing.txt'], 'A');
    assert.strictEqual(io._written['new.txt'], 'B');
  });
});
