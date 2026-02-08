import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Bundler } from '../../src/core/bundler.js';
import { createMockIO } from '../setup.js';
import { FILE_MARKER } from '../../src/formatters/markdown.js';

describe('Integration: Structure & Listing Options', () => {
  const fs = {
    'src/main.js': 'code',
    'src/utils/helper.js': 'code',
    'test/unit/a.test.js': 'code',
    'readme.md': 'docs'
  };

  const DEFAULTS = {
    structure: true,
    listDirs: false,
    format: 'md'
  };

  const run = async (opts) => {
    const io = createMockIO(fs);
    const config = { paths: ['.'], ...DEFAULTS, ...opts };
    await Bundler.run(config, io);
    return io._stdout.join('');
  };

  it('Default: Structure ON, Dirs OFF', async () => {
    const out = await run({});
    // Should have structure section
    assert.ok(out.includes('## Structure'));
    // Should list files
    assert.ok(out.includes('src/main.js'));
    assert.ok(out.includes('readme.md'));
    // Should NOT list directories ending in /
    assert.ok(!out.match(/src\/\n/));
    assert.ok(!out.match(/test\/\n/));
  });

  it('No Structure (-n): Structure Header Absent', async () => {
    const out = await run({ noStructure: true, structure: false }); // normalize sets structure=false if noStructure=true
    assert.ok(!out.includes('## Structure'));
    // Files should still be present in content
    assert.ok(out.includes(`${FILE_MARKER} src/main.js`));
  });

  it('List Dirs (-l): Structure ON, Dirs ON', async () => {
    const out = await run({ listDirs: true });
    assert.ok(out.includes('## Structure'));
    // Files present
    assert.ok(out.includes('src/main.js'));
    // Dirs present
    assert.ok(out.includes('src/'));
    assert.ok(out.includes('src/utils/'));
    assert.ok(out.includes('test/unit/'));
  });

  it('No Structure overrides List Dirs (-n -l)', async () => {
    const out = await run({ structure: false, listDirs: true });
    // Structure header should be missing entirely, despite listDirs=true
    assert.ok(!out.includes('## Structure'));
    // And obviously no directory tree printed
    assert.ok(!out.match(/src\/\n/));
  });

  it('JSON format respects noStructure', async () => {
    // With structure: true
    let io = createMockIO(fs);
    await Bundler.run({ paths: ['.'], format: 'json', structure: true }, io);
    let json = JSON.parse(io._stdout.join(''));
    assert.ok(json.meta.tree, 'JSON should contain tree by default');

    // With structure: false
    io = createMockIO(fs);
    await Bundler.run({ paths: ['.'], format: 'json', structure: false }, io);
    json = JSON.parse(io._stdout.join(''));
    assert.strictEqual(json.meta.tree, undefined, 'JSON should not contain tree when disabled');
  });

  it('XML format respects noStructure', async () => {
    const io = createMockIO(fs);
    await Bundler.run({ paths: ['.'], format: 'xml', structure: false }, io);
    const xml = io._stdout.join('');
    assert.ok(!xml.includes('<structure>'));
  });

  it('YAML format respects listDirs', async () => {
    const io = createMockIO(fs);
    await Bundler.run({ paths: ['.'], format: 'yaml', listDirs: true, structure: true }, io);
    const yaml = io._stdout.join('');
    assert.ok(yaml.includes('tree: |'));
    assert.ok(yaml.includes('src/')); // Directory listed in tree block
  });

  it('Skeleton mode with structure options', async () => {
    // Skeleton mode forces structure output regardless of structure option
    const io = createMockIO(fs);
    await Bundler.run({ paths: ['.'], skeleton: true, structure: false }, io);
    const out = io._stdout.join('');

    assert.ok(out.includes('## Structure')); // Skeleton mode includes structure
    assert.ok(!out.includes(FILE_MARKER)); // No content
    assert.ok(out.match(/^# /m)); // Header still present
  });
});
