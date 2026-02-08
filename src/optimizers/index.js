import { OPTIMIZE } from '../config/constants.js';
import { Tokenizer } from './tokenizer.js';
import { getDefinition } from './definitions.js';

const LANGUAGE_REGISTRY = {};

const cleanWhitespace = (content) => {
  if (!content) {
    return '';
  }
  return content
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(l => l.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '');
};

const defaultOptimizer = (content, ext, preserveWS = false) => {
  const e = (ext || '').toLowerCase();
  const config = getDefinition(e);
  
  const effectiveConfig = { ...config, preserveWhitespace: preserveWS };

  if (effectiveConfig.markdown) {
    let res = content.replace(/<!--[\s\S]*?-->/g, '');
    if (!preserveWS) {
      res = res.replace(/\n{3,}/g, '\n\n');
      return res.trim();
    }
    return res;
  }

  if (effectiveConfig.xml) {
    if (preserveWS) {
      return content.replace(/<!--[\s\S]*?-->/g, '');
    }
    return content
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/>\s+</g, '> <')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  return Tokenizer.optimize(content, effectiveConfig);
};

LANGUAGE_REGISTRY['json'] = (c) => {
  try {
    return JSON.stringify(JSON.parse(c));
  } catch {
    return Tokenizer.optimize(c, { 
      regex: false, 
      cComments: true, 
      hashComments: true 
    });
  }
};

const STRATEGIES = {
  [OPTIMIZE.NONE]: (c) => c || '',
  [OPTIMIZE.WHITESPACE]: (c) => cleanWhitespace(c),
  [OPTIMIZE.COMMENTS]: (c, ext) => {
    const noComments = defaultOptimizer(c, ext, true);
    return cleanWhitespace(noComments);
  },
  [OPTIMIZE.MINIFY]: (c, ext) => {
    const e = (ext || '').toLowerCase();
    const handler = LANGUAGE_REGISTRY[e];
    if (handler) {
      return handler(c);
    }
    return defaultOptimizer(c, e, false);
  }
};

export const Optimizer = {
  registerLanguage: (ext, handler) => {
    LANGUAGE_REGISTRY[ext.toLowerCase()] = handler;
  },
  run: (content, ext, mode = OPTIMIZE.NONE) => {
    if (!content) {
      return '';
    }
    
    let key = mode;
    if (typeof key === 'string') {
      key = key.toLowerCase();
    }

    const strategy = STRATEGIES[key] || STRATEGIES[OPTIMIZE.NONE];
    return strategy(content, ext);
  }
};
