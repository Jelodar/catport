import { LOG } from '../config/constants.js';
import { Style } from './style.js';

export const Logger = (level, io) => ({
  error: (msg) => {
    if (level >= LOG.ERROR) {
      io.writeStderr(`${Style.bgRed(Style.white(' ERR '))} ${msg}\n`);
    }
  },
  warn: (msg) => {
    if (level >= LOG.WARN) {
      io.writeStderr(`${Style.bgYellow(Style.black(' WRN '))} ${msg}\n`);
    }
  },
  info: (msg) => {
    if (level >= LOG.INFO) {
      io.writeStderr(`${Style.blue(' INF ')} ${msg}\n`);
    }
  },
  debug: (msg) => {
    if (level >= LOG.DEBUG) {
      io.writeStderr(`${Style.dim(' DBG ')} ${Style.dim(msg)}\n`);
    }
  }
});
