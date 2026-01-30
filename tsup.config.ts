import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts', 'src/index.ts'],
  format: ['esm'],
  target: 'es2022',
  clean: true,
  dts: true,
  sourcemap: true,
  splitting: false,
  shims: true,
  external: ['readline/promises', 'readline', 'fs', 'path', 'process', 'os'],
})
