

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Processor } from '../../src/core/processor.js';
import { createMockIO } from '../setup.js';
import { OPTIMIZE } from '../../src/config/constants.js';

describe('Unit: Processor Service', () => {
  const mockServices = {
    analyzer: { isBinary: () => false },
    optimizer: { run: (c) => c.trim() }
  };

  it('Reads and processes a text file (small file optimization)', async () => {
    const io = createMockIO({ 'file.txt': '  content  ' });
    const item = { path: 'file.txt', rel: 'file.txt' };
    const config = { optimize: OPTIMIZE.NONE };
    
    let readTextCalled = false;
    io.readText = async (_p) => {
      readTextCalled = true; return '  content  '; 
    };

    const result = await Processor.run(item, config, io, mockServices);
    assert.strictEqual(result.content, 'content');
    assert.strictEqual(readTextCalled, false, 'Should use sample content for small files');
  });

  it('Reads full text if file is larger than sample', async () => {
    const largeContent = 'a'.repeat(1024 * 20);
    const io = createMockIO({ 'large.txt': largeContent });
    const item = { path: 'large.txt', rel: 'large.txt' };
    
    let readTextCalled = false;
    // Mock original readText which is overwritten by setup.js
    const originalReadText = io.readText; 
    io.readText = async (p) => {
      readTextCalled = true; return originalReadText(p); 
    };

    const result = await Processor.run(item, {}, io, mockServices);
    assert.strictEqual(result.content, largeContent);
    assert.strictEqual(readTextCalled, true, 'Should call readText for large files');
  });

  it('Skips files larger than maxSize', async () => {
    // Content must be > 1024 to ensure logic falls through to size check
    // and doesn't just return the sample as the full content.
    const io = createMockIO({ 'huge.txt': 'a'.repeat(1024 * 20) });
    
    // Mock stat to return very large size
    io.stat = async () => ({ size: 20 * 1024 * 1024 }); // 20MB

    const item = { path: 'huge.txt', rel: 'huge.txt' };
    const config = { maxSize: 10 * 1024 * 1024 }; // 10MB limit

    const result = await Processor.run(item, config, io, mockServices);
    assert.match(result.content, /file too large/);
    assert.match(result.content, /20971520 bytes/);
  });

  it('Detects binary files via sample', async () => {
    const io = createMockIO({ 'bin.dat': Buffer.from([0, 1]) });
    const item = { path: 'bin.dat', rel: 'bin.dat' };
    const services = {
      ...mockServices,
      analyzer: { isBinary: () => true }
    };
    
    // Ensure readText is NOT called
    io.readText = async () => {
      throw new Error('Should not read full binary'); 
    };

    const result = await Processor.run(item, {}, io, services);
    assert.strictEqual(result.content, '(binary omitted)');
  });

  it('Returns empty content in skeleton mode', async () => {
    const io = createMockIO({ 'file.txt': 'content' });
    const item = { path: 'file.txt' };
    
    // Should NOT read file
    io.readSample = async () => {
      throw new Error('Should not read'); 
    };

    const result = await Processor.run(item, { skeleton: true }, io, mockServices);
    assert.strictEqual(result.content, '');
  });

  it('Handles read errors', async () => {
    const io = createMockIO();
    io.readSample = async () => {
      throw new Error('Read Error'); 
    };
    const item = { path: 'missing.txt' };
    
    const result = await Processor.run(item, {}, io, mockServices);
    assert.ok(result.error);
    assert.strictEqual(result.error.message, 'Read Error');
  });

  it('Delegates to optimizeCmd (stdin piping)', async () => {
    const io = createMockIO({ 'file.txt': 'foo' });
    io.execPipe = async (cmd, input) => {
      assert.strictEqual(cmd, 'tr a-z A-Z');
      return input.toUpperCase();
    };
    
    const item = { path: 'file.txt', rel: 'file.txt' };
    const config = { optimizeCmd: 'tr a-z A-Z' };
    
    const result = await Processor.run(item, config, io, mockServices);
    assert.strictEqual(result.content, 'FOO');
  });

  it('Delegates to optimizeCmd (placeholder substitution)', async () => {
    const io = createMockIO({ '/abs/file.txt': 'foo' });
    io.exec = async (cmd) => {
      // Check if path was quoted appropriately for the platform
      const isWin = process.platform === 'win32';
      const expected = isWin ? 'wc -l "/abs/file.txt"' : "wc -l '/abs/file.txt'";
      assert.strictEqual(cmd, expected);
      return '10';
    };
    
    // Mock pipe to ensure it's NOT called
    io.execPipe = async () => {
      throw new Error('Should not pipe'); 
    };
    
    const item = { path: '/abs/file.txt', rel: 'file.txt' };
    const config = { optimizeCmd: 'wc -l {}' };
    
    const result = await Processor.run(item, config, io, mockServices);
    
    // If io.exec assertion failed, result.error would be populated
    if (result.error) {
      throw result.error;
    }
    
    assert.strictEqual(result.content, '10');
  });
});
