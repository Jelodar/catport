import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CLI } from '../../src/cli/main.js';
import { createMockIO } from '../setup.js';
import { FILE_MARKER } from '../../src/formatters/markdown.js';

describe('Integration: Lifecycle', () => {
  it('bundles modifies and verifies diff', async () => {
    const fs = {
      'src/main.js': 'v1',
      'src/utils.js': 'v1'
    };
    const io = createMockIO(fs);

    await CLI.run(['node', 'catport', '.', '-o', 'v1.md'], io);
    assert.ok(io._written['v1.md']);

    io._fs['src/main.js'] = 'v2';
    
    io.exec = async (cmd) => {
      if (cmd.includes('rev-parse')) {
        return io.cwd();
      }
      if (cmd.includes('diff')) {
        return 'src/main.js\0';
      }
      return '';
    };

    await CLI.run(['node', 'catport', '-g', 'HEAD', '-o', 'diff.md'], io);
    
    const diffContent = io._written['diff.md'];
    assert.ok(diffContent.includes('src/main.js'));
    assert.ok(!diffContent.includes('src/utils.js'));
    assert.ok(diffContent.includes('v2'));
  });

  it('handles binary file changes in lifecycle', async () => {
    const fs = {
      'binaryfile': Buffer.from([0, 0, 0])
    };
    const io = createMockIO(fs);

    await CLI.run(['node', 'catport', '.'], io);
    const out = io._stdout.join('');
    assert.ok(out.includes('(binary omitted)'));
  });

  it('respects extraction directory isolation', async () => {
    const fs = { 'bundle.md': `${FILE_MARKER} outside.txt` + '\n```\nA\n```' };
    const io = createMockIO(fs);

    await CLI.run(['node', 'catport', '-x', 'bundle.md', '-d', 'dist'], io);
    
    assert.strictEqual(io._written['dist/outside.txt'], 'A');
    assert.strictEqual(io._written['outside.txt'], undefined);
  });
});
