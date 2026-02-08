import { join, relative, resolve, isAbsolute, dirname } from 'node:path';
import { Ignore } from './ignore.js';

export const Scanner = {
  async *scan(config, io) {
    const cwd = io.cwd ? io.cwd() : process.cwd();
    const baseIgnore = Ignore.create(config.ignore || []);

    if (config.gitFiles) {
      yield* Scanner._scanDirect(config.gitFiles, config, io, cwd, baseIgnore);
      return;
    }

    const roots = (config.paths && config.paths.length) ? config.paths : ['.'];
    const visited = new Set();

    for (const root of roots) {
      const full = resolve(cwd, root);
      let stats;
      try {
        stats = await io.stat(full);
      } catch {
        continue;
      }

      if (stats.isDirectory()) {
        yield* Scanner._walk(full, baseIgnore, config, io, full, cwd, visited);
      } else {
        const rel = relative(dirname(full), full).replace(/\\/g, '/');
        
        if (baseIgnore.test(rel)) {
          continue;
        }

        if (config.extSet && config.extSet.size > 0) {
          const ext = full.split('.').pop().toLowerCase();
          if (!config.extSet.has(ext)) {
            continue;
          }
        }

        yield {
          path: full,
          rel: rel,
          isDir: false
        };
      }
    }
  },

  async *_scanDirect(files, config, io, cwd, baseIgnore) {
    // If specific paths were requested (e.g. "catport src/ -g"), we must intersect
    // the gitFiles list with those path scopes.
    const roots = (config.paths && config.paths.length) 
      ? config.paths.map(p => resolve(cwd, p)) 
      : [cwd];

    for (const full of files) {
      // relative() returns a path starting with '..' if outside, or an absolute path on different drives (Win32)
      const inScope = roots.some(root => {
        const rel = relative(root, full);
        return !rel.startsWith('..') && !isAbsolute(rel);
      });
      if (!inScope) {
        continue;
      }

      // Git reports deleted files, we must skip them.
      try {
        const stats = await io.stat(full);
        if (!stats.isFile()) {
          continue;
        }
      } catch {
        continue;
      }

      const fileRoot = roots.find(root => {
        const rel = relative(root, full);
        return !rel.startsWith('..') && !isAbsolute(rel);
      }) || cwd;

      const rel = relative(fileRoot, full).replace(/\\/g, '/');

      if (baseIgnore.test(rel)) {
        continue;
      }

      if (config.extSet && config.extSet.size > 0) {
        const ext = full.split('.').pop().toLowerCase();
        if (!config.extSet.has(ext)) {
          continue;
        }
      }

      yield {
        path: full,
        rel: rel,
        isDir: false
      };
    }
  },

  async *_walk(dir, ignore, config, io, root, cwd, visited) {
    // Cycle detection
    try {
      const stats = await io.stat(dir);
      if (stats.dev !== undefined && stats.ino !== undefined) {
        const key = `${stats.dev}:${stats.ino}`;
        if (visited.has(key)) {
          return;
        }
        visited.add(key);
      }
    } catch {
      return;
    }

    let currentIgnore = ignore;

    if (!config.noIgnore) {
      try {
        const gitignore = await io.readText(join(dir, '.gitignore'));
        const scopedPatterns = Ignore.parse(gitignore, dir, cwd);
        currentIgnore = ignore.extend(scopedPatterns);
      } catch {
        // No .gitignore found, proceed
      }
    }

    let entries = [];
    try {
      entries = await io.readdir(dir);
    } catch {
      return;
    }

    for (const e of entries) {
      const full = join(dir, e.name);
      const rel = relative(root, full).replace(/\\/g, '/');

      if (e.name === '.git') {
        continue;
      }

      if (currentIgnore.test(rel)) {
        continue;
      }

      let isDir = e.isDirectory();
      if (e.isSymbolicLink()) {
        try {
          const stats = await io.stat(full);
          isDir = stats.isDirectory();
        } catch {
          // Broken link or permission error
          isDir = false;
        }
      }

      if (isDir) {
        yield {
          path: full,
          rel: rel,
          isDir: true
        };
        yield* Scanner._walk(full, currentIgnore, config, io, root, cwd, visited);
      } else {
        if (config.extSet && config.extSet.size > 0) {
          const ext = e.name.split('.').pop().toLowerCase();
          if (!config.extSet.has(ext)) {
            continue;
          }
        }

        yield {
          path: full,
          rel: rel,
          isDir: false
        };
      }
    }
  }
};
