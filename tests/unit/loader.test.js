
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ConfigLoader } from '../../src/config/loader.js';
import { createMockIO } from '../setup.js';

describe('Unit: ConfigLoader', () => {
  it('Loads and parses valid JSON', async () => {
    const io = createMockIO({
      '.catport.json': '{ "format": "xml" }'
    });
    // ConfigLoader resolves from cwd, so we must mock io.cwd if used, 
    // or rely on mock IO resolving relative paths. 
    // Implementation uses resolve(io.cwd(), ...).
    io.cwd = () => '/root';
    io._fs['/root/.catport.json'] = '{ "format": "xml" }';

    const config = await ConfigLoader.load(io);
    assert.strictEqual(config.format, 'xml');
  });

  it('Returns empty object if file missing', async () => {
    const io = createMockIO();
    io.cwd = () => '/root';
    
    const config = await ConfigLoader.load(io);
    assert.deepStrictEqual(config, {});
  });

  it('Returns empty object on invalid JSON', async () => {
    const io = createMockIO();
    io.cwd = () => '/root';
    io._fs['/root/.catport.json'] = '{ bad json }';

    const config = await ConfigLoader.load(io);
    assert.deepStrictEqual(config, {});
  });
});
