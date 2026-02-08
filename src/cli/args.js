import { DEFAULTS, LOG, OPTIMIZE } from '../config/constants.js';
import { OPTIONS } from '../config/options.js';
import { Parser } from './parser.js';

const parseSize = (input) => {
  if (typeof input === 'number') {
    return input;
  }
  if (!input) {
    return 0;
  }

  const s = String(input).trim();
  const match = s.match(/^(\d+(?:\.\d+)?)\s*([kmg]b?)?$/i);
  
  if (!match) {
    return parseInt(s, 10) || 0;
  }
  
  const val = parseFloat(match[1]);
  const suffix = (match[2] || '').toLowerCase();
  
  if (suffix.startsWith('k')) {
    return Math.floor(val * 1024);
  }
  if (suffix.startsWith('m')) {
    return Math.floor(val * 1024 * 1024);
  }
  if (suffix.startsWith('g')) {
    return Math.floor(val * 1024 * 1024 * 1024);
  }
  
  return Math.floor(val);
};

const normalize = (config) => {
  if (config.verbose) {
    config.logLevel = LOG.INFO;
  }

  if (config.optimize !== undefined) {
    const val = String(config.optimize).trim();
    const lowerVal = val.toLowerCase();
    const validModes = new Set(Object.values(OPTIMIZE));

    if (validModes.has(lowerVal)) {
      config.optimize = lowerVal;
    } else {
      config.optimizeCmd = val;
    }
  }

  if (config.noInstruct) {
    config.instruct = false;
  }

  if (config.noStructure) {
    config.structure = false;
  }

  if (config.unsafe) {
    config.safeMode = false;
  }

  if (config.extensions) {
    config.extSet = new Set(
      config.extensions.split(',').map(e => e.trim().replace(/^\./, '').toLowerCase())
    );
  }

  // Merge Ignore Patterns
  const baseIgnore = config.noIgnore ? [] : DEFAULTS.IGNORE;
  const userIgnore = config.ignore || [];
  config.ignore = [...baseIgnore, ...userIgnore];

  if (config.priority) {
    config.priorityRules = config.priority.map(p => {
      if (typeof p === 'object') {
        return p;
      }
      const idx = p.lastIndexOf(':');
      if (idx > 0) {
        const score = parseInt(p.slice(idx + 1), 10);
        if (!Number.isNaN(score)) {
          return {
            pattern: p.slice(0, idx),
            score
          };
        }
      }
      return null;
    }).filter(Boolean);
  }

  if (config.gitDiff === true) {
    config.gitDiff = 'HEAD';
  }

  if (config.maxSize !== undefined) {
    config.maxSize = parseSize(config.maxSize);
  }

  return config;
};

export const ArgParser = {
  process(argv, fileConfig = {}, schema = OPTIONS) {
    const defaults = Parser.getDefaults(schema);
    const explicit = Parser.parse(argv, schema);

    const rawConfig = {
      logLevel: LOG.WARN,
      instruct: DEFAULTS.INSTRUCT,
      structure: DEFAULTS.STRUCTURE,
      listDirs: DEFAULTS.LIST_DIRS,
      optimize: DEFAULTS.OPTIMIZE,
      safeMode: DEFAULTS.SAFE_MODE,
      charsPerToken: DEFAULTS.CHARS_PER_TOKEN,
      maxSize: DEFAULTS.MAX_SIZE,
      ...defaults,
      ...fileConfig
    };

    Object.keys(explicit).forEach(k => {
      if (k === 'paths' && explicit.paths.length === 0) {
        return;
      }
      rawConfig[k] = explicit[k];
    });

    return normalize(rawConfig);
  }
};
