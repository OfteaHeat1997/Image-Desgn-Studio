import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // 60 seconds per test (page loads, animations, slow CI)
  timeout: 60000,
  // Retry once on failure (flakiness guard)
  retries: 1,
  // Run tests serially so a single dev server suffices
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_URL || 'http://localhost:3000',
    // Capture screenshot only when a test fails
    screenshot: 'only-on-failure',
    // Record trace on first retry for debugging
    trace: 'on-first-retry',
    // Short action timeout (clicks, fills)
    actionTimeout: 10000,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
