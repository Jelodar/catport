import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CLI } from '../../src/cli/main.js';
import { EXIT } from '../../src/config/constants.js';
import { FILE_MARKER } from '../../src/formatters/markdown.js';
import { createMockIO } from '../setup.js';

describe('Unit: CLI Main', () => {
  it('displays help and exits', async () => {
    const io = createMockIO();
    await CLI.run(['node', 'bin', '--help'], io);
    assert.match(io._stdout.join(''), /USAGE/);
  });

  it('displays version and exits', async () => {
    const io = createMockIO();
    await CLI.run(['node', 'bin', '--version'], io);
    assert.match(io._stdout.join(''), /v/);
  });

  it('runs extractor when flag is present', async () => {
    const io = createMockIO({ 'bundle.md': `${FILE_MARKER} a.txt` + '\n```\nA\n```' });
    await CLI.run(['node', 'bin', '-x', 'bundle.md'], io);
    assert.strictEqual(io._written['a.txt'], 'A');
  });

  it('runs bundler by default', async () => {
    const io = createMockIO({ 'a.txt': 'A' });
    await CLI.run(['node', 'bin', 'a.txt'], io);
    assert.match(io._stdout.join(''), /a\.txt/);
  });

  it('handles git diff mode errors', async () => {
    const io = createMockIO();
    io.exec = async () => {
      throw new Error('git fail'); 
    };
    await CLI.run(['node', 'bin', '-g'], io);
    assert.ok(io._logs.some(l => l.includes('git command failed')));
    assert.ok(io._logs.includes(`EXIT ${EXIT.ERROR}`));
  });

  it('handles missing files in bundler', async () => {
    const io = createMockIO();
    await CLI.run(['node', 'bin', 'missing.txt'], io);
    assert.match(io._logs.join(''), /No files matched/);
  });

  it('handles generic exceptions', async () => {
    const io = createMockIO();
    let exitCode = null;
    io.exit = (code) => {
      exitCode = code; 
    };
    
    await CLI.run(['node', 'bin', '--unknown'], io);
    assert.strictEqual(exitCode, EXIT.ERROR);
    assert.match(io._logs.join(''), /FATAL/);
  });

  it('writes to output file if specified', async () => {
    const io = createMockIO({ 'a.txt': 'A' });
    await CLI.run(['node', 'bin', '.', '-o', 'out.md'], io);
    assert.ok(io._written['out.md']);
    assert.match(io._written['out.md'], /a\.txt/);
  });
});
