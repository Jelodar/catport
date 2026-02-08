
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Scanner } from '../../src/core/scanner.js';
import { createMockIO } from '../setup.js';
import { resolve } from 'node:path';

describe('Unit: Scanner', () => {
  it('recursively scans directories', async () => {
    const io = createMockIO({
      'root/file.txt': 'A',
      'root/src/app.js': 'B'
    });
    
    const items = [];
    for await (const i of Scanner.scan({ paths: ['root'] }, io)) {
      items.push(i.rel);
    }
    
    assert.ok(items.includes('file.txt'));
    assert.ok(items.includes('src/app.js'));
  });

  it('respects .gitignore', async () => {
    const io = createMockIO({
      'root/.gitignore': '*.log',
      'root/test.log': 'skip',
      'root/main.js': 'keep'
    });

    const items = [];
    for await (const i of Scanner.scan({ paths: ['root'] }, io)) {
      items.push(i.rel);
    }

    assert.ok(items.includes('main.js'));
    assert.ok(!items.includes('test.log'));
  });

  it('filters by extension', async () => {
    const io = createMockIO({
      'root/a.js': 'js',
      'root/b.ts': 'ts',
      'root/c.txt': 'txt'
    });
    const extSet = new Set(['js', 'ts']);
    const items = [];
    for await (const i of Scanner.scan({ paths: ['root'], extSet }, io)) {
      items.push(i.rel);
    }
    assert.ok(items.includes('a.js'));
    assert.ok(items.includes('b.ts'));
    assert.ok(!items.includes('c.txt'));
  });

  it('filters by gitFiles set directly (Optimization check)', async () => {
    // Setup: gitFiles contains ONE file. FS contains MANY.
    // If optimization works, readdir should NOT be called on 'root'.
    const io = createMockIO({
      'root/changed.js': 'mod',
      'root/ignored.js': 'same'
    });
    
    let readdirCalled = false;
    io.readdir = async () => {
      readdirCalled = true; return []; 
    };

    const gitFiles = new Set([resolve(process.cwd(), 'root/changed.js')]); 
    
    const items = [];
    for await (const i of Scanner.scan({ paths: ['root'], gitFiles }, io)) {
      items.push(i.rel);
    }
    
    assert.ok(items.includes('changed.js'));
    assert.strictEqual(items.length, 1);
    assert.strictEqual(readdirCalled, false, 'Should NOT scan filesystem when gitFiles is provided');
  });

  it('handles readdir errors gracefully', async () => {
    const io = createMockIO({ 'root/file.js': 'ok' });
    io.readdir = async () => {
      throw new Error('EACCES'); 
    };
    
    const items = [];
    for await (const i of Scanner.scan({ paths: ['root'] }, io)) {
      items.push(i);
    }
    assert.strictEqual(items.length, 0);
  });

  it('handles .gitignore read errors gracefully', async () => {
    const io = createMockIO({ 
      'root/.gitignore': 'invalid',
      'root/file.js': 'ok'
    });
    const originalRead = io.readText;
    io.readText = async (p) => {
      if (p.endsWith('.gitignore')) {
        throw new Error('fail');
      }
      return originalRead(p);
    };

    const items = [];
    for await (const i of Scanner.scan({ paths: ['root'] }, io)) {
      items.push(i.rel);
    }
    assert.ok(items.includes('file.js'));
  });

  it('detects directory cycles and prevents infinite recursion', async () => {
    // Structure: a -> b -> link_to_a -> a ...
    const io = createMockIO({
      'a/b/placeholder': 'content' // Ensure a/b exists as a directory structure in MockIO
    });

    // Manually force inode collision to simulate cycle
    const originalStat = io.stat;
    io.stat = async (p) => {
      // 'a' and 'link_to_a' share inode 100
      // p is absolute in Scanner, so we match endsWith or exact path relative to root
      if (p.endsWith('/a') || p.endsWith('/link_to_a')) {
        return { isDirectory: () => true, isFile: () => false, dev: 1, ino: 100 };
      }
      return originalStat(p);
    };

    // Mock readdir to return the link
    // Scanner uses absolute paths, so we check using endsWith
    io.readdir = async (p) => {
      if (p.endsWith('/a')) {
        return [{ name: 'b', isDirectory: () => true, isSymbolicLink: () => false }];
      }
      if (p.endsWith('/b')) {
        return [{ name: 'link_to_a', isDirectory: () => true, isSymbolicLink: () => true }];
      }
      // Recursion attempt (should be blocked)
      if (p.endsWith('/link_to_a')) {
        return [{ name: 'b', isDirectory: () => true, isSymbolicLink: () => false }];
      }
      return [];
    };

    const visited = [];
    // We restrict depth in case logic fails, to prevent test timeout
    let count = 0;
    for await (const item of Scanner.scan({ paths: ['a'] }, io)) {
      visited.push(item.rel);
      count++;
      if (count > 10) {
        break;
      } // Fail safe
    }
    
    // Should visit a/b/link_to_a, but NOT recurse inside it
    assert.ok(visited.includes('b/link_to_a'));
    assert.strictEqual(count < 10, true, 'Infinite loop detected');
  });
});
