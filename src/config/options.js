export const OPTIONS = {
  help: {
    short: 'h',
    type: 'boolean',
    desc: 'Display this help message and exit.',
    category: 'General'
  },
  version: {
    short: 'V',
    type: 'boolean',
    desc: 'Display version information and exit.',
    category: 'General'
  },
  verbose: {
    short: 'v',
    type: 'boolean',
    desc: 'Enable verbose logging to stderr.',
    category: 'General'
  },
  output: {
    short: 'o',
    type: 'string',
    desc: 'Write output to <FILE> instead of stdout.',
    metavar: 'FILE',
    category: 'General'
  },
  format: {
    short: 'f',
    type: 'string',
    desc: 'Output format: "md", "xml", "json", "yaml", or "multipart".',
    default: 'md',
    metavar: 'FMT',
    category: 'Bundling'
  },
  replyFormat: {
    short: 'R',
    type: 'string',
    desc: 'Instruct LLM to reply in this format (default: same as output).',
    metavar: 'FMT',
    category: 'Bundling'
  },
  context: {
    short: 'C',
    type: 'string',
    desc: 'Prepend a custom context block to the header.',
    metavar: 'TEXT',
    category: 'Bundling'
  },
  task: {
    short: 'T',
    type: 'string',
    desc: 'Append a specific task instruction to the footer.',
    metavar: 'TEXT',
    category: 'Bundling'
  },
  noInstruct: {
    short: 'I',
    type: 'boolean',
    desc: 'Disable automatic "how to use" instructions.',
    category: 'Bundling'
  },
  noStructure: {
    short: 'n',
    type: 'boolean',
    desc: 'Disable directory structure generation.',
    category: 'Bundling'
  },
  listDirs: {
    short: 'l',
    type: 'boolean',
    desc: 'Include directories in the structure listing.',
    category: 'Bundling'
  },
  skeleton: {
    short: 'k',
    type: 'boolean',
    desc: 'Output directory structure only, omitting content.',
    category: 'Bundling'
  },
  extensions: {
    short: 'e',
    type: 'string',
    desc: 'Filter by comma-separated extensions (e.g. "js,ts").',
    metavar: 'LIST',
    category: 'Bundling'
  },
  ignore: {
    short: 'i',
    type: 'array',
    desc: 'Add a glob pattern to the ignore list.',
    metavar: 'GLOB',
    category: 'Bundling'
  },
  noIgnore: {
    short: 'u',
    type: 'boolean',
    desc: 'Unrestricted mode. Ignore .gitignore and defaults.',
    category: 'Bundling'
  },
  gitDiff: {
    short: 'g',
    type: 'string',
    desc: 'Bundle only files changed relative to <REF>.',
    metavar: 'REF',
    category: 'Bundling',
    optional: true
  },
  budget: {
    short: 'b',
    type: 'number',
    desc: 'Stop processing after <INT> tokens.',
    metavar: 'INT',
    category: 'Bundling'
  },
  priority: {
    short: 'p',
    type: 'array',
    desc: 'Set priority rules (e.g. "README.md:100").',
    metavar: 'RULE',
    category: 'Bundling'
  },
  optimize: {
    short: 'O',
    type: 'string',
    desc: 'Mode ("whitespace", "comments", "minify") OR shell command like ("terser" or "wc -l {}").',
    default: 'none',
    metavar: 'MODE|CMD',
    category: 'Bundling'
  },
  maxSize: {
    short: 'S',
    type: 'string',
    desc: 'Max file size to process (e.g. "1MB", "500KB").',
    default: '10MB',
    metavar: 'SIZE',
    category: 'Bundling'
  },
  charsPerToken: {
    short: 'c',
    type: 'number',
    desc: 'Ratio for token estimation (default: 4.2).',
    default: 4.2,
    metavar: 'NUM',
    category: 'Bundling'
  },
  concurrency: {
    short: 'P',
    type: 'number',
    desc: 'Maximum concurrent file reads.',
    default: 32,
    metavar: 'INT',
    category: 'Bundling'
  },
  xmlMode: {
    short: 'X',
    type: 'string',
    desc: 'XML strategy: "auto", "cdata", or "escape".',
    metavar: 'MODE',
    category: 'Bundling'
  },
  extract: {
    short: 'x',
    type: 'boolean',
    desc: 'Switch to extraction mode.',
    category: 'Extraction'
  },
  extractDir: {
    short: 'd',
    type: 'string',
    desc: 'Target directory for extracted files.',
    default: '.',
    metavar: 'DIR',
    category: 'Extraction'
  },
  unsafe: {
    short: 'U',
    type: 'boolean',
    desc: 'Disable path traversal protection.',
    category: 'Extraction'
  }
};
