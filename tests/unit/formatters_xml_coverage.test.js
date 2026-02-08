import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Xml } from '../../src/formatters/xml.js';
import { XML_TAGS, XML_MODE } from '../../src/config/constants.js';

describe('Unit: XML Formatter Extended Coverage', () => {
  const parse = (text, logger) => Xml.parse(text, logger);
  const mockLogger = { warn: () => {} };

  it('Parses standard output', () => {
    const input = `<root><files>
      <file path="a.txt">${XML_TAGS.CDATA_OPEN}content${XML_TAGS.CDATA_CLOSE}</file>
    </files></root>`;
    const files = parse(input);
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].path, 'a.txt');
    assert.strictEqual(files[0].content, 'content');
  });

  it('Handles multiple files on same line', () => {
    const input = `<file path="a">${XML_TAGS.CDATA_OPEN}1${XML_TAGS.CDATA_CLOSE}</file><file path="b">${XML_TAGS.CDATA_OPEN}2${XML_TAGS.CDATA_CLOSE}</file>`;
    const files = parse(input);
    assert.strictEqual(files.length, 2);
    assert.strictEqual(files[0].content, '1');
    assert.strictEqual(files[1].content, '2');
  });

  it('Handles nested CDATA markers', () => {
    const content = `Safe ${XML_TAGS.CDATA_CLOSE} Unsafe`;
    const f = { rel: 'test.txt', content };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.CDATA });
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);
    
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].path, 'test.txt');
    assert.strictEqual(files[0].content, content);
  });

  it('Handles content looking like tags inside CDATA', () => {
    const content = '<file path="fake.txt">Fake</file>';
    const input = `<file path="real.txt">${XML_TAGS.CDATA_OPEN}${content}${XML_TAGS.CDATA_CLOSE}</file>`;
    const files = parse(input);
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].path, 'real.txt');
    assert.strictEqual(files[0].content, content);
  });

  it('Gracefully handles missing close tags', () => {
    const input = `<file path="a.txt">${XML_TAGS.CDATA_OPEN}content`;
    const files = parse(input, mockLogger);
    assert.strictEqual(files.length, 0);
  });

  it('Gracefully handles malformed open tags', () => {
    const input = '<file path="a.txt';
    const files = parse(input, mockLogger);
    assert.strictEqual(files.length, 0);
  });
  
  it('Ignores content outside file tags', () => {
    const input = `preamble <file path="a.txt">${XML_TAGS.CDATA_OPEN}A${XML_TAGS.CDATA_CLOSE}</file> postscript`;
    const files = parse(input);
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].content, 'A');
  });

  it('ESCAPE mode removes null bytes and escapes content (XML 1.1)', () => {
    const content = 'text\x00null\x01control';
    const f = { rel: 'invalid.txt', content };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.ESCAPE });
    // Should use escaped format, not CDATA (XML 1.1 supports control chars except null)
    assert.ok(!formatted.includes(XML_TAGS.CDATA_OPEN));
    assert.ok(formatted.includes('&lt;') || formatted.includes('text') || formatted.includes('control'));
    // Null byte should be removed
    assert.ok(!formatted.includes('\x00'));
    
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);
    assert.strictEqual(files.length, 1);
    // Content should have null byte removed but other control chars preserved
    assert.strictEqual(files[0].content, 'textnull\x01control');
  });

  it('ESCAPE mode works normally for valid XML characters', () => {
    const content = '<tag>&amp;text</tag>';
    const f = { rel: 'valid.txt', content };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.ESCAPE });
    // Should use escape, not CDATA
    assert.ok(!formatted.includes(XML_TAGS.CDATA_OPEN));
    assert.ok(formatted.includes('&lt;'));
    assert.ok(formatted.includes('&amp;'));
    
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].content, content);
  });

  it('Sanitizes invalid characters from path attributes', () => {
    const f = { rel: 'file\x00name.txt', content: 'content' };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.AUTO });
    // Path should not contain null byte
    assert.ok(!formatted.includes('\x00'));
    assert.ok(formatted.includes('filename.txt'));
    
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].path, 'filename.txt');
  });

  it('Handles invalid characters in header context (removes null, escapes)', () => {
    const meta = { name: 'test', context: 'context\x00with\x01null', tree: null, instruct: false };
    const header = Xml.header(meta);
    // Should use escaped format, not CDATA (XML 1.1 supports control chars except null)
    assert.ok(!header.includes(XML_TAGS.CDATA_OPEN));
    assert.ok(header.includes('context'));
    assert.ok(header.includes('version="1.1"'));
    // Null byte should be removed
    assert.ok(!header.includes('\x00'));
  });

  it('Handles invalid characters in header tree (removes null, escapes)', () => {
    const meta = { name: 'test', context: null, tree: 'tree\x00structure', instruct: false };
    const header = Xml.header(meta);
    // Should use escaped format, not CDATA (XML 1.1 supports control chars except null)
    assert.ok(!header.includes(XML_TAGS.CDATA_OPEN));
    assert.ok(header.includes('tree'));
    // Null byte should be removed
    assert.ok(!header.includes('\x00'));
  });

  it('Handles invalid characters in footer instruction (removes null, escapes)', () => {
    const meta = { instructionText: 'instruction\x00text', task: null };
    const footer = Xml.footer(meta);
    // Should use escaped format, not CDATA (XML 1.1 supports control chars except null)
    assert.ok(!footer.includes(XML_TAGS.CDATA_OPEN));
    assert.ok(footer.includes('instruction'));
    // Null byte should be removed
    assert.ok(!footer.includes('\x00'));
  });

  it('Handles invalid characters in footer task (removes null, escapes)', () => {
    const meta = { instructionText: null, task: 'task\x00content' };
    const footer = Xml.footer(meta);
    // Should use escaped format, not CDATA (XML 1.1 supports control chars except null)
    assert.ok(!footer.includes(XML_TAGS.CDATA_OPEN));
    assert.ok(footer.includes('task'));
    // Null byte should be removed
    assert.ok(!footer.includes('\x00'));
  });

  it('Uses XML 1.1 in header', () => {
    const meta = { name: 'test', context: null, tree: null, instruct: false };
    const header = Xml.header(meta);
    assert.ok(header.includes('version="1.1"'));
  });

  // Control character sanitization edge cases
  it('Sanitizes all invalid XML attribute characters from paths', () => {
    // Test all invalid control characters for attributes
    const invalidChars = '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x0B\x0C\x0E\x0F\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1A\x1B\x1C\x1D\x1E\x1F\x7F\x80\x81\x82\x83\x84\x85\x86\x87\x88\x89\x8A\x8B\x8C\x8D\x8E\x8F\x90\x91\x92\x93\x94\x95\x96\x97\x98\x99\x9A\x9B\x9C\x9D\x9E\x9F';
    const f = { rel: `file${invalidChars}name.txt`, content: 'content' };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.AUTO });

    // Should not contain any invalid characters
    for (const char of invalidChars) {
      assert.ok(!formatted.includes(char), `Should not contain invalid char: ${char.charCodeAt(0)}`);
    }
    assert.ok(formatted.includes('filename.txt'));

    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].path, 'filename.txt');
  });

  it('Sanitizes all invalid XML attribute characters from project names', () => {
    const invalidChars = '\x00\x01\x02\x03\x04\x05\x06\x07\x08\x0B\x0C\x0E\x0F\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1A\x1B\x1C\x1D\x1E\x1F\x7F\x80\x81\x82\x83\x84\x85\x86\x87\x88\x89\x8A\x8B\x8C\x8D\x8E\x8F\x90\x91\x92\x93\x94\x95\x96\x97\x98\x99\x9A\x9B\x9C\x9D\x9E\x9F';
    const meta = { name: `project${invalidChars}name`, context: null, tree: null, task: null, instructionText: null };
    const header = Xml.header(meta);

    // Should not contain any invalid characters
    for (const char of invalidChars) {
      assert.ok(!header.includes(char), `Should not contain invalid char: ${char.charCodeAt(0)}`);
    }
    assert.ok(header.includes('projectname'));
  });

  it('Preserves valid control characters in content (XML 1.1)', () => {
    // Tab, LF, CR are valid in XML attributes and content
    const content = 'Line 1\x09tab\x0Aline\x0Dcarriage';
    const f = { rel: 'valid.txt', content };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.CDATA });
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);

    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].content, content);
  });

  // Empty content edge cases
  it('Handles empty file content', () => {
    const f = { rel: 'empty.txt', content: '' };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.AUTO });
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);

    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].path, 'empty.txt');
    assert.strictEqual(files[0].content, '');
  });

  it('Handles files with only whitespace content', () => {
    const content = '   \n\t\r   ';
    const f = { rel: 'whitespace.txt', content };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.CDATA });
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);

    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].content, content);
  });

  // Unicode edge cases
  it('Handles Unicode characters in paths (valid ones)', () => {
    const f = { rel: '文件名 🚀 тест.txt', content: 'content' };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.AUTO });
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);

    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].path, '文件名 🚀 тест.txt');
  });

  it('Handles Unicode content with various scripts', () => {
    const content = 'English 中文 العربية русский עברית';
    const f = { rel: 'unicode.txt', content };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.CDATA });
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);

    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].content, content);
  });

  it('Handles Unicode combining characters and emoji', () => {
    const content = 'café naïve 🚀💻🎉 が'; // includes combining characters
    const f = { rel: 'emoji.txt', content };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.CDATA });
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);

    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].content, content);
  });

  // CDATA edge cases
  it('Handles multiple consecutive CDATA end markers', () => {
    const content = `Start ${XML_TAGS.CDATA_CLOSE}${XML_TAGS.CDATA_CLOSE} Middle ${XML_TAGS.CDATA_CLOSE}${XML_TAGS.CDATA_CLOSE} End`;
    const f = { rel: 'multi-cdata.txt', content };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.CDATA });
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);

    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].content, content);
  });

  it('Handles CDATA markers at content boundaries', () => {
    const content = `${XML_TAGS.CDATA_CLOSE}start${XML_TAGS.CDATA_CLOSE}`;
    const f = { rel: 'boundary.txt', content };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.CDATA });
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);

    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].content, content);
  });

  it('Handles malformed CDATA in ESCAPE mode fallback', () => {
    // Content that looks like CDATA but isn't properly formed
    const content = `${XML_TAGS.CDATA_OPEN}unclosed content`;
    const f = { rel: 'malformed-cdata.txt', content };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.ESCAPE });
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);

    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].content, content);
  });

  // XML entity edge cases
  it('Handles all standard XML entities correctly', () => {
    const content = '&lt;tag&gt; &amp; &apos;quote&apos; &quot;double&quot;';
    const f = { rel: 'entities.txt', content };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.ESCAPE });
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);

    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].content, content);
  });

  it('Handles malformed entities (unclosed)', () => {
    const content = 'Text with &lt;good&gt; &bad &unknown; &unclosed';
    const f = { rel: 'malformed-entities.txt', content };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.ESCAPE });
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);

    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].content, content);
  });

  it('Handles numeric character references', () => {
    const content = '&#65; &#x41; &#233; &#x00E9;'; // A, A, é, é
    const f = { rel: 'numeric-refs.txt', content };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.ESCAPE });
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);

    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].content, content);
  });

  // Path edge cases
  it('Handles paths with special valid characters', () => {
    const paths = [
      'file-name_test.123',
      'path/to/deep/file.txt',
      'file.with.multiple.dots.txt',
      'file-with-dashes-and_underscores.txt',
      '123numeric-start.txt'
    ];

    for (const path of paths) {
      const f = { rel: path, content: 'content' };
      const formatted = Xml.file(f, { xmlMode: XML_MODE.AUTO });
      const input = `<root><files>${formatted}</files></root>`;
      const files = parse(input);

      assert.strictEqual(files.length, 1);
      assert.strictEqual(files[0].path, path);
    }
  });

  it('Handles extremely long paths', () => {
    const longPath = 'a'.repeat(1000) + '.txt';
    const f = { rel: longPath, content: 'content' };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.AUTO });
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);

    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].path, longPath);
  });

  // Content boundary cases
  it('Handles very large content', () => {
    const largeContent = 'x'.repeat(10000);
    const f = { rel: 'large.txt', content: largeContent };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.CDATA });
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);

    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].content, largeContent);
  });

  // Mode behavior edge cases
  it('AUTO mode chooses CDATA for content with XML-like chars', () => {
    const content = '<tag>content</tag>';
    const f = { rel: 'xml-like.txt', content };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.AUTO });
    assert.ok(formatted.includes(XML_TAGS.CDATA_OPEN));

    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);
    assert.strictEqual(files[0].content, content);
  });

  it('AUTO mode chooses ESCAPE for content without XML-like chars', () => {
    const content = 'plain text content';
    const f = { rel: 'plain.txt', content };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.AUTO });
    assert.ok(!formatted.includes(XML_TAGS.CDATA_OPEN));

    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);
    assert.strictEqual(files[0].content, content);
  });

  // Processing instruction and comment edge cases
  it('Handles XML processing instructions in content', () => {
    const content = '<?xml version="1.0"?><root><?pi content?></root>';
    const f = { rel: 'pi-content.txt', content };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.CDATA });
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);

    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].content, content);
  });

  it('Handles XML comments in content', () => {
    const content = '<!-- comment --><root><!-- nested --></root>';
    const f = { rel: 'comment-content.txt', content };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.CDATA });
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);

    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].content, content);
  });

  // Malformed XML recovery
  it('Recovers from partial file tags', () => {
    const input = `<file path="good.txt">${XML_TAGS.CDATA_OPEN}good${XML_TAGS.CDATA_CLOSE}</file><file path="partial.txt">${XML_TAGS.CDATA_OPEN}partial`;
    const files = parse(input, mockLogger);
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].path, 'good.txt');
    assert.strictEqual(files[0].content, 'good');
  });

  it('Handles nested file-like content', () => {
    const content = `<file path="nested.txt">${XML_TAGS.CDATA_OPEN}nested content${XML_TAGS.CDATA_CLOSE}</file>`;
    const f = { rel: 'outer.txt', content };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.CDATA });
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);

    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].path, 'outer.txt');
    assert.strictEqual(files[0].content, content);
  });

  it('Handles mixed quote types in paths', () => {
    const f = { rel: 'path\'with"quotes.txt', content: 'content' };
    const formatted = Xml.file(f, { xmlMode: XML_MODE.AUTO });
    const input = `<root><files>${formatted}</files></root>`;
    const files = parse(input);

    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].path, 'path\'with"quotes.txt');
  });
});
