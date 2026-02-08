

import { relative } from 'node:path';
import { Path } from '../utils/path.js';

const createMatcher = (existingRules, newPatterns) => {
  const newRules = newPatterns.map(Path.toRegex).filter(Boolean);
  const rules = existingRules ? existingRules.concat(newRules) : newRules;

  return {
    test: (rel) => {
      let ignored = false;
      for (const { regex, isNegated } of rules) {
        if (regex.test(rel)) {
          ignored = !isNegated;
        }
      }
      return ignored;
    },
    
    extend: (morePatterns) => {
      return createMatcher(rules, morePatterns);
    }
  };
};

export const Ignore = {
  parse: (content, dir, root) => {
    if (!content) {
      return [];
    }
    
    const lines = content.split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#'));

    return lines.map(l => {
      let p = l;
      const isNeg = p.startsWith('!');
      if (isNeg) {
        p = p.slice(1);
      }

      // Standard git behavior: "foo/bar" is anchored to dir, "foo" is recursive.
      // "foo/" is recursive directory.
      // Only anchor if it starts with slash OR has a slash in the middle
      const hasInternalSlash = p.slice(0, -1).includes('/');
      
      if (p.startsWith('/') || hasInternalSlash) {
        const relDir = relative(root, dir).replace(/\\/g, '/');
        if (relDir) {
          const cleanP = p.startsWith('/') ? p : '/' + p;
          p = `/${relDir}${cleanP}`;
        } else if (!p.startsWith('/')) {
          p = '/' + p;
        }
      }
      return isNeg ? '!' + p : p;
    });
  },

  create: (patterns) => {
    return createMatcher([], patterns);
  }
};
