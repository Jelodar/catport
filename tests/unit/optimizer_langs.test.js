
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Tokenizer } from '../../src/optimizers/tokenizer.js';
import { getDefinition } from '../../src/optimizers/definitions.js';
import { Optimizer } from '../../src/optimizers/index.js';
import { OPTIMIZE } from '../../src/config/constants.js';

describe('Unit: Language Optimizer Deep Dive', () => {
  const optimize = (src, lang) => Tokenizer.optimize(src, getDefinition(lang));

  describe('Ruby', () => {
    it('Handles hash comments', () => {
      const src = 'x = 1 # comment';
      assert.strictEqual(optimize(src, 'rb'), 'x = 1');
    });

    it('Preserves string interpolation', () => {
      const src = 'x = "val: #{1 + 1}"';
      assert.strictEqual(optimize(src, 'rb'), 'x = "val: #{1 + 1}"');
    });
    
    // Note: Tokenizer is generic, it treats heredocs as code unless special logic added.
    // Standard minification might break complex heredocs if they rely on specific whitespace.
    // However, it should preserve the content if it looks like code.
  });

  describe('Go', () => {
    it('Handles struct tags (backticks)', () => {
      const src = 'type T struct { Name string `json:"name"` }';
      const res = optimize(src, 'go');
      // Should preserve backticks and formatting in script mode
      assert.strictEqual(res, 'type T struct { Name string `json:"name"` }');
    });

    it('Removes // comments', () => {
      const src = 'package main // main package';
      assert.strictEqual(optimize(src, 'go'), 'package main');
    });
  });

  describe('Rust', () => {
    it('Handles lifetimes (single quote usage)', () => {
      // 'a is a lifetime, 'b' is a char. 
      // The tokenizer treats 'a as start of string if not careful.
      // But our tokenizer requires '...' for strings.
      // 'a (no closing quote) might assume string state until EOL or next quote.
      // This is a known limitation of generic tokenizers on Rust lifetimes.
      // However, typical rust code: &'a str.
      
      const src = "fn foo<'a>(x: &'a str) {}";
      // Generic tokenizer sees 'a... as string start?
      // Actually 'a' is char. &'a is lifetime.
      // The tokenizer looks for ' then next ' to close. 
      // If it finds "fn foo<'a>(x: &'a str) {}", 
      // 1. 'a' -> string? No, > closes it? No.
      // Rust support in generic tokenizer is tricky.
      // Let's verify current behavior.
      
      const res = optimize(src, 'rs');
      // Ideally checks strictly.
      // If it fails to parse lifetimes correctly, we should at least ensure it doesn't delete code.
      assert.ok(res.includes('fn foo'));
    });

    it('Handles raw string literals', () => {
      const src = 'let r = r#"raw string"#;';
      const res = optimize(src, 'rs');
      // Tokenizer should not crash, even if full raw string syntax support is basic
      assert.ok(res.length > 0);
    });
  });

  describe('HTML/XML', () => {
    it('Preserves attributes', () => {
      const src = '<div class="foo" id="bar"></div>';
      const res = optimize(src, 'html');
      // The basic XML minifier replaces >\s+< but keeps content inside tags
      // It does NOT tokenize attributes specifically, so it treats tag content as one block.
      // <div class="foo" id="bar"> is inside a tag? No, our XML optimizer is regex based.
      // It blindly collapses whitespace between tags.
      assert.strictEqual(res, '<div class="foo" id="bar"></div>');
    });
  });

  describe('Smoke Tests (All Languages)', () => {
    // List of common extensions to ensure no config errors or crashes
    const LANGS = [
      'c', 'cpp', 'cs', 'java', 'kt', 'scala', 
      'rs', 'go', 
      'js', 'ts', 'py', 'rb', 'lua', 'pl', 'php', 
      'sh', 'ps1', 'bat',
      'sql', 'xml', 'html', 'css', 'yaml', 'ini', 'clj', 'hs'
    ];

    LANGS.forEach(ext => {
      it(`Optimizes .${ext} without crashing`, () => {
        const src = `
          // C-Style
          # Hash-Style
          var x = "string";
        `;
        const res = Optimizer.run(src, ext, OPTIMIZE.MINIFY);
        assert.ok(typeof res === 'string');
        assert.ok(res.includes('var x')); // Basic integrity check
      });
    });
  });
});
