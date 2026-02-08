import { ArgParser } from './args.js';
import { UI } from './ui.js';
import { Bundler } from '../core/bundler.js';
import { Extractor } from '../core/extractor.js';
import { NodeIO } from '../utils/io.js';
import { Git } from '../utils/git.js';
import { Logger } from '../utils/logger.js';
import { Style } from '../utils/style.js';
import { EXIT, APP } from '../config/constants.js';
import { OPTIONS } from '../config/options.js';
import { Optimizer } from '../optimizers/index.js';
import { Formatter } from '../formatters/index.js';
import { Scanner } from '../core/scanner.js';
import { Analyzer } from '../core/analyzer.js';
import { Processor } from '../core/processor.js';
import { ConfigLoader } from '../config/loader.js';

export const CLI = {
  async run(argv, io = NodeIO) {
    const ui = UI(io);
    try {
      const fileConfig = await ConfigLoader.load(io);
      const config = ArgParser.process(argv, fileConfig);

      if (config.help) {
        ui.printHeader(APP);
        ui.printHelp(APP, OPTIONS);
        return;
      }

      if (config.version) {
        io.writeStdout(`${APP.NAME} v${APP.VERSION}\n`);
        return;
      }

      const logger = Logger(config.logLevel, io);

      if (config.extract) {
        await Extractor.run(config, io, { 
          formatter: Formatter,
          logger: logger 
        });
      } else {
        if (config.gitDiff) {
          const changes = await Git.getChangedFiles(io, config.gitDiff, io.cwd());
          if (!changes) {
            ui.printError('Not a git repository or git command failed.');
            io.exit(EXIT.ERROR);
            return;
          }
          
          if (changes.size === 0) {
            ui.printError('No changes detected.');
            io.exit(EXIT.SUCCESS);
            return;
          }

          ui.printInfo(`Found ${Style.bold(changes.size)} files changed in git (${Style.cyan(config.gitDiff)})`);
          config.gitFiles = changes;
        }

        if (config.optimize !== 'none') {
          ui.printInfo(`Optimizing (${Style.cyan(config.optimize === 'minify' ? 'language-aware' : config.optimize)})...`);
        }

        const stats = await Bundler.run(config, io, {
          scanner: Scanner,
          analyzer: Analyzer,
          processor: Processor,
          optimizer: Optimizer,
          formatter: Formatter,
          logger: logger
        });
        
        if (config.output && stats) {
          ui.printUsageReport(stats, config.output);
        }
      }
    } catch (e) {
      ui.printError(e.message);
      io.exit(EXIT.ERROR);
    }
  }
};
