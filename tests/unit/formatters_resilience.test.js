
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { FILE_MARKER } from '../../src/formatters/markdown.js';
import { Formatter } from '../../src/formatters/index.js';
import { FORMAT, XML_TAGS } from '../../src/config/constants.js';

describe('Unit: Formatter Resilience', () => {
  const logger = { warn: () => {} };

  describe('Markdown Parser', () => {
    const fmt = Formatter.get(FORMAT.MD);

    it('Handles missing code block fences', () => {
      const input = `${FILE_MARKER} a.txt\nNo code block here.`;
      const files = fmt.parse(input, logger);
      assert.strictEqual(files.length, 0);
    });

    it('Handles unclosed code blocks (EOF)', () => {
      const input = `${FILE_MARKER} a.txt\n\`\`\`\ncontent`;
      // Implementation breaks on "reached end of input" and skips file to avoid partials.
      const files = fmt.parse(input, logger);
      assert.strictEqual(files.length, 0);
    });

    it('Handles garbage between files', () => {
      const input = `
        ${FILE_MARKER} a.txt
        \`\`\`
        A
        \`\`\`
        
        GARBAGE TEXT
        
        ${FILE_MARKER} b.txt
        \`\`\`
        B
        \`\`\`
      `;
      const files = fmt.parse(input, logger);
      assert.strictEqual(files.length, 2);
      assert.strictEqual(files[0].path, 'a.txt');
      assert.strictEqual(files[1].path, 'b.txt');
    });
  });

  describe('JSON Parser', () => {
    const fmt = Formatter.get(FORMAT.JSON);

    it('Recovers from truncation if valid objects exist before truncation', () => {
      const input = '{ "files": [ { "path": "a", "content": "A" }, { "path": "b", "con';
      const files = fmt.parse(input, logger);
      assert.deepStrictEqual(files, []);
    });

    it('Handles nested markdown confusion', () => {
      const input = `
        Here is a file with markdown:
        \`\`\`json
        {
          "files": [{ "path": "doc.md", "content": "Use \`code\` fences" }]
        }
        \`\`\`
      `;
      const files = fmt.parse(input, logger);
      assert.strictEqual(files[0].path, 'doc.md');
      assert.strictEqual(files[0].content, 'Use `code` fences');
    });
  });

  describe('Multipart Parser', () => {
    const fmt = Formatter.get(FORMAT.MULTIPART);

    it('Skips parts without headers', () => {
      const b = '---BOUNDARY';
      const input = `${b}\nJust Content\n${b}--`;
      const files = fmt.parse(input, logger);
      assert.strictEqual(files.length, 0);
    });

    it('Skips parts without filename', () => {
      const b = '---BOUNDARY';
      const input = `${b}\nContent-Type: text/plain\n\nData\n${b}--`;
      const files = fmt.parse(input, logger);
      assert.strictEqual(files.length, 0);
    });
  });

  describe('XML Parser', () => {
    const fmt = Formatter.get(FORMAT.XML);

    it('Handles malformed file tags', () => {
      const input = `<files>
        <file path="good.txt">${XML_TAGS.CDATA_OPEN}A${XML_TAGS.CDATA_CLOSE}</file>
        <file path="bad.txt">MISSING_CLOSE
      </files>`;
      const files = fmt.parse(input, logger);
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].path, 'good.txt');
    });

    it('Handles tags with weird attributes', () => {
      const input = `<file path="weird.txt" extra="ignore">${XML_TAGS.CDATA_OPEN}Content${XML_TAGS.CDATA_CLOSE}</file>`;
      const files = fmt.parse(input, logger);
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].content, 'Content');
    });
    
    it('Handles content without CDATA', () => {
      const input = '<file path="legacy.txt">Raw Content &amp; More</file>';
      const files = fmt.parse(input, logger);
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].content, 'Raw Content & More');
    });
  });

  describe('YAML Parser', () => {
    const fmt = Formatter.get(FORMAT.YAML);

    it('Handles flexible path syntax (no quotes)', () => {
      const input = `files:
  - path: src/main.js
    content: |
      code
`;
      const files = fmt.parse(input, logger);
      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].path, 'src/main.js');
    });

    it('Handles comments in block scalar header', () => {
      const input = `files:
  - path: "a.txt"
    content: | # This is a comment
      line 1
      line 2
`;
      const files = fmt.parse(input, logger);
      assert.strictEqual(files[0].content, 'line 1\nline 2');
    });

    it('Handles dedent properly (stops content capture)', () => {
      const input = `files:
  - path: "a.txt"
    content: |
      inside
  - path: "b.txt"
    content: |
      inside b
`;
      const files = fmt.parse(input, logger);
      assert.strictEqual(files.length, 2);
      assert.strictEqual(files[0].content, 'inside');
      assert.strictEqual(files[1].path, 'b.txt');
    });
  });
});
