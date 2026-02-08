
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CLI } from '../../src/cli/main.js';
import { EXIT } from '../../src/config/constants.js';
import { createMockIO } from '../setup.js';

describe('E2E: CLI Errors', () => {
  it('Fails when input file does not exist', async () => {
    const io = createMockIO();
    // Assuming bunlder just skips missing files usually, but let's check extractor
    await CLI.run(['node', 'catport', '-x', 'missing.md'], io);
    
    // Extractor usually throws if it can't read the input
    assert.match(io._logs.join(''), /ENOENT/);
    assert.ok(io._logs.includes(`EXIT ${EXIT.ERROR}`));
  });

  it('Fails on unknown flag', async () => {
    const io = createMockIO();
    await CLI.run(['node', 'catport', '--foobar'], io);
    assert.match(io._logs.join(''), /Unknown argument: --foobar/);
    assert.ok(io._logs.includes(`EXIT ${EXIT.ERROR}`));
  });

  it('Warns when budget is exceeded immediately', async () => {
    const io = createMockIO({ 'large.txt': 'A'.repeat(1000) });
    // Budget 10 tokens. 1000 chars / 4 chars/token = 250 tokens.
    await CLI.run(['node', 'catport', 'large.txt', '-b', '10'], io);
    
    // Should output tree (skeleton) but content should be skipped
    const output = io._stdout.join('');
    assert.ok(output.includes('large.txt')); // In tree
    assert.ok(!output.includes('AAAA')); // Content omitted
    assert.match(io._logs.join(''), /Budget exceeded/);
  });

  it('Handles Git command failure gracefully', async () => {
    const io = createMockIO();
    io.exec = async () => {
      throw new Error('git not found'); 
    };
    
    await CLI.run(['node', 'catport', '-g'], io);
    assert.match(io._logs.join(''), /git command failed/);
    assert.ok(io._logs.includes(`EXIT ${EXIT.ERROR}`));
  });

  it('Handles extract on empty input', async () => {
    const io = createMockIO({ 'empty.md': '   ' });
    await CLI.run(['node', 'catport', '-x', 'empty.md'], io);
    assert.match(io._logs.join(''), /Empty input/);
    assert.ok(io._logs.includes(`EXIT ${EXIT.ERROR}`));
  });
});
