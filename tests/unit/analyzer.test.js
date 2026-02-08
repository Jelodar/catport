
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Analyzer } from '../../src/core/analyzer.js';

describe('Unit: Analyzer', () => {
  it('detects binary buffers', () => {
    assert.strictEqual(Analyzer.isBinary(Buffer.from([0, 1, 2])), true);
    assert.strictEqual(Analyzer.isBinary(Buffer.from('text')), false);
    assert.strictEqual(Analyzer.isBinary(Buffer.alloc(0)), false);
  });

  it('counts tokens based on charsPerToken', () => {
    const txt = '1234567890';
    assert.strictEqual(Analyzer.countTokens(txt, 1), 10);
    assert.strictEqual(Analyzer.countTokens(txt, 5), 2);
    assert.strictEqual(Analyzer.countTokens(txt, 100), 1);
  });

  it('calculates priority based on regex rules', () => {
    const rules = [{ regex: /\.js$/, score: 10 }];
    assert.strictEqual(Analyzer.getPriority('a.js', rules), 10);
    assert.strictEqual(Analyzer.getPriority('a.txt', rules), 1);
  });
});
