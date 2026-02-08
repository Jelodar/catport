

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Formatter } from '../../src/formatters/index.js';
import { FORMAT, XML_TAGS, XML_MODE } from '../../src/config/constants.js';

describe('Unit: Formatters', () => {
  const meta = { name: 'test', tree: 'tree', instruct: false, context: 'ctx' };
  const file = { rel: 'src/a.js', content: 'console.log("hi");' };
  
  // --- MARKDOWN ---
  it('Markdown: generates and parses', () => {
    const fmt = Formatter.get(FORMAT.MD);
    const out = fmt.header(meta) + fmt.file(file) + fmt.footer(meta);
    const parsed = fmt.parse(out);
    assert.strictEqual(parsed[0].path, 'src/a.js');
    assert.strictEqual(parsed[0].content, 'console.log("hi");');
  });

  it('Markdown: handles nested fences by increasing fence length', () => {
    const fmt = Formatter.get(FORMAT.MD);
    const content = '```js\ncode\n```';
    const f = { rel: 'doc.md', content };
    const out = fmt.file(f);
    
    // Should automatically use 4 backticks to wrap 3 backticks
    // It appends the extension (md) to the fence
    assert.ok(out.includes('````md'));
    assert.ok(out.includes(content + '\n````'));
    
    // Should parse back correctly
    const parsed = fmt.parse(out);
    assert.strictEqual(parsed[0].content, content);
  });

  // --- XML ---
  it('XML: handles CDATA split', () => {
    const fmt = Formatter.get(FORMAT.XML);
    const content = 'Data with ' + XML_TAGS.CDATA_OPEN + 'TAG' + XML_TAGS.CDATA_CLOSE;
    const f = { rel: 'a.xml', content };
    
    // Test auto mode splitting
    const out = fmt.file(f, { xmlMode: XML_MODE.AUTO });
    assert.ok(out.includes(XML_TAGS.CDATA_CLOSE + XML_TAGS.CDATA_OPEN));
    
    const full = fmt.header(meta) + out + fmt.footer(meta);
    const parsed = fmt.parse(full);
    assert.strictEqual(parsed[0].content, content);
  });

  it('XML: Escape mode', () => {
    const fmt = Formatter.get(FORMAT.XML);
    const f = { rel: 'a.txt', content: '<&>' };
    const out = fmt.file(f, { xmlMode: XML_MODE.ESCAPE });
    assert.ok(out.includes('&lt;&amp;&gt;'));
    assert.ok(!out.includes('CDATA'));
  });

  // --- JSON ---
  it('JSON: generates and parses', () => {
    const fmt = Formatter.get(FORMAT.JSON);
    const out = fmt.header(meta) + fmt.file(file) + fmt.footer(meta);
    const parsed = fmt.parse(out);
    assert.strictEqual(parsed[0].path, 'src/a.js');
  });

  it('JSON: parses robustly from markdown block', () => {
    const fmt = Formatter.get(FORMAT.JSON);
    const txt = 'Here is the json:\n```json\n{ "files": [{ "path": "p", "content": "c" }] }\n```';
    const parsed = fmt.parse(txt);
    assert.strictEqual(parsed[0].path, 'p');
  });

  // --- YAML ---
  it('YAML: generates and parses', () => {
    const fmt = Formatter.get(FORMAT.YAML);
    const out = fmt.header(meta) + fmt.file(file) + fmt.footer(meta);
    const parsed = fmt.parse(out);
    assert.strictEqual(parsed[0].path, 'src/a.js');
    assert.strictEqual(parsed[0].content, 'console.log("hi");');
  });

  it('YAML: handles multiline content', () => {
    const fmt = Formatter.get(FORMAT.YAML);
    const f = { rel: 'multi', content: 'line1\nline2' };
    const out = fmt.file(f);
    const parsed = fmt.parse(out);
    assert.strictEqual(parsed[0].content, 'line1\nline2');
  });

  // --- MULTIPART ---
  it('Multipart: generates and parses', () => {
    const fmt = Formatter.get(FORMAT.MULTIPART);
    const out = fmt.header(meta) + fmt.file(file) + fmt.footer(meta);
    const parsed = fmt.parse(out);
    assert.strictEqual(parsed[0].path, 'src/a.js');
    assert.strictEqual(parsed[0].content, 'console.log("hi");');
  });
  
  it('Multipart: handles parsing legacy boundaries', () => {
    const fmt = Formatter.get(FORMAT.MULTIPART);
    const legacyBoundary = '---CATPORT-BOUNDARY';
    const txt = `MIME-Version: 1.0\n\n${legacyBoundary}\nContent-Disposition: attachment; filename="a.txt"\n\nDATA\n${legacyBoundary}--`;
    
    const parsed = fmt.parse(txt);
    assert.strictEqual(parsed[0].path, 'a.txt');
    assert.strictEqual(parsed[0].content, 'DATA');
  });

  it('Detects formats', () => {
    assert.strictEqual(Formatter.detect('{ "files": [] }'), Formatter.get(FORMAT.JSON));
    assert.strictEqual(Formatter.detect('<project>'), Formatter.get(FORMAT.XML));
    assert.strictEqual(Formatter.detect('meta:\n  name:'), Formatter.get(FORMAT.YAML));
    assert.strictEqual(Formatter.detect('MIME-Version: 1.0'), Formatter.get(FORMAT.MULTIPART));
  });
});
