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

export interface ActivitySpec {
  title: string;
  gradingMode?: string; // e.g. "orientation" — skips hard evidence gates
  learningGoal: string;
  whatToLookFor: string[];
  redFlags: string[];
  exemplars?: {
    strong: string;
    weak: string;
  };
  gradingGuidance?: string;
}

export async function getActivitySpec(
  phaseNumber: number | null | undefined,
  activityDisplayOrder: number | null | undefined,
  activityTitle: string | null | undefined
): Promise<ActivitySpec | null> {
  if (!phaseNumber || !activityDisplayOrder) return null;

  const slug = activityTitle
    ? activityTitle
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 40)
    : null;

  const phaseDir = path.join(SPECS_DIR, `phase-${phaseNumber}`);

  // Try exact slug match first
  if (slug) {
    const exact = path.join(phaseDir, `activity-${activityDisplayOrder}-${slug}.md`);
    try {
      return parseActivitySpec(await fs.readFile(exact, "utf8"));
    } catch {
      // try next
    }

    // Try partial slug prefix match: file starts with "activity-N-SLUGPREFIX"
    try {
      const entries = await fs.readdir(phaseDir);
      const basePattern = `activity-${activityDisplayOrder}-`;
      const matching = entries.find((entry) => {
        if (!entry.startsWith(basePattern) || !entry.endsWith(".md")) return false;
        const fileSlug = entry.slice(basePattern.length, -3); // strip .md
        return slug.startsWith(fileSlug) || fileSlug.startsWith(slug.split("-")[0] + "-" + slug.split("-")[1]);
      });
      if (matching) {
        return parseActivitySpec(await fs.readFile(path.join(phaseDir, matching), "utf8"));
      }
    } catch {
      // try next
    }
  }

  // Fallback: bare "activity-N.md"
  const bare = path.join(phaseDir, `activity-${activityDisplayOrder}.md`);
  try {
    return parseActivitySpec(await fs.readFile(bare, "utf8"));
  } catch {
    return null;
  }
}

function parseActivitySpec(content: string): ActivitySpec {
  const lines = content.split("\n");
  const spec: ActivitySpec = {
    title: "",
    learningGoal: "",
    whatToLookFor: [],
    redFlags: [],
  };

  let currentSection: keyof ActivitySpec | null = null;
  let buffer: string[] = [];

  function flush() {
    if (!currentSection || buffer.length === 0) return;
    const text = buffer.join("\n").trim();
    if (currentSection === "whatToLookFor" || currentSection === "redFlags") {
      (spec[currentSection] as string[]) = text
        .split("\n")
        .map((l) => l.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean);
    } else if (currentSection === "exemplars") {
      const strong = text.match(/Strong:\s*([\s\S]*?)(?=Weak:|$)/i)?.[1]?.trim();
      const weak = text.match(/Weak:\s*([\s\S]*?)$/i)?.[1]?.trim();
      if (strong || weak) {
        spec.exemplars = { strong: strong ?? "", weak: weak ?? "" };
      }
    } else {
      (spec[currentSection] as string) = text;
    }
    buffer = [];
  }

  for (const line of lines) {
    const headerMatch = line.match(/^##\s*(.+)$/);
    if (headerMatch) {
      flush();
      const section = headerMatch[1].trim().toLowerCase().replace(/\s+/g, "");
      switch (section) {
        case "title":
          currentSection = "title";
          break;
        case "gradingmode":
        case "grading_mode":
          currentSection = "gradingMode";
          break;
        case "learninggoal":
        case "learning_goal":
          currentSection = "learningGoal";
          break;
        case "whattolookfor":
        case "what_to_look_for":
        case "criteria":
          currentSection = "whatToLookFor";
          break;
        case "redflags":
        case "red_flags":
        case "warnings":
          currentSection = "redFlags";
          break;
        case "exemplars":
        case "examples":
          currentSection = "exemplars";
          break;
        case "gradingguidance":
        case "grading_guidance":
        case "notes":
          currentSection = "gradingGuidance";
          break;
        default:
          currentSection = null;
      }
    } else if (currentSection) {
      buffer.push(line);
    }
  }
  flush();

  return spec;
}

export function formatActivitySpecForPrompt(spec: ActivitySpec | null): string {
  if (!spec) return "";
  const parts: string[] = [];
  if (spec.gradingMode) {
    parts.push(`GRADING MODE: ${spec.gradingMode.toUpperCase()}`);
    if (spec.gradingMode.toLowerCase() === "orientation") {
      parts.push(
        "IMPORTANT: This is an orientation activity. " +
        "DO NOT apply the Artifact Type Check, Reality Signal Check, or Phase Alignment Check. " +
        "No interview evidence is expected. Grade on genuine engagement only."
      );
    }
  }
  if (spec.learningGoal) {
    parts.push(`\nLEARNING GOAL: ${spec.learningGoal}`);
  }
  if (spec.whatToLookFor.length > 0) {
    parts.push(`\nLOOK FOR EVIDENCE OF:`);
    spec.whatToLookFor.forEach((item, i) => parts.push(`${i + 1}. ${item}`));
  }
  if (spec.redFlags.length > 0) {
    parts.push(`\nRED FLAGS — AUTO-FAIL IF:`);
    spec.redFlags.forEach((item, i) => parts.push(`${i + 1}. ${item}`));
  }
  if (spec.exemplars) {
    parts.push(`\nEXEMPLARS:`);
    if (spec.exemplars.strong) parts.push(`Strong submission: ${spec.exemplars.strong}`);
    if (spec.exemplars.weak) parts.push(`Weak submission: ${spec.exemplars.weak}`);
  }
  if (spec.gradingGuidance) {
    parts.push(`\nGRADING NOTES: ${spec.gradingGuidance}`);
  }
  return parts.join("\n");
}
