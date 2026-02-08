
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Tokenizer } from '../../src/optimizers/tokenizer.js';
import { getDefinition } from '../../src/optimizers/definitions.js';

describe('Unit: Optimizer Edge Cases', () => {
  const optimize = (src, lang) => Tokenizer.optimize(src, getDefinition(lang));

  it('C++: Distinguishes pointer * vs multiplication', () => {
    const src = 'int *ptr = a * b; /* comment */';
    // Minified: int*ptr=a*b;
    // Spaces around * are removed in minification unless alpha-numeric
    const res = optimize(src, 'cpp');
    assert.strictEqual(res, 'int*ptr=a*b;');
  });

  it('CSS: Handles complex selectors and stripping comments', () => {
    const src = `
      div > p { 
        color: red; /* comment */
        content: "/* keep string */";
      }
    `;
    const res = optimize(src, 'css');
    // CSS minification:
    // div>p{color:red;content:"/* keep string */";}
    assert.strictEqual(res, 'div>p{color:red;content:"/* keep string */";}');
  });

  it('JavaScript: Nested structures', () => {
    const src = 'function f() { return { a: 1, b: [2, 3] }; }';
    const res = optimize(src, 'js');
    assert.strictEqual(res, 'function f(){return{a:1,b:[2,3]};}');
  });

  it('JavaScript: Unfinished strings (Robustness)', () => {
    // Should not crash on invalid syntax
    const src = 'var s = "unfinished';
    const res = optimize(src, 'js');
    assert.strictEqual(res, 'var s="unfinished');
  });

  it('Python: Docstrings vs Strings', () => {
    const src = `
def func():
    """Docstring"""
    s = "normal"
    return s
    `;
    // Script mode preserves newlines and indentation logic
    // But it doesn't strip docstrings by default unless we add logic,
    // currently Tokenizer treats them as strings (which is safe).
    const res = optimize(src, 'py');
    assert.ok(res.includes('"""Docstring"""'));
    assert.ok(res.includes('s = "normal"'));
  });

  it('Shell: Handling # in strings', () => {
    const src = 'echo "Count is #1" # comment';
    const res = optimize(src, 'sh');
    assert.strictEqual(res, 'echo "Count is #1"');
  });

  it('SQL: Double dash vs operators', () => {
    // -- is comment, - is minus.
    const src = 'SELECT a-b FROM t -- comment';
    const res = optimize(src, 'sql');
    assert.strictEqual(res, 'SELECT a-b FROM t');
  });
});
