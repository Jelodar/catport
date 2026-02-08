import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ArgParser } from '../../src/cli/args.js';

describe('Unit: Args Edge Cases', () => {
  it('handles empty args', () => {
    const res = ArgParser.process(['node', 'bin']);
    assert.strictEqual(res.paths.length, 0);
  });

  it('handles only flags no paths', () => {
    const res = ArgParser.process(['node', 'bin', '-v']);
    assert.strictEqual(res.verbose, true);
    assert.strictEqual(res.paths.length, 0);
  });

  it('handles paths with dashes', () => {
    const res = ArgParser.process(['node', 'bin', './-path-with-dash']);
    assert.ok(res.paths.includes('./-path-with-dash'));
  });

  it('handles repeated array flags', () => {
    const res = ArgParser.process(['node', 'bin', '-i', 'a', '-i', 'b', '--ignore', 'c']);
    assert.ok(res.ignore.includes('a'));
    assert.ok(res.ignore.includes('b'));
    assert.ok(res.ignore.includes('c'));
  });

  it('handles equal sign in values', () => {
    const res = ArgParser.process(['node', 'bin', '--context=a=b']);
    assert.strictEqual(res.context, 'a=b');
  });

  it('handles optimize flag with command containing spaces', () => {
    const res = ArgParser.process(['node', 'bin', '-O', 'sed s/a/b/g']);
    assert.strictEqual(res.optimizeCmd, 'sed s/a/b/g');
  });

  it('throws on missing required value at end of args', () => {
    assert.throws(() => ArgParser.process(['node', 'bin', '--output']), /requires a value/);
  });

  it('throws on unknown short flag', () => {
    assert.throws(() => ArgParser.process(['node', 'bin', '-z']), /Unknown argument: -z/);
  });
});
