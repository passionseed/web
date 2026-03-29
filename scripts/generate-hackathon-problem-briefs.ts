import fs from "node:fs/promises";
import path from "node:path";
import { parseProblemBrief } from "../lib/hackathon/problem-brief-schema";
import { generateProblemBriefFromDossier } from "../lib/hackathon/problem-brief-generator";

const ROOT = process.cwd();
const PROBLEM_DIR = path.join(ROOT, "public", "data", "hackathon", "problems");

function parseProblemFilter(argv: string[]): Set<string> | null {
  const arg = argv.find((entry) => entry.startsWith("--problem="));
  if (!arg) {
    return null;
  }

  return new Set(
    arg
      .slice("--problem=".length)
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function findDossierPath(problemId: string): Promise<string | null> {
  const lower = problemId.toLowerCase();
  const candidates = [
    path.join(ROOT, "research", "hackathon-problems", `${lower}.md`),
    path.join(ROOT, "research", "hackathon-problems", `${lower}.json`),
    path.join(ROOT, `research-${lower}.json`),
    path.join(ROOT, `${lower}_research_report.json`),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

async function main() {
  const filter = parseProblemFilter(process.argv.slice(2));
  const filenames = (await fs.readdir(PROBLEM_DIR))
    .filter((filename) => /^p\d+\.json$/i.test(filename))
    .sort();

  for (const filename of filenames) {
    const basename = filename.replace(/\.json$/i, "").toLowerCase();
    if (filter && !filter.has(basename) && !filter.has(basename.toUpperCase())) {
      continue;
    }

    const fullPath = path.join(PROBLEM_DIR, filename);
    const raw = JSON.parse(await fs.readFile(fullPath, "utf8"));
    const seed = parseProblemBrief(raw);
    const dossierPath = await findDossierPath(seed.problemId);

    if (!dossierPath) {
      console.warn(`[hackathon-briefs] Skipping ${seed.problemId}: no research dossier found.`);
      continue;
    }

    console.log(`Generating sourced brief for ${seed.problemId}...`);
    const sourceDossier = await fs.readFile(dossierPath, "utf8");
    const brief = await generateProblemBriefFromDossier({
      seed,
      sourceDossier,
    });

    await fs.writeFile(fullPath, `${JSON.stringify(brief, null, 2)}\n`, "utf8");
    console.log(`[hackathon-briefs] Wrote ${filename} using ${path.relative(ROOT, dossierPath)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
