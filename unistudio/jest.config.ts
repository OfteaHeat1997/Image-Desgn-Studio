import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '!**/__tests__/integration/**'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/integration/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.test.*', '!src/**/__tests__/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          lib: ['dom', 'dom.iterable', 'esnext'],
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },
  // Coverage configuration (disabled by default, enabled via --coverage CLI flag)
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/types/**',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  // Exclude integration tests (they require a live server)
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/integration/'],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 40,
      statements: 40,
    },
  },
};

export default config;
