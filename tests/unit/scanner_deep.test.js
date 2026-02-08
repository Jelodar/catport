
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Scanner } from '../../src/core/scanner.js';
import { createMockIO } from '../setup.js';

describe('Unit: Scanner Deep Logic', () => {
  it('Handles nested .gitignore inheritance and overriding', async () => {
    // Structure:
    // root/
    //   .gitignore  (ignores *.log)
    //   app.log     (should be ignored)
    //   src/
    //     .gitignore (unignores !debug.log)
    //     debug.log  (should be included)
    //     error.log  (should be ignored by root rule)
    
    const fs = {
      'root/.gitignore': '*.log',
      'root/app.log': 'log',
      'root/src/.gitignore': '!debug.log',
      'root/src/debug.log': 'log',
      'root/src/error.log': 'log',
      'root/src/main.js': 'code'
    };
    
    const io = createMockIO(fs);
    const items = [];
    
    for await (const item of Scanner.scan({ paths: ['root'] }, io)) {
      items.push(item.rel);
    }
    
    assert.ok(items.includes('src/main.js'));
    assert.ok(items.includes('src/debug.log'), 'Nested ignore should override parent');
    assert.ok(!items.includes('app.log'), 'Root ignore should apply');
    assert.ok(!items.includes('src/error.log'), 'Inherited ignore should apply');
  });

  it('Handles explicit file arguments ignoring exclusion rules', async () => {
    // If I explicitly ask for 'root/ignored.txt', it should likely be included 
    // depending on implementation. In catport, if paths are explicit, 
    // the walker usually starts there. 
    // However, the walker checks ignore rules on the relative path.
    // NOTE: Current implementation checks ignore rules even for explicit roots if it walks them.
    // But if we pass specific file as root...
    
    const fs = {
      'root/.gitignore': '*.txt',
      'root/secret.txt': 'secret'
    };
    const io = createMockIO(fs);
    
    const items = [];
    // If we scan the FILE directly, Scanner._walk is not called for it, 
    // but the file block in Scanner.scan checks baseIgnore.
    for await (const item of Scanner.scan({ paths: ['root/secret.txt'] }, io)) {
      items.push(item.rel);
    }
    
    // Default behavior: Explicitly targeted files are included even if gitignored,
    // unless -u (noIgnore) is passed.
    assert.strictEqual(items.length, 1);
  });

  it('Handles unreadable directories gracefully', async () => {
    const fs = {
      'root/readable/file.txt': 'ok',
      'root/locked/file.txt': 'ok'
    };
    const io = createMockIO(fs);
    
    // Mock readdir failure for 'locked'
    const originalReaddir = io.readdir;
    io.readdir = async (p) => {
      if (p.includes('locked')) {
        throw new Error('EACCES');
      }
      return originalReaddir(p);
    };

    const items = [];
    for await (const item of Scanner.scan({ paths: ['root'] }, io)) {
      items.push(item.rel);
    }
    
    assert.ok(items.includes('readable/file.txt'));
    assert.ok(!items.includes('locked/file.txt'));
  });

  it('Ignores .git directory by default', async () => {
    const fs = {
      'root/.git/HEAD': 'ref',
      'root/main.js': 'code'
    };
    const io = createMockIO(fs);
    const items = [];
    for await (const item of Scanner.scan({ paths: ['root'] }, io)) {
      items.push(item.rel);
    }
    
    assert.ok(items.includes('main.js'));
    assert.ok(!items.includes('.git/HEAD'));
  });
});
