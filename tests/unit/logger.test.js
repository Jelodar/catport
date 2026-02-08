import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Logger } from '../../src/utils/logger.js';
import { LOG } from '../../src/config/constants.js';
import { createMockIO } from '../setup.js';

describe('Unit: Logger', () => {
  it('Filters logs based on level', () => {
    const io = createMockIO();
    const log = Logger(LOG.WARN, io);

    log.error('err');
    log.warn('wrn');
    log.info('inf');

    const output = io._logs.join('\n');
    assert.match(output, /ERR/);
    assert.match(output, /WRN/);
    assert.doesNotMatch(output, /INF/);
  });
});
