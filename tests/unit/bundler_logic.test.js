
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Bundler } from '../../src/core/bundler.js';
import { createMockIO } from '../setup.js';
import { FILE_MARKER } from '../../src/formatters/markdown.js';

describe('Unit: Bundler Logic', () => {
  it('Stops EXACTLY when budget is exceeded', async () => {
    const fs = {
      'a.txt': 'content',
      'b.txt': 'content',
      'c.txt': 'content'
    };
    const io = createMockIO(fs);

    const mockAnalyzer = {
      isBinary: () => false,
      getPriority: () => 1,
      countTokens: (content) => {
        if (content.includes('catport')) {
          return 4;
        } 
        if (content.length < 20) {
          return 2;
        } 
        return 10; 
      }
    };

    const stats = await Bundler.run({
      paths: ['.'],
      budget: 25
    }, io, { analyzer: mockAnalyzer });

    assert.strictEqual(stats.files, 2);
  });

  it('Handles zero budget (output tree only)', async () => {
    const fs = { 'a.txt': 'content' };
    const io = createMockIO(fs);
    
    const mockAnalyzer = {
      isBinary: () => false,
      getPriority: () => 1,
      countTokens: () => 10
    };

    const stats = await Bundler.run({ 
      paths: ['.'], 
      budget: 1 
    }, io, { analyzer: mockAnalyzer });

    const output = io._stdout.join('');
    
    assert.ok(output.includes('a.txt')); 
    assert.ok(!output.includes(FILE_MARKER));
    assert.strictEqual(stats.files, 0);
  });

  it('Sorts deterministically when priorities match', async () => {
    const fs = {
      'b.txt': 'content',
      'a.txt': 'content',
      'c.txt': 'content'
    };
    const io = createMockIO(fs);
    
    await Bundler.run({ paths: ['.'] }, io);
    const output = io._stdout.join('');
    
    const idxA = output.indexOf(`${FILE_MARKER} a.txt`);
    const idxB = output.indexOf(`${FILE_MARKER} b.txt`);
    const idxC = output.indexOf(`${FILE_MARKER} c.txt`);
    
    assert.ok(idxA < idxB);
    assert.ok(idxB < idxC);
  });

  it('Handles no-op optimization gracefully', async () => {
    // If optimizer returns null/undefined (bug), bundler shouldn't crash
    const fs = { 'a.txt': 'content' };
    const io = createMockIO(fs);
    
    const brokenOptimizer = {
      run: () => null // Should not happen in real app, but defensive coding
    };
    
    // The processor returns { ...item, content: null }
    // The formatter usually handles null content or converting to string
    // Let's ensure default behavior handles it or it throws cleanly
    
    // In current impl, Formatter expects string.
    // Bundler.run -> Processor.run -> returns content.
    // If content is null, Formatter might print "null".
    
    await Bundler.run({ paths: ['.'] }, io, { optimizer: brokenOptimizer });
    const output = io._stdout.join('');
    // Markdown formatter template: `${f.content}` -> "null"
    assert.ok(output.includes(FILE_MARKER));
  });
});
