import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    include: ['lib/**/*.test.js'],
    environment: 'jsdom',
    restoreMocks: true
  }
});
