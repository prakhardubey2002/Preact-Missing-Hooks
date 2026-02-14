import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],

    poolOptions: {
      threads: {
        maxThreads: 8,  
        minThreads: 1,
      }
    }
  },
});
