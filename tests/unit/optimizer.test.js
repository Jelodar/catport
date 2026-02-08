import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Optimizer } from '../../src/optimizers/index.js';
import { OPTIMIZE } from '../../src/config/constants.js';

describe('Unit: Optimizer', () => {
  it('Whitespace Mode: Removes trailing whitespace but preserves indentation', () => {
    const src = '  line1  \n\n  line2';
    // Expectation: Leading spaces preserved, trailing spaces removed. 
    // Double newline preserved (not collapsed unless >= 3).
    const expected = '  line1\n\n  line2';
    assert.strictEqual(Optimizer.run(src, 'txt', OPTIMIZE.WHITESPACE), expected);
  });

  it('Whitespace Mode: Normalizes newlines and mixed CRLF', () => {
    const src = 'line1\r\nline2\r\n\r\n\r\nline3';
    // Expectation: CRLF -> LF, 3 newlines -> 2 newlines
    const expected = 'line1\nline2\n\nline3';
    assert.strictEqual(Optimizer.run(src, 'txt', OPTIMIZE.WHITESPACE), expected);
  });
  
  it('Whitespace Mode: Trims file ends', () => {
    const src = '\n\nline1\n\n';
    const expected = 'line1';
    assert.strictEqual(Optimizer.run(src, 'txt', OPTIMIZE.WHITESPACE), expected);
  });

  it('Minify Mode: Uses Tokenizer', () => {
    const src = 'var a = 1; // c';
    // Tokenizer logic:
    // 'var' (alpha) -> next 'a' (alpha) => space
    // 'a' (alpha) -> next '=' (non-alpha) => no space
    // '=' (op) -> next '1' (num) => no space
    // '1' (num) -> next ';' (op) => no space
    assert.strictEqual(Optimizer.run(src, 'js', OPTIMIZE.MINIFY), 'var a=1;');
  });

  it('JSON: Compresses valid json', () => {
    const src = '{\n "a": 1 \n}';
    assert.strictEqual(Optimizer.run(src, 'json', OPTIMIZE.MINIFY), '{"a":1}');
  });

  it('JSON: Handles invalid json (fallback) safely', () => {
    const src = '{\n "msg": "hello world" \n} // trailing';
    // Should remove outer whitespace but PRESERVE the string content "hello world"
    // Tokenizer logic should handle the string and strip comments.
    const res = Optimizer.run(src, 'json', OPTIMIZE.MINIFY);
    assert.ok(res.includes('"msg":"hello world"'));
    assert.ok(!res.includes('\n'));
    assert.ok(!res.includes('//trailing')); 
  });

  it('JSON: Safe fallback keeps internal spaces', () => {
    // Critical test for the bug fix
    const src = '{ "key": "a b c" }';
    // Valid JSON uses JSON.stringify which is safe.
    assert.strictEqual(Optimizer.run(src, 'json', OPTIMIZE.MINIFY), '{"key":"a b c"}');

    // Invalid JSON test
    const invalidSrc = '{ "key": "a b c" '; // missing brace
    const res = Optimizer.run(invalidSrc, 'json', OPTIMIZE.MINIFY);
    // Tokenizer preserves spaces inside strings
    assert.strictEqual(res, '{"key":"a b c"');
  });

  it('Markdown: Strips HTML comments and collapses newlines', () => {
    const src = '# Header\n\n<!-- comment -->\n\n\nText';
    const expected = '# Header\n\nText';
    assert.strictEqual(Optimizer.run(src, 'md', OPTIMIZE.MINIFY), expected);
  });

  it('Markdown: Preserves whitespace in Whitespace mode', () => {
    const src = 'Line 1\n\nLine 2';
    assert.strictEqual(Optimizer.run(src, 'md', OPTIMIZE.WHITESPACE), src);
  });

  it('XML: Minifies (Minify)', () => {
    const src = '<root>\n  <!-- comm -->\n  <tag> val </tag>\n</root>';
    // The simplified regex XML minifier in defaultOptimizer separates tags with space if needed
    // >\s+< becomes > <
    const expected = '<root> <tag> val </tag> </root>';
    assert.strictEqual(Optimizer.run(src, 'xml', OPTIMIZE.MINIFY), expected);
  });
  
  it('XML: Preserves single space between tags', () => {
    const src = '<b>foo</b>   <i>bar</i>';
    // Should be <b>foo</b> <i>bar</i>
    assert.strictEqual(Optimizer.run(src, 'xml', OPTIMIZE.MINIFY), '<b>foo</b> <i>bar</i>');
  });

  it('XML: Whitespace mode preserves structure and comments', () => {
    const src = '<root>\n  <!-- comm -->\n  <tag></tag>\n</root>';
    // Expectation: Comments preserved in whitespace mode (only Minify removes them).
    // Structure preserved.
    const expected = '<root>\n  <!-- comm -->\n  <tag></tag>\n</root>';
    assert.strictEqual(Optimizer.run(src, 'xml', OPTIMIZE.WHITESPACE), expected);
  });

  it('None mode returns as-is', () => {
    const src = '  raw  ';
    assert.strictEqual(Optimizer.run(src, 'txt', OPTIMIZE.NONE), '  raw  ');
  });

  it('Handles null input', () => {
    assert.strictEqual(Optimizer.run(null, 'txt'), '');
  });
});
