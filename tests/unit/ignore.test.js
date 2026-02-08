
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Ignore } from '../../src/core/ignore.js';

describe('Unit: Ignore Service', () => {
  it('Creates a matcher that ignores files', () => {
    const matcher = Ignore.create(['*.log', 'dist/']);
    assert.strictEqual(matcher.test('app.log'), true);
    assert.strictEqual(matcher.test('dist/main.js'), true);
    assert.strictEqual(matcher.test('src/main.js'), false);
  });

  it('Handles negation (!)', () => {
    // Logic: Ignore all logs, but Keep (do not ignore) important.log
    const matcher = Ignore.create(['*.log', '!important.log']);
    assert.strictEqual(matcher.test('test.log'), true);
    assert.strictEqual(matcher.test('important.log'), false);
  });

  it('Parses .gitignore content', () => {
    const content = `
      # Comment
      node_modules/
      *.tmp
      !keep.tmp
    `;
    const patterns = Ignore.parse(content, '/root', '/root');
    // Standard git behavior: "node_modules/" is recursive, not anchored to root unless prefixed with /
    assert.ok(patterns.includes('node_modules/'));
    assert.ok(patterns.includes('*.tmp'));
    assert.ok(patterns.includes('!keep.tmp'));
  });

  it('Scopes patterns to subdirectories', () => {
    const content = '/build'; // In a subdir, /build refers to subdir/build
    // Parsing gitignore at /root/src with root at /root
    const patterns = Ignore.parse(content, '/root/src', '/root');
    
    // Should be anchored to src/build
    assert.ok(patterns.includes('/src/build'));
  });

  it('Extends matchers', () => {
    const base = Ignore.create(['base.txt']);
    const extended = base.extend(['extended.txt']);
    
    assert.strictEqual(extended.test('base.txt'), true);
    assert.strictEqual(extended.test('extended.txt'), true);
    assert.strictEqual(extended.test('other.txt'), false);
  });
});
