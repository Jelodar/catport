import { resolve } from 'node:path';

export const Git = {
  async getChangedFiles(io, target = 'HEAD', cwd) {
    const workDir = cwd || process.cwd();
    if (!/^[a-zA-Z0-9_./@^~: -]+$/.test(target)) {
      throw new Error(`Invalid git reference: "${target}"`);
    }

    try {
      const root = (await io.exec('git rev-parse --show-toplevel', workDir)).trim();

      const diffCmd = `git diff --name-only -z ${target}`;
      const diffOutput = await io.exec(diffCmd, workDir);

      let files = [];
      if (diffOutput) {
        files = diffOutput.split('\0').filter(Boolean);
      }

      if (target === 'HEAD') {
        const untrackedCmd = 'git ls-files --others --exclude-standard -z';
        const untrackedOutput = await io.exec(untrackedCmd, workDir);
        if (untrackedOutput) {
          const untrackedFiles = untrackedOutput.split('\0').filter(Boolean);
          files = files.concat(untrackedFiles);
        }
      }

      return new Set(files.map(f => resolve(root, f)));
    } catch {
      return null;
    }
  }
};
