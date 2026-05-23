import antfu from '@antfu/eslint-config';
import eslintConfigPrettier from 'eslint-config-prettier';

export default antfu(
  {
    ignores: ['sandbox/**', 'dist/**', 'lib/**', 'docs/'],
    rules: {
      'no-console': 'off',
      'no-cond-assign': 'off',
      'no-control-regex': 'off',
      'no-regex-spaces': 'off',
      'style/if-newline': 'off',
      'ts/no-use-before-define': 'off',
      'node/prefer-global/process': 'off',
      'node/prefer-global/buffer': 'off',
      'unused-imports/no-unused-vars': ['error', {
        caughtErrors: 'none',
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'antfu/no-import-dist': 'off',
      'regexp/no-super-linear-backtracking': 'off',
      'regexp/optimal-quantifier-concatenation': 'off',
      'regexp/use-ignore-case': 'off',
    },
  },
  eslintConfigPrettier,
);
