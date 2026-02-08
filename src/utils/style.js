const isColorSupported = () => {
  if (process?.env?.NO_COLOR) {
    return false;
  }
  if (process?.env?.FORCE_COLOR) {
    return true;
  }
  return process?.stdout?.isTTY === true;
};

const createStyler = (open, close) => {

  const opener = `\x1b[${open}m`;
  const closer = `\x1b[${close}m`;
  const regex = new RegExp(`\\x1b\\[${close}m`, 'g');

  return (text) => {
    const s = String(text);
    if (!isColorSupported()) {
      return s;
    }
    return s.includes(closer)
      ? opener + s.replace(regex, closer + opener) + closer
      : opener + s + closer;
  };
};

export const Style = {
  // modifiers
  reset: createStyler(0, 0),
  bold: createStyler(1, 22),
  dim: createStyler(2, 22),
  italic: createStyler(3, 23),
  underline: createStyler(4, 24),
  inverse: createStyler(7, 27),
  hidden: createStyler(8, 28),
  strikethrough: createStyler(9, 29),

  // foreground
  black: createStyler(30, 39),
  red: createStyler(31, 39),
  green: createStyler(32, 39),
  yellow: createStyler(33, 39),
  blue: createStyler(34, 39),
  magenta: createStyler(35, 39),
  cyan: createStyler(36, 39),
  white: createStyler(37, 39),
  gray: createStyler(90, 39),

  // background
  bgBlack: createStyler(40, 49),
  bgRed: createStyler(41, 49),
  bgGreen: createStyler(42, 49),
  bgYellow: createStyler(43, 49),
  bgBlue: createStyler(44, 49),
  bgMagenta: createStyler(45, 49),
  bgCyan: createStyler(46, 49),
  bgWhite: createStyler(47, 49)
};
