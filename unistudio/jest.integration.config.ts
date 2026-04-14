import type { Config } from 'jest';

const config: Config = {
  displayName: 'integration',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/integration/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
        isolatedModules: true,
      },
    ],
  },
  // 60 seconds per test — API calls (TTS, upload) can be slow
  testTimeout: 60000,
  // Run tests serially to avoid port conflicts on CI
  maxWorkers: 1,
  // Only show failures and summary in output
  verbose: true,
};

export default config;
