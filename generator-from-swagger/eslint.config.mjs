import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig({
    files: ['src/**/*.ts'],
    ignores: ['**/*.d.ts'],
    languageOptions: {
        parser: tseslint.parser,
        ecmaVersion: 2022,
        sourceType: 'module',
    },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
        '@typescript-eslint/naming-convention': 'warn',
        curly: 'warn',
        eqeqeq: 'warn',
        'no-throw-literal': 'warn',
    },
});
