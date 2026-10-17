import { defineConfig } from 'vitest/config';

// Vitest's cache stays inside web/ (nothing is written outside the project).
export default defineConfig({
  cacheDir: '.tmp/vitest',
  test: { include: ['lib/**/*.test.ts'], environment: 'node' },
});
