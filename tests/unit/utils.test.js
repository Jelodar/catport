import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Path } from '../../src/utils/path.js';
import { Style } from '../../src/utils/style.js';

describe('Unit: Utils', () => {
  it('Path.toRegex matches basic glob', () => {
    const { regex } = Path.toRegex('foo.js');
    assert.match('foo.js', regex);
    assert.doesNotMatch('bar.js', regex);
  });

  it('Path.toRegex matches directory glob', () => {
    const { regex } = Path.toRegex('src/');
    assert.match('src/file.js', regex);
    assert.doesNotMatch('test/file.js', regex);
  });

  it('Path.toRegex handles negation', () => {
    const { isNegated } = Path.toRegex('!*.log');
    assert.strictEqual(isNegated, true);
  });

  it('Path.toRegex returns null for comments', () => {
    assert.strictEqual(Path.toRegex('# comment'), null);
  });

  it('Path.clean removes markdown artifacts', () => {
    assert.strictEqual(Path.clean('`src/main.js`'), 'src/main.js');
  });

  it('Path.sanitize removes quotes and null bytes', () => {
    assert.strictEqual(Path.sanitize('"path/to/file"'), 'path/to/file');
    assert.strictEqual(Path.sanitize('path/to/file\0'), 'path/to/file');
  });

  it('Style colors text', () => {
    // Force colors to ensure regex matches ANSI codes even in non-TTY test runners
    const oldNoColor = process.env.NO_COLOR;
    const oldForceColor = process.env.FORCE_COLOR;
    delete process.env.NO_COLOR;
    process.env.FORCE_COLOR = '1';
    try {
      // eslint-disable-next-line no-control-regex
      assert.match(Style.bold('test'), /\x1b\[1mtest\x1b\[22m/);
      // eslint-disable-next-line no-control-regex
      assert.match(Style.red('test'), /\x1b\[31mtest\x1b\[39m/);

      const nested = Style.red(`A ${Style.bold('B')} C`);
      // eslint-disable-next-line no-control-regex
      assert.match(nested, /\x1b\[31mA \x1b\[1mB\x1b\[22m C\x1b\[39m/);
    } finally {
      if (oldNoColor !== undefined) {
        process.env.NO_COLOR = oldNoColor;
      }
      if (oldForceColor !== undefined) {
        process.env.FORCE_COLOR = oldForceColor;
      } else {
        delete process.env.FORCE_COLOR;
      }
    }
  });
});
