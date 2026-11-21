// Elemental integration tests: *.int.test.ts files that start a throwaway
// Postgres through scripts/elemental/harness.ts (Docker, or local Postgres
// binaries). Kept out of the default `pnpm test` run (jest.config.js ignores
// them) so the sharded CI test jobs never need a database.
//
//   pnpm test:elemental:integration
//   pnpm test:elemental:integration supabase/tests/elemental/core
const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

module.exports = createJestConfig({
  testEnvironment: 'node',
  testMatch: ['**/*.int.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.worktrees/', '<rootDir>/.claude/worktrees/'],
  modulePathIgnorePatterns: ['<rootDir>/.claude/worktrees/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  clearMocks: true,
  // Each test file starts its own server; a few at a time is plenty.
  maxWorkers: 2,
  testTimeout: 120000,
});
