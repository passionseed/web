import fs from "node:fs/promises";
import path from "node:path";

const SPECS_DIR = path.join(process.cwd(), "lib", "hackathon", "phase-specs");

export async function getPhaseSpec(phaseNumber: number | null | undefined): Promise<string | null> {
  if (!phaseNumber) return null;
  const filePath = path.join(SPECS_DIR, `phase-${phaseNumber}.md`);
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}
