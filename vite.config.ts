/// <reference types="vitest" />
import path from 'path';
import { defineConfig } from 'vite';
const name = 'fetch-cloud-config';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name,
      fileName: (format) => `${name}.${format}.js`,
    },
  },
});
