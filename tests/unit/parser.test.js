
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Parser } from '../../src/cli/parser.js';

describe('Unit: Generic Parser', () => {
  const SCHEMA = {
    bool: { type: 'boolean', short: 'b' },
    str: { type: 'string', short: 's' },
    num: { type: 'number', short: 'n' },
    arr: { type: 'array', short: 'a' }
  };

  it('Parses long flags', () => {
    const argv = ['node', 'bin', '--bool', '--str', 'val'];
    const res = Parser.parse(argv, SCHEMA);
    assert.strictEqual(res.bool, true);
    assert.strictEqual(res.str, 'val');
  });

  it('Parses short flags', () => {
    const argv = ['node', 'bin', '-b', '-s', 'val'];
    const res = Parser.parse(argv, SCHEMA);
    assert.strictEqual(res.bool, true);
    assert.strictEqual(res.str, 'val');
  });

  it('Parses grouped booleans', () => {
    const schema2 = { x: { type: 'boolean', short: 'x' }, y: { type: 'boolean', short: 'y' } };
    const res = Parser.parse(['node', 'bin', '-xy'], schema2);
    assert.strictEqual(res.x, true);
    assert.strictEqual(res.y, true);
  });

  it('Parses arrays', () => {
    const argv = ['node', 'bin', '-a', '1', '--arr', '2'];
    const res = Parser.parse(argv, SCHEMA);
    assert.deepStrictEqual(res.arr, ['1', '2']);
  });

  it('Parses mixed numbers and strings', () => {
    const argv = ['node', 'bin', '--num', '10', '--num', '-5'];
    const res = Parser.parse(argv, SCHEMA);
    // Note: Schema def implies single value unless array, 
    // but parser implementation overwrites singles.
    assert.strictEqual(res.num, -5); 
  });

  it('Handles terminator --', () => {
    const argv = ['node', 'bin', '-s', 'val', '--', '-b', 'file.txt'];
    const res = Parser.parse(argv, SCHEMA);
    assert.strictEqual(res.str, 'val');
    assert.strictEqual(res.bool, undefined); // -b is now a path
    assert.ok(res.paths.includes('-b'));
    assert.ok(res.paths.includes('file.txt'));
  });
});
