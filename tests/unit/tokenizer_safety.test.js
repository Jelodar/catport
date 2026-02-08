import { describe, it } from 'node:test';
import assert from 'node:assert';
import vm from 'node:vm';
import { Tokenizer } from '../../src/optimizers/tokenizer.js';
import { getDefinition } from '../../src/optimizers/definitions.js';

describe('Unit: Tokenizer Safety (JS Eval)', () => {
  const cfg = getDefinition('js');

  const check = (code) => {
    const optimized = Tokenizer.optimize(code, cfg);
    // 1. Ensure it's not empty
    assert.ok(optimized.length > 0);
    // 2. Ensure it compiles (no syntax errors)
    // We do NOT execute it (runInNewContext) because constructs like `for(;;)`
    // are syntactically valid but will cause the test to hang if executed.
    try {
      new vm.Script(optimized);
    } catch (e) {
      assert.fail(`Optimization broke code: "${code}"\nOutput: "${optimized}"\nError: ${e.message}`);
    }
    return optimized;
  };

  it('Handles division vs regex in control flow', () => {
    // This previously failed in simple tokenizers
    check('if (true) /a/'); 
    check('while (false) /a/');
    check('for (;;) /a/');
  });

  it('Handles regex after parentheses', () => {
    // "if (a) /b/" is regex
    const out1 = check('if (true) /a/.test("a")');
    assert.ok(out1.includes('/a/'), 'Should detect regex literal');

    // "(a) / b" is division
    const out2 = check('var x = (10) / 2;');
    assert.ok(!out2.includes('/ 2'), 'Should be division');
  });

  it('Handles division chaining', () => {
    const out = check('var x = 10 / 2 / 5;');
    assert.strictEqual(out, 'var x=10/2/5;');
  });

  it('Handles regex with escaped slashes', () => {
    const out = check('var r = /a\\/b/;');
    assert.strictEqual(out, 'var r=/a\\/b/;');
  });

  it('Handles regex with brackets containing slash', () => {
    const out = check('var r = /[/]/;');
    assert.strictEqual(out, 'var r=/[/]/;');
  });

  it('Handles template literals with braces', () => {
    check('var s = `a${1}b`;');
    check('var s = `a${ {x:1} }b`;');
    check('var s = `a${ `nested${2}` }b`;');
  });

  it('Handles chaotic combinations', () => {
    check('if (true) { var x = 1 / 2; /reg/.test("s"); }');
    check('var x = /reg/ + /ex/;');
    check('x = (a) / b / c;');
    // Wrap return in function to be valid JS syntax while testing tokenizer handling of return keyword
    check('(function(){ return /reg/ + /ex/; })');
  });
});
