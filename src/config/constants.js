import { DEFAULT_IGNORES } from './ignores.js';

export const APP = {
  NAME: 'catport',
  VERSION: '1.0.1',
  DESC: 'Deterministic filesystem serializer for LLM contexts'
};

export const EXIT = {
  SUCCESS: 0,
  ERROR: 1
};

export const LOG = {
  SILENT: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4
};

export const FORMAT = {
  MD: 'md',
  XML: 'xml',
  JSON: 'json',
  YAML: 'yaml',
  MULTIPART: 'multipart'
};

export const XML_MODE = {
  AUTO: 'auto',
  CDATA: 'cdata',
  ESCAPE: 'escape'
};

export const OPTIMIZE = {
  NONE: 'none',
  WHITESPACE: 'whitespace',
  COMMENTS: 'comments',
  MINIFY: 'minify'
};

export const XML_TAGS = {
  CDATA_OPEN: '<![' + 'CDATA[',
  CDATA_CLOSE: ']]' + '>'
};

export const DEFAULTS = {
  BUDGET: 0,
  CHARS_PER_TOKEN: 4.2,
  PRIORITY: 1,
  EXTRACT_DIR: '.',
  FORMAT: FORMAT.MD,
  INSTRUCT: true,
  STRUCTURE: true,
  LIST_DIRS: false,
  SAFE_MODE: true,
  OPTIMIZE: OPTIMIZE.NONE,
  CONCURRENCY: 32,
  MAX_SIZE: 10 * 1024 * 1024,
  IGNORE: DEFAULT_IGNORES
};
