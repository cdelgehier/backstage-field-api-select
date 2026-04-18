import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    '@backstage/core-plugin-api',
    '@backstage/plugin-scaffolder',
    '@backstage/plugin-scaffolder-react',
    '@mui/material',
  ],
});
