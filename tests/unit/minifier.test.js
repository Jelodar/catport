import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Optimizer } from '../../src/optimizers/index.js';
import { OPTIMIZE } from '../../src/config/constants.js';

describe('Unit: Minifier', () => {
  it('performs minification via Optimizer', () => {
    const src = 'var x = 1; // comment';
    const res = Optimizer.run(src, 'js', OPTIMIZE.MINIFY);
    assert.strictEqual(res, 'var x=1;');
  });

  it('handles empty input', () => {
    const res = Optimizer.run('', 'js', OPTIMIZE.MINIFY);
    assert.strictEqual(res, '');
  });
});
