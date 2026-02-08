import { config as js } from './langs/javascript.js';
import { config as rb } from './langs/ruby.js';
import { config as py } from './langs/python.js';
import { config as c } from './langs/c_family.js';
import { config as css } from './langs/css.js';
import { config as pl } from './langs/perl.js';
import { config as php } from './langs/php.js';
import { config as sql } from './langs/sql.js';
import { config as xml } from './langs/xml.js';
import { config as html } from './langs/html.js';
import { config as yaml } from './langs/yaml.js';
import { config as go } from './langs/go.js';
import { config as rust } from './langs/rust.js';
import { config as lua } from './langs/lua.js';
import { config as clj } from './langs/clojure.js';
import { config as hs } from './langs/haskell.js';
import { config as ps } from './langs/powershell.js';
import { config as sh } from './langs/shell.js';
import { config as bat } from './langs/batch.js';
import { config as ini } from './langs/ini.js';
import { config as md } from './langs/markdown.js';

const DEFAULTS = {
  regex: false,
  cComments: false,
  doubleSlashComments: false,
  blockComments: false,
  hashComments: false,
  doubleDashComments: false,
  semicolonComments: false,
  luaBlockComments: false,
  haskellBlockComments: false,
  powershellBlockComments: false,
  script: false,
  xml: false,
  markdown: false,
  regexPrefixes: null
};

const REGISTRY = {
  js, ts: js,
  rb, c, cpp: c, py, css, pl, php, sql,
  xml, html, yaml, go, rust, lua, clj,
  hs, ps, sh, bat, ini, md,
  json: {},
  generic: { cComments: true, hashComments: true }
};

export const ALIASES = {
  jsx: 'js', mjs: 'js', cjs: 'js', tsx: 'ts',
  cc: 'cpp', cxx: 'cpp', h: 'cpp', hpp: 'cpp',
  cs: 'c', java: 'c', kt: 'c', scala: 'c', groovy: 'c', swift: 'c', dart: 'c', m: 'c', mm: 'c',
  rs: 'rust',
  scss: 'css', less: 'css', sass: 'css',
  yml: 'yaml', toml: 'ini',
  zsh: 'sh', bash: 'sh', fish: 'sh', dockerfile: 'sh', makefile: 'sh',
  cmd: 'bat',
  pm: 'pl', inc: 'php',
  pgsql: 'sql', mysql: 'sql',
  elm: 'lua', ada: 'lua', vhdl: 'lua', applescript: 'lua',
  lhs: 'hs',
  ps1: 'ps', psm1: 'ps', psd1: 'ps',
  el: 'clj', lisp: 'clj', scm: 'clj', edn: 'clj',
  conf: 'ini', properties: 'ini', env: 'ini', editorconfig: 'ini',
  svg: 'xml', vue: 'html', svelte: 'html', jsp: 'html', asp: 'html',
  markdown: 'md', mkd: 'md', mdx: 'md'
};

export const getDefinition = (ext) => {
  const normalized = (ext || '').toLowerCase();
  if (REGISTRY[normalized]) {
    return { ...DEFAULTS, ...REGISTRY[normalized] };
  }
  const alias = ALIASES[normalized];
  if (alias && REGISTRY[alias]) {
    return { ...DEFAULTS, ...REGISTRY[alias] };
  }
  return { ...DEFAULTS, ...REGISTRY.generic };
};
