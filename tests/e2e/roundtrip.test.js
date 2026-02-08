
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CLI } from '../../src/cli/main.js';
import { createMockIO } from '../setup.js';

describe('E2E: Roundtrip (Bundle -> Extract)', () => {
  const FILES = {
    'src/main.js': 'console.log("hello world");',
    'src/utils/math.js': 'export const add = (a, b) => a + b;',
    'README.md': '# Project\nDescription here.',
    'config.json': '{\n  "debug": true\n}',
    'data/raw.xml': '<root><item>1</item></root>'
  };

  const runRoundtrip = async (format) => {
    // 1. Bundle
    const bundleIO = createMockIO(FILES);
    await CLI.run(['node', 'catport', '.', '-f', format, '-o', 'bundle.out'], bundleIO);
    
    const bundleContent = bundleIO._written['bundle.out'];
    assert.ok(bundleContent, `Failed to generate bundle for ${format}`);
    assert.ok(bundleContent.length > 0, `Bundle is empty for ${format}`);

    // 2. Extract
    // Create a fresh IO environment with JUST the bundle
    const extractIO = createMockIO({ 'bundle.out': bundleContent });
    await CLI.run(['node', 'catport', '-x', 'bundle.out', '-d', 'output'], extractIO);

    // 3. Verify
    for (const [relPath, expectedContent] of Object.entries(FILES)) {
      const extractedPath = `output/${relPath}`;
      const actualContent = extractIO._written[extractedPath];
      
      assert.notStrictEqual(actualContent, undefined, `File ${relPath} was not extracted in ${format} mode`);
      
      // Normalize newlines for comparison (formatters might normalize CRLF)
      const normExpected = expectedContent.trim().replace(/\r\n/g, '\n');
      const normActual = actualContent.trim().replace(/\r\n/g, '\n');
      
      assert.strictEqual(normActual, normExpected, `Content mismatch for ${relPath} in ${format} mode`);
    }
  };

  it('Roundtrips Markdown', async () => await runRoundtrip('md'));
  it('Roundtrips JSON', async () => await runRoundtrip('json'));
  it('Roundtrips XML', async () => await runRoundtrip('xml'));
  it('Roundtrips YAML', async () => await runRoundtrip('yaml'));
  it('Roundtrips Multipart', async () => await runRoundtrip('multipart'));

  it('Roundtrips with Optimizations (Minify + JSON)', async () => {
    // Minification alters content, so we cannot expect bit-exact match of original source.
    // Instead, we verify the extracted code is the MINIFIED version of the original.
    
    const io = createMockIO({
      'src/app.js': 'var a = 1; \n // comment \n var b = 2;'
    });

    // Bundle with minify
    await CLI.run(['node', 'catport', '.', '-f', 'json', '-O', 'minify', '-o', 'bundle.json'], io);
    const bundle = io._written['bundle.json'];

    // Extract
    const io2 = createMockIO({ 'bundle.json': bundle });
    await CLI.run(['node', 'catport', '-x', 'bundle.json'], io2);

    const extracted = io2._written['src/app.js'];
    assert.strictEqual(extracted, 'var a=1;var b=2;');
  });
});
