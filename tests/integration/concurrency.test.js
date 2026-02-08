
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Bundler } from '../../src/core/bundler.js';
import { createMockIO } from '../setup.js';

describe('Integration: Concurrency', () => {
  it('Processes many files in parallel without loss', async () => {
    const FILES_COUNT = 100;
    const fs = {};
    for (let i = 0; i < FILES_COUNT; i++) {
      fs[`src/file${i}.js`] = `console.log(${i});`;
    }

    const io = createMockIO(fs);
    
    // Add artificial delay to readText to simulate IO latency and force parallelism
    const originalRead = io.readText;
    io.readText = async (p) => {
      await new Promise(r => setTimeout(r, 1));
      return originalRead(p);
    };

    // Use concurrency 10
    const config = {
      paths: ['.'],
      concurrency: 10,
      format: 'json'
    };

    const stats = await Bundler.run(config, io);
    
    assert.strictEqual(stats.files, FILES_COUNT);
    
    // Verify output integrity
    const output = io._stdout.join('');
    const parsed = JSON.parse(output);
    assert.strictEqual(parsed.files.length, FILES_COUNT);
  });
});
