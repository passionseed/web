/**
 * Checks the Elemental SQL on a throwaway Postgres (scripts/elemental/harness.ts):
 * Supabase stubs, the whiteboard migrations, the hackathon registration migration,
 * then every *elemental*.sql migration, with the registration and elemental files
 * applied a second time (they must be re-runnable). Then each
 * supabase/tests/elemental/**\/*.test.sql runs in its own fresh copy of that
 * database with ON_ERROR_STOP, so a failed ASSERT or any error fails the check.
 * Never touches a real database, so it needs no credentials.
 *
 *   pnpm test:db:elemental              # every test file
 *   pnpm test:db:elemental core canvas  # only test paths containing "core" or "canvas"
 *
 * ELEMENTAL_PG_BACKEND=docker|local|auto (default auto), ELEMENTAL_PG_IMAGE
 * (default postgres:15-alpine) and PG_BIN pick the server; see the harness.
 */
import { relative } from "node:path";

import { applyAll, createDatabase, DATABASE, dropDatabase, ROOT, runSqlFile, sqlTestFiles, start, stop } from "./elemental/harness";

async function main(): Promise<number> {
  const filters = process.argv.slice(2);
  const tests = sqlTestFiles(filters);
  if (!tests.length) {
    console.error(`No supabase/tests/elemental/**/*.test.sql${filters.length ? ` matching ${filters.join(", ")}` : ""}.`);
    return 1;
  }
  const failures: string[] = [];
  try {
    const { backend, detail } = await start();
    const { first, again } = applyAll();
    console.log(`Postgres via ${backend} (${detail}).`);
    console.log(`Applied ${first.length} migrations, then again: ${again.join(", ")}.\n`);
    tests.forEach((file, i) => {
      const name = relative(ROOT, file);
      const copy = `${DATABASE}_test_${i}`;
      createDatabase(copy, DATABASE);
      const { ok, output } = runSqlFile(file, copy);
      dropDatabase(copy);
      console.log(`${ok ? "✓" : "✕"} ${name}`);
      if (!ok) failures.push(`${name}:\n    ${output.split("\n").join("\n    ")}`);
    });
  } finally {
    stop();
  }
  if (failures.length) {
    console.error(`\n${failures.length} of ${tests.length} failed:\n  ${failures.join("\n  ")}`);
    return 1;
  }
  console.log(`\nAll ${tests.length} Elemental SQL test files passed.`);
  return 0;
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    stop();
    process.exit(130);
  });
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    stop();
    process.exit(1);
  },
);
