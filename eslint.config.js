import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'src/api/types/openapi.d.ts', 'tests/**'] },

  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: {
      ...reactHooks.configs.flat.recommended.plugins,
      ...reactRefresh.configs.vite.plugins,
      'import-x': importX,
    },
    languageOptions: {
      globals: globals.browser,
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver()],
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      ...reactRefresh.configs.vite.rules,

      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            // api/ must not import hooks/, routes/, components/, stores/
            {
              target: 'src/api/**',
              from: 'src/hooks/**',
              message: 'api/ must not import hooks/',
            },
            {
              target: 'src/api/**',
              from: 'src/routes/**',
              message: 'api/ must not import routes/',
            },
            {
              target: 'src/api/**',
              from: 'src/components/**',
              message: 'api/ must not import components/',
            },
            {
              target: 'src/api/**',
              from: 'src/stores/**',
              message: 'api/ must not import stores/',
            },

            // hooks/ must not import routes/, components/
            {
              target: 'src/hooks/**',
              from: 'src/routes/**',
              message: 'hooks/ must not import routes/',
            },
            {
              target: 'src/hooks/**',
              from: 'src/components/**',
              message: 'hooks/ must not import components/',
            },

            // routes/ must not import api/ directly (must go via hooks), except api/types/
            {
              target: 'src/routes/**',
              from: 'src/api/**',
              except: ['**/types/**'],
              message: 'routes/ must use hooks/, not direct api functions (types are OK)',
            },

            // components/ui/ must not import routes/, hooks/, api/
            {
              target: 'src/components/ui/**',
              from: 'src/routes/**',
              message: 'components/ui/ must not import routes/',
            },
            {
              target: 'src/components/ui/**',
              from: 'src/hooks/**',
              message: 'components/ui/ must not import hooks/',
            },
            {
              target: 'src/components/ui/**',
              from: 'src/api/**',
              message: 'components/ui/ must not import api/',
            },

            // lib/ must not import routes/, hooks/, components/, stores/
            {
              target: 'src/lib/**',
              from: 'src/routes/**',
              message: 'lib/ must not import routes/',
            },
            {
              target: 'src/lib/**',
              from: 'src/hooks/**',
              message: 'lib/ must not import hooks/',
            },
            {
              target: 'src/lib/**',
              from: 'src/components/**',
              message: 'lib/ must not import components/',
            },
            // i18n.ts is exempt: it subscribes to ui-store to sync locale → i18next
            {
              target: 'src/lib/!(i18n).ts',
              from: 'src/stores/**',
              message: 'lib/ must not import stores/',
            },

            // stores/ must not import api/, hooks/
            {
              target: 'src/stores/**',
              from: 'src/api/**',
              message: 'stores/ must not import api/',
            },
            {
              target: 'src/stores/**',
              from: 'src/hooks/**',
              message: 'stores/ must not import hooks/',
            },
          ],
        },
      ],
    },
  },

  // shadcn primitives export variant helpers alongside components (e.g. buttonVariants)
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  // Layer-boundary zones constrain production dependency direction. Test files
  // legitimately assemble across layers to verify integration wiring (e.g.
  // i18n.test.ts exercises the ui-store → i18next locale subscription), so the
  // path restriction does not apply to them.
  {
    files: ['**/*.{test,spec}.{ts,tsx}'],
    rules: {
      'import-x/no-restricted-paths': 'off',
    },
  },

  prettier,
);
