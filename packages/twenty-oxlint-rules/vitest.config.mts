import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: 'packages/kovaa-lab-oxlint-rules',
    include: ['rules/**/*.spec.ts'],
    globals: true,
  },
});
