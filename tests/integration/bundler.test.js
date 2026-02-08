

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Bundler } from '../../src/core/bundler.js';
import { createMockIO } from '../setup.js';
import { FILE_MARKER } from '../../src/formatters/markdown.js';

describe('Integration: Bundler', () => {
  it('Prioritizes files without budget', async () => {
    const io = createMockIO({
      'z.js': 'content',
      'a.js': 'content'
    });
    
    const rules = [{ pattern: 'z.js', score: 100 }];
    await Bundler.run({ paths: ['.'], priorityRules: rules }, io);
    
    const output = io._stdout.join('');
    const idxZ = output.indexOf('z.js');
    const idxA = output.indexOf('a.js');
    
    assert.ok(idxZ < idxA, 'z.js should appear before a.js');
  });

  it('Prioritizes files WITH budget', async () => {
    const io = createMockIO({
      'prio.js': 'content_cheap',
      'skip.js': 'content_expensive'
    });
    
    // Mock Analyzer to control token counts precisely
    const mockAnalyzer = {
      isBinary: () => false,
      getPriority: (p, _r) => p === 'prio.js' ? 100 : 1,
      countTokens: (str) => {
        // Ensure filenames in header don't trigger costs, only content
        if (str.includes('content_cheap')) {
          return 5;
        }
        if (str.includes('content_expensive')) {
          return 10;
        }
        return 0; // Header/Footer/Tree assumed free for this test
      }
    };
    
    const rules = [{ pattern: 'prio.js', score: 100 }];
    // Budget 6 allows 'prio.js' (5) but excludes 'skip.js' (10)
    await Bundler.run({ paths: ['.'], budget: 6, priorityRules: rules }, io, { analyzer: mockAnalyzer });
    
    const output = io._stdout.join('');
    
    // Check for CONTENT existence via file marker, not just filename (which is in header)
    assert.ok(output.includes(`${FILE_MARKER} prio.js`));
    assert.ok(!output.includes(`${FILE_MARKER} skip.js`));
  });

  it('Skeleton mode outputs tree but no content', async () => {
    const io = createMockIO({
      'src/a.js': 'console.log("content")',
      'src/b.css': 'body { color: red; }'
    });

    await Bundler.run({ paths: ['.'], skeleton: true }, io);
    const output = io._stdout.join('');
    
    assert.ok(output.includes('src/a.js'));
    assert.ok(output.includes('src/b.css'));
    assert.ok(!output.includes('console.log'));
    assert.ok(!output.includes('color: red'));
  });

  it('Handles file read errors gracefully', async () => {
    const io = createMockIO({
      'good.js': 'ok',
      'bad.js': 'err'
    });
    
    const originalRead = io.readText;
    io.readText = async (p) => {
      if (p.includes('bad.js')) {
        throw new Error('EACCES');
      }
      return originalRead(p);
    };
    io.readSample = async (p) => {
      if (p.includes('bad.js')) {
        throw new Error('EACCES');
      }
      return Buffer.from('ok');
    };

    await Bundler.run({ paths: ['.'] }, io);
    const output = io._stdout.join('');
    const logs = io._logs.join('');

    assert.ok(output.includes(`${FILE_MARKER} good.js`));
    assert.ok(!output.includes(`${FILE_MARKER} bad.js`));
    assert.match(logs, /Failed to read/);
  });

  it('Skips binary files', async () => {
    const io = createMockIO({
      'bin.dat': Buffer.from([0, 1, 2, 3])
    });
    
    await Bundler.run({ paths: ['.'] }, io);
    const output = io._stdout.join('');
    assert.ok(output.includes('(binary omitted)'));
  });

  it('Includes context and task instructions in output', async () => {
    const io = createMockIO({ 'a.txt': 'hi' });
    const config = {
      paths: ['.'],
      context: 'MY_CONTEXT',
      task: 'MY_TASK',
      instruct: true
    };
    
    await Bundler.run(config, io);
    const output = io._stdout.join('');
    
    assert.ok(output.includes('MY_CONTEXT'));
    assert.ok(output.includes('MY_TASK'));
    assert.ok(output.includes('CRITICAL')); // Match actual instruction text key
  });

  it('Returns 0 if no files match', async () => {
    const io = createMockIO({});
    const stats = await Bundler.run({ paths: ['.'] }, io);
    assert.strictEqual(stats.files, 0);
    assert.match(io._logs.join(''), /No files matched/);
  });

  it('Creates output directory if it does not exist', async () => {
    const io = createMockIO({ 'a.js': 'content' });
    let mkdirCalled = false;
    io.mkdir = async (_p) => {
      mkdirCalled = true; 
    };
    
    await Bundler.run({ paths: ['.'], output: 'dist/bundle.md' }, io);
    
    assert.strictEqual(mkdirCalled, true);
  });
});
