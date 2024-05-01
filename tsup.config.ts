import { defineConfig } from 'tsup';

export default defineConfig({
    target: 'esnext',
    keepNames: true,
    entryPoints: ['./src/**/*.ts'],
    clean: true,
    format: 'esm',
    splitting: true,
    minify: false,
    config: 'tsconfig.json',
});
