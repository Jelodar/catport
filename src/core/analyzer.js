export const Analyzer = {
  isBinary: (buf) => {
    return buf.indexOf(0) !== -1;
  },

  countTokens: (content, charsPerToken) => {
    // Fallback to 1 to avoid division by zero or negative tokens
    const cpt = charsPerToken || 4.2;
    return Math.max(1, Math.ceil(content.length / cpt));
  },

  getPriority: (path, rules = []) => {
    if (!rules || rules.length === 0) {
      return 1; // Default low priority
    }
    for (const { regex, score } of rules) {
      if (regex && regex.test(path)) {
        return score;
      }
    }
    return 1;
  }
};
