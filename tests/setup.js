
export const createMockIO = (fileSystem = {}) => {
  const written = {}, logs = [], stdout = [];
  const CWD = process.cwd();
  const fs = { ...fileSystem };

  const normalize = (p) => {
    let n = p;
    // Strip absolute CWD path to simulate relative lookups
    if (n.startsWith(CWD)) {
      n = n.slice(CWD.length);
      if (n.startsWith('/') || n.startsWith('\\')) {
        n = n.slice(1);
      }
    }
    return n.replace(/^\.\//, '').replace(/\/$/, '');
  };

  const checkError = (p) => {
    if (fs[p] instanceof Error) {
      throw fs[p];
    } 
  };

  const getBuffer = (p) => {
    const n = normalize(p); checkError(n);
    if (fs[n] === undefined) {
      throw new Error(`ENOENT: ${p}`);
    }
    return Buffer.from(fs[n]);
  };

  // Simple string hash for unique inodes
  const getInode = (str) => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return hash >>> 0;
  };

  return {
    _written: written, _logs: logs, _stdout: stdout, _fs: fs,
    cwd: () => CWD,
    exit: (code) => logs.push(`EXIT ${code}`),
    writeStdout: (s) => stdout.push(s),
    writeStderr: (s) => logs.push(s),
    readFile: async (p) => getBuffer(p),
    readText: async (p) => {
      const b = getBuffer(p);
      return b.toString();
    },
    readSample: async (p, size) => {
      const buf = getBuffer(p);
      return buf.subarray(0, Math.min(buf.length, size));
    },
    writeFile: async (p, d) => {
      const n = normalize(p); checkError(n); written[n] = d; fs[n] = d; 
    },
    mkdir: async (p) => {
      checkError(normalize(p)); 
    },
    readdir: async (p) => {
      const n = normalize(p); checkError(n);
      const entries = [], seen = new Set(), prefix = (n === '' || n === '.') ? '' : n + '/';
      Object.keys(fs).forEach(k => {
        if (k.startsWith(prefix)) {
          const rest = k.slice(prefix.length);
          if (!rest) {
            return;
          }
          const segment = rest.split('/')[0];
          if (!seen.has(segment)) {
            seen.add(segment);
            entries.push({ 
              name: segment, 
              isDirectory: () => rest.includes('/'),
              isSymbolicLink: () => false
            });
          }
        }
      });
      return entries;
    },
    stat: async (p) => {
      const n = normalize(p);
      checkError(n);
      
      if (fs[n] !== undefined) {
        return {
          isDirectory: () => false,
          isFile: () => true,
          size: Buffer.from(fs[n]).length,
          mtime: new Date(),
          dev: 1,
          ino: getInode(n)
        };
      }

      const prefix = n === '' || n === '.' ? '' : n + '/';
      const hasChildren = Object.keys(fs).some(k => k.startsWith(prefix));

      if (hasChildren || n === '' || n === '.') {
        return {
          isDirectory: () => true,
          isFile: () => false,
          size: 0,
          mtime: new Date(),
          dev: 1,
          ino: getInode(n)
        };
      }
      throw new Error(`ENOENT: ${p}`);
    },
    createWriteStream: (p) => {
      let buf = '';
      return { write: (c) => {
        buf += c; 
      }, end: () => {
        written[p] = buf; fs[p] = buf; 
      } };
    },
    readStdin: async function* () {
      if (fs['__stdin__']) {
        yield fs['__stdin__'];
      } 
    },
    watch: async function* (_p) {},
    exec: async (_cmd) => '',
    execPipe: async (_cmd, input) => input
  };
};
