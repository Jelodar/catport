import { resolve, join, dirname, relative, isAbsolute } from 'node:path';
import { Path } from '../utils/path.js';
import { Logger as DefaultLoggerFactory } from '../utils/logger.js';
import { Formatter as DefaultFormatter } from '../formatters/index.js';
import { LOG } from '../config/constants.js';

export const Extractor = {
  async run(config, io, services = {}) {
    const {
      formatter = DefaultFormatter,
      logger = null
    } = services;

    if (config.safeMode === undefined) {
      config.safeMode = true;
    }

    const log = logger || DefaultLoggerFactory(config.logLevel || LOG.WARN, io);
    let content = '';

    if (config.paths && config.paths.length > 0) {
      content = await io.readText(config.paths[0]);
    } else {
      log.info('Reading stdin...');
      for await (const chunk of io.readStdin()) {
        content += chunk;
      }
    }

    if (!content.trim()) {
      throw new Error('Empty input');
    }

    const fmt = formatter.detect(content);
    const files = fmt.parse(content, log);

    if (files.length === 0) {
      log.warn('No files found.');
      return;
    }

    const outDir = resolve(config.extractDir || '.');
    if (config.extractDir) {
      await io.mkdir(outDir);
    }

    log.info(`Extracting ${files.length} files to ${outDir}`);

    let count = 0;
    for (const f of files) {
      const safeRel = Path.sanitize(f.path);

      if (config.safeMode) {
        if (isAbsolute(safeRel) || safeRel.includes('../') || safeRel.startsWith('..')) {
          log.warn(`[SECURITY] Skipping traversal attempt: ${f.path}`);
          continue;
        }

        const abs = join(outDir, safeRel);
        const resolved = resolve(abs);
        const rel = relative(outDir, resolved);

        if (isAbsolute(rel) || rel.startsWith('..')) {
          log.warn(`[SECURITY] Skipping traversal attempt: ${f.path}`);
          continue;
        }
      }

      const abs = join(outDir, safeRel);
      await io.mkdir(dirname(abs));
      await io.writeFile(abs, f.content);
      count++;
    }
    log.info(`Extracted ${count} files.`);
  }
};
