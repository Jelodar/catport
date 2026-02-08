import { basename, resolve, dirname } from 'node:path';
import { Logger as DefaultLoggerFactory } from '../utils/logger.js';
import { Scanner as DefaultScanner } from './scanner.js';
import { Analyzer as DefaultAnalyzer } from './analyzer.js';
import { Processor as DefaultProcessor } from './processor.js';
import { Formatter as DefaultFormatter } from '../formatters/index.js';
import { Optimizer as DefaultOptimizer } from '../optimizers/index.js';
import { Path } from '../utils/path.js';
import { FORMAT, LOG } from '../config/constants.js';

export const Bundler = {
  async run(config, io, services = {}) {
    const {
      scanner = DefaultScanner,
      analyzer = DefaultAnalyzer,
      processor = DefaultProcessor,
      formatter = DefaultFormatter,
      optimizer = DefaultOptimizer,
      logger = null
    } = services;

    const log = logger || DefaultLoggerFactory(config.logLevel || LOG.WARN, io);
    const fmt = formatter.get(config.format);

    const priorityRules = (config.priorityRules || []).map(r => ({
      regex: Path.toRegex(r.pattern)?.regex,
      score: r.score
    })).filter(r => r.regex);

    const candidates = [];
    const structure = [];

    for await (const item of scanner.scan(config, io)) {
      if (item.isDir) {
        if (config.listDirs) {
          structure.push(`${item.rel}/`);
        }
      } else {
        item.priority = analyzer.getPriority(item.rel, priorityRules);
        candidates.push(item);
        structure.push(item.rel);
      }
    }

    if (candidates.length === 0 && structure.length === 0) {
      log.warn('No files matched.');
      return { files: 0, tokens: 0 };
    }

    candidates.sort((a, b) => {
      const pDiff = b.priority - a.priority;
      if (pDiff !== 0) {
        return pDiff;
      }
      return a.rel.localeCompare(b.rel);
    });

    const BATCH_SIZE = config.concurrency || 32;
    const hasBudget = config.budget > 0;

    const processBatchItem = async (item) => {
      const result = await processor.run(item, config, io, { analyzer, optimizer });
      if (result.error) {
        log.warn(`Failed to read ${item.rel}: ${result.error.message}`);
        return null;
      }
      return result;
    };

    const rootName = config.paths?.[0] ? basename(resolve(config.paths[0])) : 'project';

    if (config.output) {
      const outDir = dirname(resolve(config.output));
      await io.mkdir(outDir);
    }

    const outStream = config.output ? io.createWriteStream(config.output) : {
      write: io.writeStdout,
      end: () => {}
    };

    let instructionText = '';
    if (config.instruct) {
      const replyFmt = formatter.get(config.replyFormat || config.format);
      if (replyFmt.getInstruction) {
        instructionText = replyFmt.getInstruction();
      }
    }

    const head = fmt.header({
      name: rootName,
      tree: config.structure ? structure.join('\n') : null,
      context: config.context,
      task: config.task
    });

    const foot = fmt.footer({
      task: config.task,
      instructionText
    });

    let usedTokens = analyzer.countTokens(head + foot, config.charsPerToken);
    if (hasBudget && usedTokens >= config.budget) {
      log.warn(`Budget exceeded by directory tree and metadata alone (${usedTokens} > ${config.budget}). Outputting skeleton only.`);
    }

    if ((hasBudget && usedTokens >= config.budget) || config.skeleton) {
      const skeletonHead = fmt.header({
        name: rootName,
        tree: structure.join('\n'),
        context: config.context,
        task: config.task
      });
      outStream.write(skeletonHead);
      outStream.write(foot);
      if (config.output) {
        outStream.end();
      }
      return { files: 0, tokens: usedTokens };
    }

    outStream.write(head);

    const isJson = config.format === FORMAT.JSON;
    let writtenCount = 0;

    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      if (hasBudget && usedTokens >= config.budget) {
        break;
      }

      const batch = candidates.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(processBatchItem));

      for (const res of results) {
        if (!res) {
          continue;
        }

        const formatted = fmt.file(res, config);
        const prefix = (isJson && writtenCount > 0) ? ',\n' : '';
        const fullBlock = prefix + formatted;
        
        const blockTokens = analyzer.countTokens(fullBlock, config.charsPerToken);

        if (hasBudget && (usedTokens + blockTokens > config.budget)) {
          log.debug(`Skipping ${res.rel} (budget exceeded)`);
          continue;
        }

        usedTokens += blockTokens;
        outStream.write(fullBlock);
        writtenCount++;
      }
    }

    outStream.write(foot);

    if (config.output) {
      outStream.end();
    }

    return { files: writtenCount, tokens: usedTokens };
  }
};
