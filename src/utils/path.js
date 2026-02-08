import { normalize } from 'node:path';

export const Path = {
  clean: (str) => {
    return str
      .replace(/^[#*>\s]+/, '')
      .replace(/^(File|Path):\s*/i, '')
      .replace(/[*`"':]+$/g, '')
      .replace(/^[*`"']+|[*`"']+$/g, '')
      .trim();
  },

  sanitize: (path) => {
    const p = normalize(path).replace(/\0/g, '');
    return p.replace(/^['"`]+|['"`]+$/g, '');
  },

  toRegex: (glob) => {
    let p = glob.trim();
    if (!p || p.startsWith('#')) {
      return null;
    }

    const isNegated = p.startsWith('!');
    if (isNegated) {
      p = p.slice(1);
    }

    p = p.replace(/\\/g, '/').replace(/\/$/, '');

    const hasSlash = p.includes('/');
    const isAbsolute = p.startsWith('/');

    const markers = {
      DBL: '___DBL_STAR___',
      STAR: '___STAR___',
      QUES: '___QUES___'
    };

    p = p.replace(/\*\*/g, markers.DBL)
      .replace(/\*/g, markers.STAR)
      .replace(/\?/g, markers.QUES);

    p = p.replace(/[.+^${}()|[\]\\]/g, '\\$&');

    p = p.replace(new RegExp(markers.DBL, 'g'), '.*')
      .replace(new RegExp(markers.STAR, 'g'), '[^/]*')
      .replace(new RegExp(markers.QUES, 'g'), '[^/]');

    const src = hasSlash ?
      `^${isAbsolute ? p.slice(1) : p}` :
      `(?:^|/)${p}`;

    return {
      regex: new RegExp(src + '(?:/|$)'),
      isNegated
    };
  }
};
