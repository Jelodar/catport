import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Git } from '../../src/utils/git.js';
import { resolve } from 'node:path';
import { createMockIO } from '../setup.js';

describe('Unit: Git', () => {
  it('Parses changed files correctly', async () => {
    const io = createMockIO();
    io.exec = async (cmd) => {
      if (cmd.includes('rev-parse')) {
        return '/root';
      }
      if (cmd.includes('diff')) {
        return 'src/a.js\0src/b.js\0';
      }
      return '';
    };
    const files = await Git.getChangedFiles(io);
    assert.ok(files.has(resolve('/root/src/a.js')));
    assert.ok(files.has(resolve('/root/src/b.js')));
  });

  it('Returns null on error', async () => {
    const io = createMockIO();
    io.exec = async () => {
      throw new Error('fail'); 
    };
    const res = await Git.getChangedFiles(io);
    assert.strictEqual(res, null);
  });
  
  it('Returns empty set if no output', async () => {
    const io = createMockIO();
    io.exec = async (cmd) => {
      if (cmd.includes('rev-parse')) {
        return '/root';
      }
      return '';
    };
    const res = await Git.getChangedFiles(io);
    assert.strictEqual(res.size, 0);
  });

  it('Uses provided CWD', async () => {
    const io = createMockIO();
    let capturedCwd;
    io.exec = async (cmd, cwd) => {
      capturedCwd = cwd;
      return '/root';
    };
    await Git.getChangedFiles(io, 'HEAD', '/custom/path');
    assert.strictEqual(capturedCwd, '/custom/path');
  });

  it('Throws on invalid git reference (security)', async () => {
    const io = createMockIO();
    // Try to inject a command separator
    await assert.rejects(
      async () => Git.getChangedFiles(io, 'HEAD; rm -rf /'),
      /Invalid git reference/
    );
  });
});
