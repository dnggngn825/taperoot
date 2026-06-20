import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'web/e2e',
  use: {
    baseURL: 'http://localhost:8080',
  },
});
