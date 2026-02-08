const C = {
  EOS: 0,
  NL: 10,
  SPACE: 32,
  DASH: 45,
  SLASH: 47,
  STAR: 42,
  HASH: 35,
  DQ: 34,
  SQ: 39,
  BT: 96,
  BS: 92,
  AT: 64,
  SEMI: 59,
  LT: 60,
  GT: 62,
  LBRACK: 91,
  RBRACK: 93,
  LBRACE: 123,
  RBRACE: 125,
  LPAREN: 40,
  RPAREN: 41,
  EQ: 61,
  EXCL: 33,
  PLUS: 43,
  DOLLAR: 36,
  COMMA: 44,
  COLON: 58,
  QUES: 63
};

const S = {
  CODE: 0,
  LINE_CMT: 1,
  BLK_CMT: 2,
  STR_DQ: 3,
  STR_SQ: 4,
  STR_BT: 5,
  REGEX: 6,
  STR_TDQ: 7,
  STR_TSQ: 8,
  BLK_LUA: 9,
  BLK_HS: 10,
  BLK_PS: 11
};

const CONTROL_FLOW = new Set(['if', 'for', 'while', 'with']);

const isAlphaNum = c => {
  return (c >= 48 && c <= 57) || 
         (c >= 65 && c <= 90) || 
         (c >= 97 && c <= 122) || 
         c === 95 || // _
         c === 36 || // $
         c === 64 || // @
         c > 127;    // Unicode
};

export const Tokenizer = {
  optimize: (src, config) => {
    const len = src.length;
    let out = '';
    let i = 0;
    let state = S.CODE;
    let lastWord = '';
    let lastSigWord = ''; // Persists across whitespace for control flow checks
    let lastTokenOp = true;
    let lineStart = true;
    let regexBracketDepth = 0;

    let braceDepth = 0;
    const templateStack = [];
    const controlFlowStack = []; // Tracks control flow contexts: if (x) /regex/
    
    const preserveWS = !!config.preserveWhitespace;
    const regexPrefixes = config.regexPrefixes || new Set();

    // Features
    const allowDoubleSlash = config.doubleSlashComments || config.cComments;
    const allowBlock = config.blockComments || config.cComments;
    const allowHash = config.hashComments;
    const allowDoubleDash = config.doubleDashComments;
    const allowSemi = config.semicolonComments;
    const allowTriple = config.tripleQuotes;
    const allowBackticks = config.backticks || config.regex;
    const allowLuaBlock = config.luaBlockComments;
    const allowHsBlock = config.haskellBlockComments;
    const allowPsBlock = config.powershellBlockComments;

    while (i < len) {
      const c = src.charCodeAt(i);
      const next = src.charCodeAt(i + 1) || C.EOS;
      const next2 = src.charCodeAt(i + 2) || C.EOS;

      if (state === S.STR_BT) {
        out += src[i];
        if (c === C.BS) {
          out += src[i + 1] || '';
          i += 2;
          continue;
        }
        if (c === C.BT) {
          state = S.CODE;
          lastTokenOp = false;
        } else if (c === C.DOLLAR && next === C.LBRACE) {
          state = S.CODE;
          templateStack.push(braceDepth);
          braceDepth++;
          out += src[i + 1];
          lastTokenOp = true;
          i += 2;
          continue;
        }
        i++;
        continue;
      }

      if (state === S.CODE) {
        if (c <= C.SPACE) {
          if (lastWord) {
            lastSigWord = lastWord;
            if (config.regex && regexPrefixes.has(lastWord)) {
              lastTokenOp = true;
            }
          }

          if (preserveWS) {
            out += src[i];
            lastWord = '';
            i++;
            continue;
          }

          if (config.script) {
            if (c === C.NL) {
              if (!out.endsWith('\n')) {
                out += '\n';
              }
              lineStart = true;
              i++;
            } else if (lineStart) {
              // Preserve indentation
              out += src[i];
              i++;
            } else {
              // Collapse internal spacing
              if (!out.endsWith(' ') && !out.endsWith('\n')) {
                out += ' ';
              }
              // Skip contiguous spaces
              let j = i + 1;
              while (j < len && src.charCodeAt(j) <= C.SPACE && src.charCodeAt(j) !== C.NL) {
                j++;
              }
              i = j;
            }
          } else {
            let j = i + 1;
            while (j < len && src.charCodeAt(j) <= C.SPACE) {
              j++;
            }

            const nextC = j < len ? src.charCodeAt(j) : 0;
            const prevC = out.length > 0 ? out.charCodeAt(out.length - 1) : 0;

            if (isAlphaNum(prevC) && isAlphaNum(nextC)) {
              out += ' ';
            }
            i = j;
          }

          lastWord = '';
          continue;
        }

        lineStart = false;

        if (allowLuaBlock && c === C.DASH && next === C.DASH && next2 === C.LBRACK && (src.charCodeAt(i + 3) || C.EOS) === C.LBRACK) {
          state = S.BLK_LUA;
          i += 4;
          continue;
        }
        if (allowDoubleDash && c === C.DASH && next === C.DASH) {
          state = S.LINE_CMT;
          i += 2;
          continue;
        }
        if (allowHsBlock && c === C.LBRACE && next === C.DASH) {
          state = S.BLK_HS;
          i += 2;
          continue;
        }
        if (allowPsBlock && c === C.LT && next === C.HASH) {
          state = S.BLK_PS;
          i += 2;
          continue;
        }
        if (allowBlock && c === C.SLASH && next === C.STAR) {
          state = S.BLK_CMT;
          i += 2;
          continue;
        }
        if (allowDoubleSlash && c === C.SLASH && next === C.SLASH) {
          state = S.LINE_CMT;
          i += 2;
          continue;
        }
        if (allowHash && c === C.HASH) {
          if (i === 0 && next === C.EXCL) {
            out += '#';
            i++;
            continue;
          }
          state = S.LINE_CMT;
          i++;
          continue;
        }
        if (allowSemi && c === C.SEMI) {
          state = S.LINE_CMT;
          i++;
          continue;
        }

        if (c === C.DQ) {
          if (allowTriple && next === C.DQ && next2 === C.DQ) {
            state = S.STR_TDQ;
            out += '"""';
            lastTokenOp = false;
            i += 3;
            continue;
          }
          state = S.STR_DQ;
          out += '"';
          lastTokenOp = false;
          i++;
          continue;
        }
        if (c === C.SQ) {
          if (allowTriple && next === C.SQ && next2 === C.SQ) {
            state = S.STR_TSQ;
            out += "'''";
            lastTokenOp = false;
            i += 3;
            continue;
          }
          state = S.STR_SQ;
          out += "'";
          lastTokenOp = false;
          i++;
          continue;
        }
        if (allowBackticks && c === C.BT) {
          state = S.STR_BT;
          out += '`';
          lastTokenOp = false;
          i++;
          continue;
        }

        if (config.regex && c === C.SLASH) {
          if (lastWord && regexPrefixes.has(lastWord)) {
            lastTokenOp = true;
          }
          
          if (lastTokenOp) {
            state = S.REGEX;
            regexBracketDepth = 0;
            if (out.endsWith('/')) {
              out += ' ';
            }
            out += '/';
            lastTokenOp = false;
            lastWord = '';
            lastSigWord = '';
            i++;
            continue;
          }
        }

        if (c === C.LBRACE) {
          braceDepth++;
          lastTokenOp = true;
        } else if (c === C.RBRACE) {
          if (templateStack.length > 0 && braceDepth - 1 === templateStack[templateStack.length - 1]) {
            templateStack.pop();
            state = S.STR_BT;
            braceDepth--; 
            out += src[i]; 
            i++;
            continue;
          }
          if (braceDepth > 0) {
            braceDepth--;
          }
          lastTokenOp = false;
        } else if (c === C.LPAREN) {
          const checkWord = lastWord || lastSigWord;
          controlFlowStack.push(CONTROL_FLOW.has(checkWord));
          lastTokenOp = true;
        } else if (c === C.RPAREN) {
          const isControl = controlFlowStack.pop();
          lastTokenOp = !!isControl;
        }

        if (isAlphaNum(c)) {
          lastWord += src[i];
          lastTokenOp = false;
        } else {
          if (lastWord) {
            lastSigWord = lastWord;
          }
          lastWord = '';

          if (c !== C.LBRACE && c !== C.RBRACE && c !== C.LPAREN && c !== C.RPAREN) {
            lastTokenOp = (
              c === C.LBRACK ||
              c === C.EQ || c === C.COMMA || c === C.COLON ||
              c === C.QUES || c === C.EXCL || c === C.SEMI ||
              c === 124 || c === 38 || c === 94 || // | & ^
              c === C.PLUS || c === C.DASH || c === C.STAR ||
              c === 37 || c === 126 || c === C.LT ||
              c === C.GT || c === C.SLASH
            );
          }

          if (out.length > 0) {
            const lastChar = out.charCodeAt(out.length - 1);
            if (
              (c === C.PLUS && lastChar === C.PLUS) || 
              (c === C.DASH && lastChar === C.DASH) ||
              (c === C.SLASH && lastChar === C.SLASH) 
            ) {
              out += ' ';
            }
          }
        }

        out += src[i];
        i++;
        continue;
      }

      if (state === S.LINE_CMT) {
        if (c === C.NL) {
          state = S.CODE;
          lineStart = true;
          if (config.script || preserveWS) {
            if (config.script) {
              if (!out.endsWith('\n')) {
                out += '\n';
              }
            } else {
              out += '\n';
            }
          }
        }
        i++;
        continue;
      }

      if (state === S.BLK_CMT) {
        if (c === C.STAR && next === C.SLASH) {
          state = S.CODE;
          i += 2;
        } else {
          i++;
        }
        continue;
      }

      if (state === S.BLK_LUA) {
        if (c === C.RBRACK && next === C.RBRACK) {
          state = S.CODE;
          i += 2;
        } else {
          i++;
        }
        continue;
      }

      if (state === S.BLK_HS) {
        if (c === C.DASH && next === C.RBRACE) {
          state = S.CODE;
          i += 2;
        } else {
          i++;
        }
        continue;
      }

      if (state === S.BLK_PS) {
        if (c === C.HASH && next === C.GT) {
          state = S.CODE;
          i += 2;
        } else {
          i++;
        }
        continue;
      }

      if (state === S.REGEX) {
        out += src[i];
        if (c === C.BS) {
          out += src[i + 1] || '';
          i += 2;
          continue;
        }
        if (c === C.LBRACK) {
          regexBracketDepth++;
        } else if (c === C.RBRACK) {
          if (regexBracketDepth > 0) {
            regexBracketDepth--;
          }
        } else if (c === C.SLASH && regexBracketDepth === 0) {
          state = S.CODE;
        }
        i++;
        continue;
      }

      out += src[i];
      if (c === C.BS) {
        out += src[i + 1] || '';
        i += 2;
        continue;
      }
      if (state === S.STR_DQ && c === C.DQ) {
        state = S.CODE;
      } else if (state === S.STR_SQ && c === C.SQ) {
        state = S.CODE;
      } else if (state === S.STR_TDQ && c === C.DQ && next === C.DQ && next2 === C.DQ) {
        state = S.CODE;
        out += '""'; 
        i += 2; 
      } else if (state === S.STR_TSQ && c === C.SQ && next === C.SQ && next2 === C.SQ) {
        state = S.CODE;
        out += "''";
        i += 2;
      }
      i++;
    }
    return out.trim();
  }
};
