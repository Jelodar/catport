



import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ArgParser } from '../../src/cli/args.js';
import { OPTIMIZE } from '../../src/config/constants.js';

describe('Unit: CLI Args', () => {
  const parseArgs = (args) => ArgParser.process(args);

  it('Parses whitespace minification', () => {
    const cfg = parseArgs(['n', 'b', '--optimize', 'whitespace']);
    assert.strictEqual(cfg.optimize, OPTIMIZE.WHITESPACE);
    assert.strictEqual(cfg.optimizeCmd, undefined);
  });

  it('Parses minify via short flag', () => {
    const cfg = parseArgs(['n', 'b', '-O', 'minify']);
    assert.strictEqual(cfg.optimize, OPTIMIZE.MINIFY);
  });

  it('Parses custom command via optimize flag', () => {
    const cfg = parseArgs(['n', 'b', '-O', 'terser --compress']);
    // optimize should remain default (NONE) or be the custom command depending on impl,
    // but optimizeCmd must be set.
    assert.strictEqual(cfg.optimizeCmd, 'terser --compress');
  });

  it('Handles boolean grouping', () => {
    // -x (extract), -v (verbose), -u (noIgnore)
    const cfg = parseArgs(['n', 'b', '-xvu']);
    assert.strictEqual(cfg.extract, true);
    assert.strictEqual(cfg.verbose, true);
    assert.strictEqual(cfg.noIgnore, true);
  });

  it('Handles equals assignment', () => {
    const cfg = parseArgs(['n', 'b', '--format=json']);
    assert.strictEqual(cfg.format, 'json');
  });

  it('Handles negative numbers as values', () => {
    const cfg = parseArgs(['n', 'b', '--priority', 'src:-10']);
    assert.deepStrictEqual(cfg.priorityRules, [{ pattern: 'src', score: -10 }]);
  });

  it('Handles stdin alias', () => {
    const cfg = parseArgs(['n', 'b', '-']);
    assert.ok(cfg.paths.includes('-'));
  });

  it('Parses extensions list', () => {
    const cfg = parseArgs(['n', 'b', '-e', 'js,ts,.json']);
    assert.ok(cfg.extSet.has('js'));
    assert.ok(cfg.extSet.has('ts'));
    assert.ok(cfg.extSet.has('json'));
    assert.ok(!cfg.extSet.has('md'));
  });

  it('Handles array flags (multiple ignores)', () => {
    // Use -u to disable default ignores so we can check specific length
    const cfg = parseArgs(['n', 'b', '-u', '-i', '*.log', '--ignore', 'dist/']);
    assert.strictEqual(cfg.ignore.length, 2);
    assert.ok(cfg.ignore.includes('*.log'));
    assert.ok(cfg.ignore.includes('dist/'));
  });

  it('Parses git-diff with explicit ref', () => {
    const cfg = parseArgs(['n', 'b', '-g', 'main']);
    assert.strictEqual(cfg.gitDiff, 'main');
  });

  it('Parses git-diff flag without value (next is flag)', () => {
    const cfg = parseArgs(['n', 'b', '-g', '-v']);
    assert.strictEqual(cfg.gitDiff, 'HEAD');
    assert.strictEqual(cfg.verbose, true);
  });

  it('Parses maxSize argument', () => {
    let cfg = parseArgs(['n', 'b', '--max-size', '512']);
    assert.strictEqual(cfg.maxSize, 512);

    cfg = parseArgs(['n', 'b', '-S', '1kb']);
    assert.strictEqual(cfg.maxSize, 1024);

    cfg = parseArgs(['n', 'b', '-S', '10MB']);
    assert.strictEqual(cfg.maxSize, 10 * 1024 * 1024);
    
    cfg = parseArgs(['n', 'b', '-S', '1.5GB']);
    assert.strictEqual(cfg.maxSize, Math.floor(1.5 * 1024 * 1024 * 1024));
  });

  it('Throws on unknown flag', () => {
    assert.throws(() => parseArgs(['n', 'b', '--unknown']), /Unknown argument/);
  });

  it('Throws on missing value', () => {
    assert.throws(() => parseArgs(['n', 'b', '--output']), /requires a value/);
  });

  it('Throws on boolean with value', () => {
    assert.throws(() => parseArgs(['n', 'b', '--verbose=true']), /Boolean flag verbose does not accept a value/);
  });
  
  it('Processes file config overrides', () => {
    const cfg = ArgParser.process(['n', 'b'], { format: 'yaml' });
    assert.strictEqual(cfg.format, 'yaml');
  });

  it('CLI args override file config', () => {
    const cfg = ArgParser.process(['n', 'b', '--format=json'], { format: 'yaml' });
    assert.strictEqual(cfg.format, 'json');
  });

  it('Handles unsafe and noInstruct flags', () => {
    const cfg = parseArgs(['n', 'b', '--unsafe', '--no-instruct']);
    assert.strictEqual(cfg.safeMode, false);
    assert.strictEqual(cfg.instruct, false);
  });

  it('Handles noStructure and listDirs flags', () => {
    let cfg = parseArgs(['n', 'b', '-n']);
    assert.strictEqual(cfg.structure, false);

    cfg = parseArgs(['n', 'b', '--no-structure']);
    assert.strictEqual(cfg.structure, false);

    cfg = parseArgs(['n', 'b', '-l']);
    assert.strictEqual(cfg.listDirs, true);

    cfg = parseArgs(['n', 'b', '--list-dirs']);
    assert.strictEqual(cfg.listDirs, true);

    cfg = parseArgs(['n', 'b', '-nl']); // Grouped
    assert.strictEqual(cfg.structure, false);
    assert.strictEqual(cfg.listDirs, true);
  });
});
