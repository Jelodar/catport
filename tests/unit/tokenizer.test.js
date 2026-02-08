
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Tokenizer } from '../../src/optimizers/tokenizer.js';
import { getDefinition } from '../../src/optimizers/definitions.js';

describe('Unit: Tokenizer Logic', () => {
  const process = (src, lang) => Tokenizer.optimize(src, getDefinition(lang));

  it('Python: removes comments but preserves indentation (script mode)', () => {
    const src = 'def foo():\n    # comment\n    return 1';
    const expected = 'def foo():\n    \n    return 1';
    assert.strictEqual(process(src, 'py'), expected);
  });

  it('Python: preserves triple double quotes', () => {
    const src = 's = """\n  # not a comment\n"""';
    assert.strictEqual(process(src, 'py'), src);
  });

  it('Python: preserves triple single quotes', () => {
    const src = "s = '''\n  # not a comment\n'''";
    assert.strictEqual(process(src, 'py'), src);
  });

  it('Lua: removes -- comments', () => {
    const src = 'x = 1 -- comment';
    assert.strictEqual(process(src, 'lua'), 'x=1');
  });

  it('Lua: removes --[[ ]] block comments', () => {
    const src = 'x = 1 --[[ comment ]] y = 2';
    assert.strictEqual(process(src, 'lua'), 'x=1 y=2');
  });

  it('Powershell: removes <# #> block comments', () => {
    const src = '$x = 1 <# comment #> $y = 2';
    assert.strictEqual(process(src, 'ps1'), '$x = 1 $y = 2');
  });

  it('Haskell: removes {- -} block comments', () => {
    const src = 'x = 1 {- comment -} y = 2';
    assert.strictEqual(process(src, 'hs'), 'x=1 y=2');
  });

  it('Shell: removes # comments', () => {
    const src = 'echo "hello" # world';
    assert.strictEqual(process(src, 'sh'), 'echo "hello"');
  });

  it('SQL: removes -- comments', () => {
    const src = 'SELECT * FROM table -- comment';
    assert.strictEqual(process(src, 'sql'), 'SELECT*FROM table');
  });

  it('SQL: removes /* */ comments', () => {
    const src = 'SELECT /* comment */ * FROM table';
    assert.strictEqual(process(src, 'sql'), 'SELECT*FROM table');
  });

  it('Generic: handles complex string nesting', () => {
    const src = 'var x = " /* string */ " + \' // string \'';
    assert.strictEqual(process(src, 'js'), 'var x=" /* string */ "+ \' // string \''.replace('+ ', '+'));
  });
  
  it('Handles escapes in strings', () => {
    const src = 'var x = " \\" ";';
    assert.strictEqual(process(src, 'js'), 'var x=" \\" ";');
  });

  it('Removes empty lines in script mode', () => {
    const src = 'line1\n\n\nline2';
    assert.strictEqual(process(src, 'py'), 'line1\nline2');
  });
});
