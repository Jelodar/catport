import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Extractor } from '../../src/core/extractor.js';
import { createMockIO } from '../setup.js';
import { FILE_MARKER } from '../../src/formatters/markdown.js';

describe('Integration: Security', () => {
  it('Blocks parent directory traversal (../)', async () => {
    const maliciousBundle = `${FILE_MARKER} ../../etc/passwd
\`\`\`
root:x:0:0:root:/root:/bin/bash
\`\`\``;

    const io = createMockIO({ 'attack.md': maliciousBundle });
    await Extractor.run({ paths: ['attack.md'], extractDir: 'safe_zone' }, io);

    // Should NOT write to root or outside safe_zone
    assert.strictEqual(io._written['../../etc/passwd'], undefined);
    assert.strictEqual(io._written['../etc/passwd'], undefined);
    assert.strictEqual(io._written['/etc/passwd'], undefined);

    // Check logs
    assert.match(io._logs.join(''), /Skipping traversal attempt/);
  });

  it('Blocks absolute paths', async () => {
    const maliciousBundle = `${FILE_MARKER} /etc/shadow
\`\`\`
secret
\`\`\``;

    const io = createMockIO({ 'attack.md': maliciousBundle });
    await Extractor.run({ paths: ['attack.md'], extractDir: 'safe_zone' }, io);

    assert.strictEqual(io._written['/etc/shadow'], undefined);
    assert.match(io._logs.join(''), /Skipping traversal attempt/);
  });

  it('Allows traversal if --unsafe is passed', async () => {
    // Note: MockIO normalize() strips leading absolute paths/CWD,
    // so we test "upward" traversal behavior relative to CWD.
    const payload = `${FILE_MARKER} ../unsafe.txt
\`\`\`
I escaped!
\`\`\``;

    const io = createMockIO({ 'attack.md': payload });
    // extractDir='out', so ../unsafe.txt means writing to CWD/unsafe.txt (sibling of out)
    await Extractor.run({ paths: ['attack.md'], extractDir: 'out', safeMode: false }, io);

    // In MockIO, 'out/../unsafe.txt' resolves to 'unsafe.txt'
    assert.strictEqual(io._written['unsafe.txt'], 'I escaped!');
  });

  it('Sanitizes filenames with null bytes', async () => {
    const payload = `${FILE_MARKER} valid.js\0.exe
\`\`\`
code
\`\`\``;
    const io = createMockIO({ 'null.md': payload });
    await Extractor.run({ paths: ['null.md'] }, io);

    assert.strictEqual(io._written['valid.js.exe'], 'code');
  });
  
});
