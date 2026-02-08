import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Bundler } from '../../src/core/bundler.js';
import { Extractor } from '../../src/core/extractor.js';
import { createMockIO } from '../setup.js';

describe('Integration', () => {
  it('Bundle -> Extract Roundtrip', async () => {
    const io = createMockIO({ 'src/a.js': 'const a=1;' });
    
    await Bundler.run({ paths: ['.'], format: 'json', output: 'b.json' }, io);
    const bundle = io._written['b.json'];
    
    const io2 = createMockIO({ 'b.json': bundle });
    await Extractor.run({ paths: ['b.json'], extractDir: 'out' }, io2);
    assert.strictEqual(io2._written['out/src/a.js'], 'const a=1;');
  });
});
