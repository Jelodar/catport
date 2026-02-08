import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export const NodeIO = {
  cwd: () => process.cwd(),
  exit: (code) => process.exit(code),
  writeStdout: (str) => process.stdout.write(str),
  writeStderr: (str) => process.stderr.write(str),
  readFile: (p) => fs.readFile(p),
  readText: (p) => fs.readFile(p, 'utf8'),
  
  readSample: async (p, size = 1024) => {
    let handle;
    try {
      handle = await fs.open(p, 'r');
      const buf = Buffer.alloc(size);
      const { bytesRead } = await handle.read(buf, 0, size, 0);
      return buf.subarray(0, bytesRead);
    } finally {
      if (handle) {
        await handle.close();
      }
    }
  },

  writeFile: (p, d) => fs.writeFile(p, d),
  mkdir: (p) => fs.mkdir(p, {
    recursive: true
  }),
  readdir: (p) => fs.readdir(p, {
    withFileTypes: true
  }),
  stat: (p) => fs.stat(p),
  exec: async (cmd, cwd) => {
    try {
      const { stdout } = await execAsync(cmd, {
        cwd,
        maxBuffer: 1024 * 1024 * 10
      });
      return stdout.trim();
    } catch (e) {
      throw new Error(e.message);
    }
  },
  execPipe: (cmd, input) => {
    return new Promise((resolve, reject) => {
      const child = spawn(cmd, { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
      
      const chunks = [];
      const errChunks = [];

      child.stdout.on('data', c => chunks.push(c));
      child.stderr.on('data', c => errChunks.push(c));

      child.on('close', (code) => {
        if (code !== 0) {
          const errOutput = Buffer.concat(errChunks).toString().trim();
          reject(new Error(`Command "${cmd}" exited with ${code}. ${errOutput}`));
        } else {
          resolve(Buffer.concat(chunks).toString('utf8'));
        }
      });
      
      child.on('error', (err) => reject(new Error(`Failed to start command: ${err.message}`)));

      child.stdin.end(input);
    });
  },
  readStdin: async function*() {
    for await (const chunk of process.stdin) {
      yield chunk.toString();
    }
  },
  createWriteStream: (p) => createWriteStream(p)
};
