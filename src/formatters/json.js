const ESCAPE_MAP = Object.freeze({
  '"': '\\"', '\\': '\\\\', '\b': '\\b', '\f': '\\f',
  '\n': '\\n', '\r': '\\r', '\t': '\\t'
});

const normalizeJsonLike = (() => {
  const R_DQ = /"(?:\\[\s\S]|[^\\"])*"/;
  const R_SQ = /'(?:\\[\s\S]|[^\\'])*'/;
  const R_CMT = /\/\/[^\n]*|\/\*[\s\S]*?\*\//;

  // We explicitly exclude control chars, quotes, and JSON structure chars from keys.
  const R_KEY_GENERIC = /(\s*)([^\s"':,{}[\]]+)\s*(:)/;

  // Trailing Comma
  const R_TRL = /(,)\s*([}\]])/;

  // Order is critical: strings -> comments -> keys -> trailing commas
  const MASTER = new RegExp(
    `(${R_DQ.source})|(${R_SQ.source})|(${R_CMT.source})|` +
    `${R_KEY_GENERIC.source}|${R_TRL.source}`,
    'g'
  );

  const SQ_ESCAPE_REGEX = /["\b\f\n\r\t]/g;
  const esc = (c) => ESCAPE_MAP[c];

  return (src) => {
    if (!src || typeof src !== 'string') {
      return src;
    }

    return src.replace(MASTER, (match, ...args) => {
      const [
        doubleQuotedString, singleQuotedString, comment,
        keyPre, keyName, keyCol,       // R_KEY_GENERIC (3 groups)
        trailingComma, trailingBracket // R_TRL (2 groups)
      ] = args;

      if (doubleQuotedString) {
        return doubleQuotedString;
      }
      if (comment) {
        return '';
      }

      if (singleQuotedString) {
        let content = singleQuotedString.slice(1, -1);
        content = content.replace(/\\'/g, "'");
        content = content.replace(SQ_ESCAPE_REGEX, esc);
        return `"${content}"`;
      }

      // Quote bare keys
      if (keyName !== undefined) {
        return `${keyPre}"${keyName}"${keyCol}`;
      }

      if (trailingComma) {
        return trailingBracket;
      }

      return match;
    });
  };
})();

/**
 * Extracts balanced JSON-like blocks from a string.
 */
const extractBalancedObjects = (text) => {
  const results = [];
  let depth = 0;
  let inString = false;
  let quoteChar = '';
  let start = -1;
  let escape = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === '\\') {
        escape = true;
      } else if (c === quoteChar) {
        inString = false;
      }
    } else {
      if (c === '"' || c === "'") {
        inString = true;
        quoteChar = c;
      } else if (c === '{') {
        if (depth === 0) {
          start = i;
        }
        depth++;
      } else if (c === '}') {
        if (depth > 0) {
          depth--;
          if (depth === 0) {
            results.push(text.slice(start, i + 1));
          }
        }
      }
    }
  }
  return results;
};

export const Json = {
  getInstruction: () => `**CRITICAL:** Rules for every file (follow strictly and EXACTLY):
- Return valid JSON.
- The root MUST be an object containing a "files" array.
- Each item in the array MUST have "path" and "content" fields.
- Properly escape strings (e.g., quotes, newlines).

## Expected Schema

\`\`\`json
{
  "type": "object",
  "required": ["files"],
  "properties": {
    "files": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["path", "content"],
        "properties": {
          "path": { "type": "string", "description": "Relative file path" },
          "content": { "type": "string", "description": "File content" }
        }
      }
    }
  }
}
\`\`\`

## Examples

## Correct:

{
  "files": [
    {
      "path": "src/main.js",
      "content": "console.log(\\"Hello\\");"
    },
    {
      "path": "config.json",
      "content": "{\\n  \\"debug\\": true\\n}"
    }
  ]
}

## Wrong:

\`\`\`json
[ { "path": ... } ]   ✗ (Root must be object with "files" key)
\`\`\`

{ "path": ... }       ✗ (Must be inside "files" array)

Only output valid JSON. No explanations, no markdown, no extra text.`,

  header: (m) => {
    const meta = {
      name: m.name,
      context: m.context
    };
    if (m.tree) {
      meta.tree = m.tree;
    }
    return `{\n  "meta": ${JSON.stringify(meta)},\n  "files": [\n`;
  },

  file: (f) => {
    return `    ${JSON.stringify({
      path: f.rel,
      content: f.content
    })}`;
  },

  footer: (m) => {
    let out = '\n  ]';
    if (m.task) {
      out += `,\n  "task": ${JSON.stringify(m.task)}`;
    }
    if (m.instructionText) {
      out += `,\n  "instruction": ${JSON.stringify(m.instructionText)}`;
    }
    return out + '\n}';
  },

  parse: (txt, logger) => {
    if (!txt) {
      return [];
    }
    const clean = txt.trim();
    if (!clean) {
      return [];
    }

    const tryParse = (src) => {
      try {
        const obj = JSON.parse(src);
        if (!obj || typeof obj !== 'object' || obj === null) {
          return null;
        }
        if (!Array.isArray(obj.files)) {
          return null;
        }
        const valid = obj.files.every((f) => {
          return f &&
            typeof f === 'object' &&
            typeof f.path === 'string' &&
            f.path.trim() !== '' &&
            Object.hasOwn(f, 'content') &&
            typeof f.content === 'string';
        });
        if (!valid) {
          return null;
        }
        return obj.files;
      } catch {
        return null;
      }
    };

    const candidates = [];

    candidates.push(clean);
    {
      const normalized = normalizeJsonLike(clean);
      if (normalized !== clean) {
        candidates.push(normalized);
      }
    }

    const mdBlocks = [...clean.matchAll(/(?:^|\n)[ \t]*```(?:json)?\s*\n?([\s\S]*?)\n?[ \t]*```/g)];
    for (const m of mdBlocks) {
      const block = m[1].trim();
      if (block) {
        candidates.push(block);
        {
          const norm = normalizeJsonLike(block);
          if (norm !== block) {
            candidates.push(norm);
          }
        }
      }
    }

    const rawObjects = extractBalancedObjects(clean);
    // Sort by length descending to prefer larger wrapping objects
    rawObjects.sort((a, b) => b.length - a.length);

    const NOISE_TRESHOLD = 20; // arbitrary min length to avoid noise
    for (const objStr of rawObjects) {
      if (objStr.length > NOISE_TRESHOLD) {
        candidates.push(objStr);
        {
          const norm = normalizeJsonLike(objStr);
          if (norm !== objStr) {
            candidates.push(norm);
          }
        }
      }
    }

    for (const candidate of candidates) {
      const files = tryParse(candidate);
      if (files !== null) {
        return files;
      }
    }

    if (logger) {
      logger.warn('Failed to extract a files array from the JSON');
    }
    return [];
  }
};
