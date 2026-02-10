

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { UI } from '../../src/cli/ui.js';
import { createMockIO } from '../setup.js';

describe('Unit: UI', () => {
  const MOCK_APP = { NAME: 'test-app', VERSION: '1.2.3', DESC: 'desc' };
  const MOCK_SCHEMA = {
    flag: { short: 'f', type: 'boolean', desc: 'flag desc', category: 'General' },
    opt: { short: 'o', type: 'string', desc: 'opt desc', metavar: 'VAL', category: 'General' },
    bundle: { short: 'b', type: 'boolean', desc: 'bundle flag', category: 'Bundling' },
    extract: { short: 'x', type: 'boolean', desc: 'extract flag', category: 'Extraction' }
  };

  it('prints header', () => {
    const io = createMockIO();
    const ui = UI(io);
    ui.printHeader(MOCK_APP);
    assert.ok(io._stdout.length > 0);
    assert.match(io._stdout.join(''), /test-app/);
    assert.match(io._stdout.join(''), /v1\.2\.3/);
    assert.match(io._stdout.join(''), /desc/);
  });

  it('prints help', () => {
    delete process.env.FORCE_COLOR;
    process.env.NO_COLOR = '1';
    const io = createMockIO();
    const ui = UI(io);
    try {
      ui.printHelp(MOCK_APP, MOCK_SCHEMA);
      assert.match(io._stdout.join(''), /USAGE/);
      assert.match(io._stdout.join(''), /GENERAL/);
      assert.match(io._stdout.join(''), /-f, --flag/);
      assert.match(io._stdout.join(''), /-o, --opt/);
      assert.match(io._stdout.join(''), /-b, --bundle/);
      assert.match(io._stdout.join(''), /-x, --extract/);
      assert.match(io._stdout.join(''), /GENERAL/);
      assert.match(io._stdout.join(''), /BUNDLING/);
      assert.match(io._stdout.join(''), /EXTRACTION/);
    } finally {
      delete process.env.NO_COLOR;
    }
  });

  it('prints error', () => {
    const io = createMockIO();
    const ui = UI(io);
    ui.printError('bad thing');
    assert.match(io._logs.join(''), /FATAL/);
    assert.match(io._logs.join(''), /bad thing/);
  });

  it('prints usage report', () => {
    const io = createMockIO();
    const ui = UI(io);
    ui.printUsageReport(5, 'out.md');
    assert.match(io._stdout.join(''), /Success/);
    assert.match(io._stdout.join(''), /5.*files/);
    assert.match(io._stdout.join(''), /out\.md/);
  });
});
