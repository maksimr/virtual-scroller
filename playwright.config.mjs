import {defineConfig, devices} from '@playwright/test';

const url = 'http://localhost:1234';

export default defineConfig({
  testDir: 'test/e2e',
  forbidOnly: !!process.env.CI,
  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome'], viewport: {width: 800, height: 600}}
    }
  ],
  use: {
    baseURL: url
  },
  webServer: {
    command: 'npm start',
    url,
    reuseExistingServer: !process.env.CI
  }
});
