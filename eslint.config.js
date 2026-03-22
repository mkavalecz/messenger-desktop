import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';

export default defineConfig([
  globalIgnores(['dist', 'out']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      importPlugin.flatConfigs.recommended,
      importPlugin.flatConfigs.electron,
      importPlugin.flatConfigs.typescript,
      prettier
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname
      },
      ecmaVersion: 2020,
      globals: globals.node
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': 'off'
    }
  }
]);
