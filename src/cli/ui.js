import { Style } from '../utils/style.js';

export const UI = (io) => ({
  printHeader: (app) => {
    io.writeStdout(`\n${Style.bold(Style.cyan(app.NAME))} v${app.VERSION}\n`);
    io.writeStdout(`${Style.dim(app.DESC)}\n`);
  },

  printHelp: (app, schema) => {
    const pad = (str, len) => str.padEnd(len, ' ');
    const row = (short, long, desc) => `  ${Style.yellow(short)}, ${Style.green(pad(long, 24))} ${desc}`;
    const toKebab = (str) => '--' + str.replace(/[A-Z]/g, m => '-' + m.toLowerCase());

    io.writeStdout(`\n${Style.bold('USAGE')}\n  ${app.NAME} [options] [path...]\n`);

    const categories = {};

    Object.entries(schema).forEach(([key, opt]) => {
      const cat = opt.category || 'General';
      if (!categories[cat]) {
        categories[cat] = [];
      }

      let flagStr = toKebab(key);
      if (opt.type !== 'boolean') {
        const mv = Style.italic(opt.metavar);
        if (opt.optional) {
          flagStr += ` [${mv}]`;
        } else {
          flagStr += ` <${mv}>`;
        }
      }

      categories[cat].push(row(`-${opt.short}`, flagStr, opt.desc));
    });

    const order = [
      'General',
      'Bundling',
      'Extraction'
    ];

    order.forEach(name => {
      if (categories[name]) {
        io.writeStdout(`\n${Style.bold(Style.underline(name.toUpperCase()))}\n${categories[name].join('\n')}\n`);
      }
    });

    const cmt = (s) => Style.dim('# ' + s);

    io.writeStdout(`\n${Style.bold('EXAMPLES')}
  ${cmt('Bundle project with task')}
  ${app.NAME} -T "Refactor this" -o bundle.md

  ${cmt('Bundle git changes with optimized output (no comments)')}
  ${app.NAME} -g HEAD -O comments

  ${cmt('Extract code (safe by default)')}
  ${app.NAME} -x bundle.md -d ./src

  ${cmt('Extract code (unsafe/allow traversal)')}
  ${app.NAME} -x bundle.md -d ./src -U
`);
  },

  printError: (msg) => {
    const badge = Style.bgRed(Style.white(' FATAL '));
    io.writeStderr(`\n${badge} ${msg}\n`);
  },

  printUsageReport: (stats, path) => {
    if (path) {
      const files = stats.files !== undefined ? stats.files : stats;
      const tokens = stats.tokens !== undefined ? ` (~${stats.tokens} tokens)` : '';
      io.writeStdout(`\n${Style.green('✔ Success')} Bundled ${Style.bold(files)} files${tokens} to ${Style.cyan(path)}\n`);
    }
  }
});
