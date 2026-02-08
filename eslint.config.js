import globals from 'globals';
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        setTimeout: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
      'no-console': ['error', { 'allow': ['warn', 'error'] }],
      'curly': ['error', 'all'],
      'brace-style': ['error', '1tbs', { 'allowSingleLine': false }],
      'object-curly-spacing': ['error', 'always'],
      'indent': ['error', 2, { 'SwitchCase': 1 }],
      'quotes': ['error', 'single', { 'avoidEscape': true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      'eol-last': ['error', 'always'],
      'keyword-spacing': ['error', { 'before': true, 'after': true }],
      'space-before-blocks': ['error', 'always'],
      'eqeqeq': ['error', 'always'],
      'consistent-return': 'error',
      'no-var': 'error',
      'prefer-const': 'error'
    }
  },
  {
    ignores: [
      'node_modules/',
      'dist/',
      'coverage/',
      'tests/fixtures/',
      '.DS_Store'
    ]
  }
];