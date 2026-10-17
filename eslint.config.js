import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Код, который обязан быть чистым и детерминированным: без DOM и без Math.random().
const PURE = ['src/core/**/*.ts', 'src/layout/**/*.ts', 'src/games/*/rules/**/*.ts', 'src/games/*/ai/**/*.ts', 'src/games/*/view.ts', 'src/games/*/sim.ts'];

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'node_modules/', 'assets-src/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['vite.config.ts', 'eslint.config.js', 'tools/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: PURE,
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-properties': ['error', { object: 'Math', property: 'random', message: 'Только ГСЧ из состояния (src/core/rng.ts).' }],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'setTimeout', 'setInterval', 'performance'],
    },
  },
  {
    // ИИ видит только PlayerView: полное состояние партии ему недоступно (docs/games/durak.md §9).
    files: ['src/games/*/ai/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['**/rules/state', '**/rules/state.ts', '**/rules/engine', '**/rules/engine.ts'], message: 'ИИ получает только PlayerView.' }],
      }],
    },
  },
);
