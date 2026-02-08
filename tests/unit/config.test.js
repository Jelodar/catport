import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ArgParser } from '../../src/cli/args.js';

describe('Unit: Config Merge Logic', () => {
  it('merges defaults file config and cli args', () => {
    const fileConfig = { format: 'json', verbose: true };
    const argv = ['node', 'bin', '--format', 'xml'];
    const result = ArgParser.process(argv, fileConfig);
    assert.strictEqual(result.format, 'xml');
    assert.strictEqual(result.verbose, true);
    assert.strictEqual(result.instruct, true);
  });

  it('prioritizes cli over file config', () => {
    const fileConfig = { budget: 1000 };
    const argv = ['node', 'bin', '-b', '500'];
    const result = ArgParser.process(argv, fileConfig);
    assert.strictEqual(result.budget, 500);
  });

  it('respects file config when no cli override', () => {
    const fileConfig = { ignore: ['node_modules'] };
    const argv = ['node', 'bin'];
    const result = ArgParser.process(argv, fileConfig);
    assert.ok(result.ignore.includes('node_modules'));
  });

  it('overrides boolean flags correctly', () => {
    const fileConfig = { safeMode: true };
    const argv = ['node', 'bin', '--unsafe'];
    const result = ArgParser.process(argv, fileConfig);
    assert.strictEqual(result.safeMode, false);
  });

  it('merges arrays from both sources', () => {
    const fileConfig = { ignore: ['*.log'] };
    const argv = ['node', 'bin', '-i', '*.tmp'];
    const result = ArgParser.process(argv, fileConfig);
    assert.ok(result.ignore.includes('*.log'));
    assert.ok(result.ignore.includes('*.tmp'));
  });

  it('handles optimization configuration', () => {
    const fileConfig = { optimize: 'comments' };
    const argv = ['node', 'bin'];
    const result = ArgParser.process(argv, fileConfig);
    assert.strictEqual(result.optimize, 'comments');
  });

  it('cli optimization overrides file', () => {
    const fileConfig = { optimize: 'comments' };
    const argv = ['node', 'bin', '-O', 'minify'];
    const result = ArgParser.process(argv, fileConfig);
    assert.strictEqual(result.optimize, 'minify');
  });
});
