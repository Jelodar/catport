
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Extractor } from '../../src/core/extractor.js';
import { createMockIO } from '../setup.js';
import { FILE_MARKER } from '../../src/formatters/markdown.js';

describe('Integration: Extractor', () => {
  it('extracts files', async () => {
    const input = `${FILE_MARKER} src/file.txt\n\`\`\`\nCONTENT\n\`\`\``;
    const io = createMockIO({ 'bundle.md': input });
    
    await Extractor.run({ paths: ['bundle.md'], extractDir: 'out' }, io);
    
    // Markdown parser performs trimEnd(), so trailing newline is removed
    assert.strictEqual(io._written['out/src/file.txt'], 'CONTENT');
  });

  it('extracts safely when flag is set', async () => {
    const input = `${FILE_MARKER} ../evil.txt\n\`\`\`\nEVIL\n\`\`\``;
    const io = createMockIO({ 'bundle.md': input });
     
    await Extractor.run({ paths: ['bundle.md'], extractDir: 'out', safeMode: true }, io);
    assert.strictEqual(io._written['../evil.txt'], undefined);
  });

  it('extracts from stdin when no paths provided', async () => {
    const input = `${FILE_MARKER} stdin.txt\n\`\`\`\nFROM_STDIN\n\`\`\``;
    const io = createMockIO({ '__stdin__': input });
    
    await Extractor.run({ paths: [], extractDir: 'out' }, io);
    
    assert.strictEqual(io._written['out/stdin.txt'], 'FROM_STDIN');
  });

  it('throws on empty input', async () => {
    const io = createMockIO({ '__stdin__': '' });
    await assert.rejects(
      async () => Extractor.run({ paths: [] }, io),
      /Empty input/
    );
  });

  it('handles case with no found files', async () => {
    const io = createMockIO({ 'readme.md': '# Just text' });
    await Extractor.run({ paths: ['readme.md'] }, io);
    
    assert.match(io._logs.join(''), /No files found/);
    assert.strictEqual(Object.keys(io._written).length, 0);
  });
});
