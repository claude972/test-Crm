import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@/': `${path.resolve(__dirname, 'src')}/`,
    },
  },
  test: {
    name: 'kovaa-lab-cli',
    environment: 'node',
    include: ['src/**/__tests__/**/*.spec.ts'],
  },
});
