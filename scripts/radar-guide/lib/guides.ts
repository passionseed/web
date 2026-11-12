/**
 * The code guides for the radar-guide commands: the server registry, made
 * importable under tsx (see server-only-shim), plus the guide folder paths.
 * Keep the shim import first.
 */
import "./server-only-shim";

import { join } from "node:path";

import { GLOBAL_BANNED } from "../../../lib/radar-guides/banned";
import { SHARED_FACTS } from "../../../lib/radar-guides/_shared/facts";
import { allGuides, guideFacts, loadGuide, readClipManifest, readGuideFile } from "../../../lib/radar-guides/registry.server";
import type { CareerGuide } from "../../../lib/radar-guide/guide-types";
import { fail, REPO_ROOT } from "./cli";

export { allGuides, GLOBAL_BANNED, guideFacts, loadGuide, readClipManifest, readGuideFile, SHARED_FACTS };

/** lib/radar-guides/<slug>/: where clips.json and clips/<page>.vtt are committed. */
export function guideDir(slug: string): string {
  return join(REPO_ROOT, "lib/radar-guides", slug);
}

/** The guide for `slug`, or a clear failure listing the guides that exist. */
export function requireGuide(slug: string): CareerGuide {
  const guide = loadGuide(slug);
  if (!guide) {
    const known = allGuides().map((g) => g.meta.slug);
    fail(`No code guide for "${slug}". Guides: ${known.join(", ") || "none"} (lib/radar-guides/<slug>/guide.ts).`);
  }
  return guide;
}
