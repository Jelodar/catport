
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Json } from '../../src/formatters/json.js';

describe('Unit: JSON Formatter Extended Coverage', () => {

  const parse = (text) => Json.parse(text);

  it('Parses valid standard JSON', () => {
    const input = JSON.stringify({
      files: [{ path: 'a', content: 'c' }]
    });
    const res = parse(input);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].path, 'a');
    assert.strictEqual(res[0].content, 'c');
  });

  it('Parses valid JSON with formatting', () => {
    const input = `{
      "files": [
        {
          "path": "src/main.js",
          "content": "console.log('hello');"
        }
      ]
    }`;
    const res = parse(input);
    assert.strictEqual(res[0].path, 'src/main.js');
  });

  describe('Normalization: Keys', () => {
    it('Handles bare keys (standard identifier)', () => {
      const input = `{
        files: [{ path: "p", content: "c" }]
      }`;
      const res = parse(input);
      assert.strictEqual(res[0].path, 'p');
    });

    it('Handles bare keys (with hyphens)', () => {
      // Internal object with extra key to test normalization
      // Note: Parse only returns the files list, checking correctness of list structure
      const input = `{
        files: [{ path: "p", content: "c", extra-key: 123 }]
      }`;
      const res = parse(input);
      assert.strictEqual(res[0].path, 'p');
    });

    it('Handles bare keys (starting with number)', () => {
      const input = `{
        files: [{ 123key: "val", path: "p", content: "c" }]
      }`;
      const res = parse(input);
      assert.strictEqual(res[0].path, 'p');
    });
    
    it('Handles bare keys (special chars $ _)', () => {
      const input = `{
        $meta: {},
        _files: [],
        files: [{ path: "p", content: "c" }]
      }`;
      const res = parse(input);
      assert.strictEqual(res.length, 1);
    });
  });

  describe('Normalization: Quotes', () => {
    it('Handles single quoted keys', () => {
      const input = `{
        'files': [{ 'path': 'p', 'content': 'val' }]
      }`;
      const res = parse(input);
      assert.strictEqual(res[0].path, 'p');
    });

    it('Handles single quoted values', () => {
      const input = `{
        files: [{ path: 'p', content: 'val' }]
      }`;
      const res = parse(input);
      assert.strictEqual(res[0].content, 'val');
    });

    it('Handles single quoted values containing escaped single quotes', () => {
      const input = `{
        files: [{ path: 'p', content: 'It\\'s a test' }]
      }`;
      const res = parse(input);
      assert.strictEqual(res[0].content, "It's a test");
    });
    
    it('Handles single quoted values containing double quotes', () => {
      const input = `{
        files: [{ path: 'p', content: 'He said "Hello"' }]
      }`;
      const res = parse(input);
      assert.strictEqual(res[0].content, 'He said "Hello"');
    });
  });

  describe('Normalization: Trailing Commas', () => {
    it('Removes trailing comma in object', () => {
      const input = `{
        "files": [{ "path": "p", "content": "c" },],
      }`;
      const res = parse(input);
      assert.strictEqual(res.length, 1);
    });

    it('Removes trailing comma in array', () => {
      const input = `{
        "files": [
          { "path": "p", "content": "c" },
        ]
      }`;
      const res = parse(input);
      assert.strictEqual(res.length, 1);
    });
  });

  describe('Normalization: Comments', () => {
    it('Removes single line comments //', () => {
      const input = `{
        // Header comment
        "files": [ // Array start
          { "path": "p", "content": "c" } // Item
        ]
      }`;
      const res = parse(input);
      assert.strictEqual(res.length, 1);
    });

    it('Removes block comments /* */', () => {
      const input = `{
        /* 
           Multi-line 
           Comment 
        */
        "files": [
          { "path": "p", "content": "c" } /* Inline */
        ]
      }`;
      const res = parse(input);
      assert.strictEqual(res.length, 1);
    });

    it('Does NOT remove comments inside strings', () => {
      const input = `{
        "files": [{
          "path": "p",
          "content": "Line 1 // Not a comment"
        }, {
          "path": "q",
          "content": "Line 2 /* Not a block */"
        }]
      }`;
      const res = parse(input);
      assert.strictEqual(res[0].content, 'Line 1 // Not a comment');
      assert.strictEqual(res[1].content, 'Line 2 /* Not a block */');
    });
  });

  describe('Parsing Strategies', () => {
    it('Extracts from Markdown block (```json)', () => {
      const input = `
        Here is the output:
        \`\`\`json
        {
          "files": [{ "path": "p", "content": "c" }]
        }
        \`\`\`
      `;
      const res = parse(input);
      assert.strictEqual(res[0].path, 'p');
    });

    it('Extracts from Markdown block (no lang)', () => {
      const input = `
        \`\`\`
        {
          "files": [{ "path": "p", "content": "c" }]
        }
        \`\`\`
      `;
      const res = parse(input);
      assert.strictEqual(res[0].path, 'p');
    });

    it('Extracts from raw object text (brace matching)', () => {
      const input = `
        Some conversational text.
        {
          "files": [{ "path": "p", "content": "c" }]
        }
        More text.
      `;
      const res = parse(input);
      assert.strictEqual(res[0].path, 'p');
    });

    it('Prioritizes Markdown block over outer text', () => {
      const input = `
        { "invalid": "json" 
        \`\`\`json
        { "files": [{ "path": "p", "content": "c" }] }
        \`\`\`
      `;
      const res = parse(input);
      assert.strictEqual(res[0].path, 'p');
    });

    it('Handles recursive normalization in extracted blocks', () => {
      // Markdown block contains JSON with comments and single quotes
      const input = `
        \`\`\`json
        {
          files: [{ path: 'p', content: 'c' }] // comment
        }
        \`\`\`
      `;
      const res = parse(input);
      assert.strictEqual(res[0].path, 'p');
    });
  });

  describe('Error Handling', () => {
    it('Returns empty array for invalid JSON', () => {
      const res = parse('invalid');
      assert.deepStrictEqual(res, []);
    });

    it('Returns empty array for valid JSON missing schema', () => {
      const res = parse('{ "foo": "bar" }');
      assert.deepStrictEqual(res, []);
    });

    it('Returns empty array for wrong types', () => {
      const res = parse('{ "files": "string_not_array" }');
      assert.deepStrictEqual(res, []);
    });
    
    it('Returns empty array for null/undefined input', () => {
      assert.deepStrictEqual(parse(null), []);
      assert.deepStrictEqual(parse(undefined), []);
      assert.deepStrictEqual(parse(''), []);
    });
  });
  
  describe('Complex Scenarios', () => {
    it('Parses complex mixed content', () => {
      const input = `
        Okay, here is your code:
        
        \`\`\`json
        {
          files: [
            {
              path: 'src/index.js',
              content: "console.log(\\"Hello\\");"
            },
            {
              path: 'README.md',
              content: "# Title\\n\\nDescription"
            }
          ]
        }
        \`\`\`
      `;
      const res = parse(input);
      assert.strictEqual(res.length, 2);
      assert.strictEqual(res[0].path, 'src/index.js');
      assert.strictEqual(res[0].content, 'console.log("Hello");');
      assert.strictEqual(res[1].path, 'README.md');
    });

    it('Handles Pathological Backslashes', () => {
      // Source string has 8 backslashes: \\\\\\\\
      // This represents 8 literal backslashes in the input buffer.
      // normalizeJsonLike passes them through.
      // JSON.parse decodes them: \\ (escaped backslash) -> \ (literal backslash)
      // So 8 inputs become 4 outputs.
      const input = `{
        "files": [{ "path": "p", "content": "\\\\\\\\" }] 
      }`;
      const res = parse(input);
      assert.strictEqual(res[0].content, '\\\\'); // 4 backslashes
    });
  });
});
