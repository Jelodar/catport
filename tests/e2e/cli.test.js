import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CLI } from '../../src/cli/main.js';
import { EXIT } from '../../src/config/constants.js';
import { createMockIO } from '../setup.js';

describe('E2E: CLI', () => {
  it('prints help', async () => {
    const io = createMockIO();
    await CLI.run(['node', 'catport', '-h'], io);
    assert.match(io._stdout.join(''), /USAGE/);
  });

  it('prints version', async () => {
    const io = createMockIO();
    await CLI.run(['node', 'catport', '-V'], io);
    assert.match(io._stdout.join(''), /v\d+\.\d+/);
  });

  it('runs bundler by default', async () => {
    const io = createMockIO({ 'file.js': 'code' });
    await CLI.run(['node', 'catport', 'file.js'], io);
    assert.match(io._stdout.join(''), /file\.js/);
  });

  it('Exits if git command fails', async () => {
    const io = createMockIO();
    io.exec = async () => {
      throw new Error('fail'); 
    };
    
    await CLI.run(['node', 'catport', '-g', 'HEAD'], io);
    
    assert.ok(io._logs.some(l => l.includes('Not a git repository')));
    assert.ok(io._logs.includes(`EXIT ${EXIT.ERROR}`));
  });

  it('Exits if no git changes', async () => {
    const io = createMockIO();
    io.exec = async (cmd) => {
      if (cmd.includes('rev-parse')) {
        return io.cwd();
      }
      return ''; // No output from diff
    };
    
    await CLI.run(['node', 'catport', '-g'], io);
    
    assert.ok(io._logs.some(l => l.includes('No changes detected')));
    assert.ok(io._logs.includes(`EXIT ${EXIT.SUCCESS}`));
  });

  it('Bundles only git changes', async () => {
    const io = createMockIO({
      'a.js': 'content',
      'b.js': 'content'
    });
    
    const cwd = io.cwd();
    io.exec = async (cmd) => {
      if (cmd.includes('rev-parse')) {
        return cwd;
      }
      if (cmd.includes('diff')) {
        return 'a.js\0';
      }
      return '';
    };

    await CLI.run(['node', 'catport', '-g'], io);
    
    const output = io._stdout.join('');
    assert.match(output, /a\.js/);
    assert.doesNotMatch(output, /b\.js/);
  });

  it('Loads config from .catport.json', async () => {
    const io = createMockIO({
      '.catport.json': JSON.stringify({ format: 'json' }),
      'src/file.js': 'code'
    });
    
    await CLI.run(['node', 'catport', 'src'], io);
    const output = io._stdout.join('');
    
    // Output should be JSON format because of config file
    assert.ok(output.startsWith('{'));
    assert.ok(output.includes('"files":'));
  });

  it('Handles invalid config file gracefully', async () => {
    const io = createMockIO({
      '.catport.json': '{ invalid json',
      'file.txt': 'ok'
    });

    // Should not crash, defaults to standard behavior
    await CLI.run(['node', 'catport', 'file.txt'], io);
    assert.match(io._stdout.join(''), /file\.txt/);
  });

  it('Handles generic runtime errors', async () => {
    const io = createMockIO();
    // Force an error inside Bundler by passing invalid config manually via mocked IO if possible
    // or relying on args processing failure handled in main.
    // Let's pass an invalid flag that ArgParser throws on
    await CLI.run(['node', 'catport', '--unknown'], io);
    
    assert.match(io._logs.join(''), /FATAL/);
    assert.ok(io._logs.includes(`EXIT ${EXIT.ERROR}`));
  });
});
