export const KEYWORDS = new Set([
  'return', 'yield', 'throw', 'delete', 'typeof', 'void', 'case', 'else', 
  'do', 'await', 'default', 'in', 'instanceof'
]);

export const config = {
  regex: true,
  cComments: true,
  backticks: true,
  regexPrefixes: KEYWORDS
};
