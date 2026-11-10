const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Add more setup options before each test is run
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // if using TypeScript with a baseUrl set to the root directory then you need the below for alias' to work
  // moduleDirectories: ['node_modules', '<rootDir>/'],

  // Test spec file resolution pattern
  // Matches parent folder `__tests__` or files with extension `.test.tsx` etc.
  // testMatch: [
  //   "**/__tests__/**/*.?([mc])[jt]s?(x)",
  //   "**/?(*.)+(spec|test).?([mc])[jt]s?(x)"
  // ],

  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  // transformIgnorePatterns is customized in the async export below (next/jest
  // prepends its own node_modules patterns that would otherwise re-ignore the
  // ESM AI SDK packages we need transformed).
  // Git worktrees are independent checkouts — running their suites from this
  // root resolves `@/` imports against the wrong tree, so they always fail.
  testPathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/.worktrees/",
    "<rootDir>/.claude/worktrees/",
    // Written against node:test, not Jest. Run with: node --test
    "<rootDir>/lib/projectseed/__tests__/me-summary.test.ts",
    // Live-Postgres RLS integration suite. It is designed to FAIL (not skip)
    // when the DB is unreachable, so it must not run in the default CI pass.
    // Run it intentionally against a real database with:
    //   SUPABASE_DB_URL=... npx jest lib/supabase/__tests__/lobby-rls.test.ts
    "<rootDir>/lib/supabase/__tests__/lobby-rls.test.ts",
  ],
  // Do not discover package names or tests from independent nested checkouts.
  modulePathIgnorePatterns: ["<rootDir>/.claude/worktrees/"],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
//
// next/jest prepends its own transformIgnorePatterns (whitelisting only
// `geist` and `next/dist/...`) that still ignore the ESM AI SDK packages under
// pnpm. To actually transform them we must REPLACE the resolved list, not
// append — so we use the async override form and rebuild the patterns,
// preserving next/jest's own entries and adding ours.
module.exports = async () => {
  const config = await createJestConfig(customJestConfig)();

  const esmWhitelist = [
    // Direct layout: transform whitelisted packages, skip .pnpm (handled below).
    "[/\\\\]node_modules[/\\\\](?!\\.pnpm[/\\\\])(?!(?:@ai-sdk|@workflow|ai|zod)[/\\\\])",
    // pnpm store layout: scoped entries use `@scope+name` under .pnpm.
    "[/\\\\]node_modules[/\\\\]\\.pnpm[/\\\\](?!(?:@ai-sdk\\+[^/\\\\]+|@workflow\\+[^/\\\\]+|ai@|zod@))",
  ];

  config.transformIgnorePatterns = [
    ...esmWhitelist,
    // Keep next/jest's defaults (css modules) but drop its node_modules
    // patterns, which would otherwise re-ignore the packages we just
    // whitelisted.
    ...(config.transformIgnorePatterns || []).filter((p) =>
      p.includes("module\\.")
    ),
  ];

  // Route the ESM-only packages through a CommonJS-forcing babel transform.
  // Jest tries transform keys in insertion order, so this must precede the
  // catch-all SWC transform that next/jest provides.
  const esmPackagePath =
    "[/\\\\]node_modules[/\\\\](?:\\.pnpm[/\\\\](?:@ai-sdk\\+[^/\\\\]+|@workflow\\+[^/\\\\]+|ai|zod)@[^/\\\\]+[/\\\\]node_modules[/\\\\])?(?:@ai-sdk|@workflow|ai|zod)[/\\\\].+\\.(?:js|mjs|ts)$";

  const existingTransform = config.transform || {};

  config.transform = {
    [esmPackagePath]: require.resolve("./jest.esm-cjs-transform.js"),
    ...existingTransform,
  };

  return config;
};
