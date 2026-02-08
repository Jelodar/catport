
/**
 * Map CLI flags to schema keys.
 */
const buildMaps = (schema) => {
  const flags = new Map();
  const shorts = new Map();

  for (const [key, opt] of Object.entries(schema)) {
    const long = '--' + key.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
    flags.set(long, key);
    if (opt.short) {
      shorts.set('-' + opt.short, key);
    }
  }
  return { flags, shorts };
};

const parseNumber = (key, val) => {
  const n = Number(val);
  if (Number.isNaN(n)) {
    throw new Error(`Expected number for --${key}, got "${val}"`);
  }
  return n;
};

export const Parser = {
  getDefaults(schema) {
    const defaults = { paths: [] };
    for (const [key, opt] of Object.entries(schema)) {
      if (opt.default !== undefined) {
        defaults[key] = opt.default;
      }
    }
    return defaults;
  },

  /**
   * Parse argv into an explicit configuration object.
   * Does NOT apply defaults. Returns only what is present in argv.
   */
  parse(argv, schema) {
    const { flags, shorts } = buildMaps(schema);
    const explicit = { paths: [] };
    const args = argv.slice(2);

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--') {
        explicit.paths.push(...args.slice(i + 1));
        break;
      }

      if (!arg.startsWith('-') || arg === '-') {
        explicit.paths.push(arg);
        continue;
      }

      // Grouped Short Flags (e.g. -xvu)
      if (!arg.startsWith('--') && arg.length > 2) {
        const chars = arg.slice(1).split('');
        for (const c of chars) {
          const key = shorts.get('-' + c);
          if (!key) {
            throw new Error(`Unknown flag: -${c}`);
          }
          if (schema[key].type !== 'boolean') {
            throw new Error(`Flag -${c} requires a value and cannot be grouped.`);
          }
          explicit[key] = true;
        }
        continue;
      }

      // Normal Flags
      let key = null;
      let explicitVal = null;

      if (arg.startsWith('--')) {
        if (arg.includes('=')) {
          const parts = arg.split('=');
          key = flags.get(parts[0]);
          explicitVal = parts.slice(1).join('=');
        } else {
          key = flags.get(arg);
        }
      } else {
        key = shorts.get(arg);
      }

      if (!key) {
        throw new Error(`Unknown argument: ${arg}`);
      }

      const opt = schema[key];
      const isBool = opt.type === 'boolean';

      if (isBool) {
        if (explicitVal) {
          throw new Error(`Boolean flag ${key} does not accept a value.`);
        }
        explicit[key] = true;
      } else {
        let val = explicitVal;
        
        if (val === null) {
          const next = args[i + 1];
          
          // Value detection logic
          let isValidValue = false;
          if (next !== undefined) {
            const isFlag = next.startsWith('-');
            const isStdin = next === '-';
            const isNumberValue = isFlag && opt.type === 'number' && !Number.isNaN(Number(next));

            if (!isFlag || isStdin || isNumberValue) {
              isValidValue = true;
            }
          }

          if (isValidValue) {
            val = next;
            i++;
          } else {
            if (opt.optional) {
              val = true;
            } else {
              throw new Error(`Flag ${key} requires a value.`);
            }
          }
        }

        if (val === true && opt.optional) {
          explicit[key] = true;
        } else {
          const parsed = opt.type === 'number' ? parseNumber(key, val) : val;
          if (opt.type === 'array') {
            if (!explicit[key]) {
              explicit[key] = [];
            }
            explicit[key].push(parsed);
          } else {
            explicit[key] = parsed;
          }
        }
      }
    }

    return explicit;
  }
};
