import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
// @ts-expect-error untyped package
import prettier from 'eslint-config-prettier';
// @ts-expect-error untyped package
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';

import path from 'path';
import { fileURLToPath } from 'url';

import { FlatCompat } from '@eslint/eslintrc';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const name =
  (/** @type string */ name) => (/** @type import('eslint').Linter.FlatConfig */ config) => {
    config['name'] ??= `(${name})`;
    return config;
  };

const config = tseslint.config(
  eslint.configs.recommended,
  // TODO: evaluate 'stylistic'
  ...tseslint.configs.strictTypeChecked,
  {
    name: '(typescript config)',
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  ...compat.plugins('import').map(name('plugin:import')),

  // must come after github as github seemingly enables awful prettier plugin
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  name('prettier')(prettier),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
  name('comments/recommended')(comments.recommended),

  ...compat.plugins('unused-imports').map(name('plugin:unused-imports')),

  {
    name: '(overrides)',
    rules: {
      '@typescript-eslint/ban-ts-comment': 'warn',
      curly: 'error',
      quotes: [
        'warn',
        'single',
        {
          avoidEscape: true,
        },
      ],
      'prefer-template': 'warn',
      eqeqeq: ['warn', 'smart'],
      'no-lonely-if': 'warn',
      'no-multi-assign': 'warn',
      '@typescript-eslint/no-shadow': 'warn',
      'no-useless-return': 'warn',
      'no-useless-rename': 'warn',
      'one-var-declaration-per-line': 'warn',
      'prefer-object-spread': 'warn',
      'no-unreachable-loop': 'warn',
      'no-template-curly-in-string': 'warn',
      'default-case-last': 'warn',
      'no-array-constructor': 'warn',
      'no-else-return': 'warn',
      'array-callback-return': 'warn',
      '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],

      'import/first': 'error',
      'import/no-absolute-path': 'error',

      'import/consistent-type-specifier-style': ['error', 'prefer-inline'],
      'import/prefer-default-export': ['warn'],

      // vs plugin:@typescript-eslint/strict-type-checked
      '@typescript-eslint/no-confusing-void-expression': 'off', // inconvenient
      '@typescript-eslint/no-floating-promises': 'off', // used on for event handlers
      '@typescript-eslint/no-misused-promises': 'off', // used on for event handlers
      '@typescript-eslint/unbound-method': 'off', // conflicts with api clients

      'no-console': 'off',
      '@typescript-eslint/no-unused-vars': 1,
      'unused-imports/no-unused-imports': 2,

      // broken?
      '@typescript-eslint/consistent-type-imports': 'off',
      // broken?
      '@typescript-eslint/no-unnecessary-condition': 'off',

      // slow:
      'import/no-duplicates': 'off',
    },
  },
);

export default config;
