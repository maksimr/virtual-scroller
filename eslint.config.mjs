import globals from 'globals';

export default [
  {
    languageOptions: {
      ecmaVersion: 2017,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'semi': 'error',
      'no-undef': 'error',
      'no-unused-vars': 'error'
    }
  }
];
