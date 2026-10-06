/** Run pnpm generate:og after adding pages or changing poster copy/art. */
import { readdir, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { renderPoster } from "../lib/og/poster";
import { copyForRoute } from "../lib/og/copy";

async function pageDirectories(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const children = await Promise.all(entries.filter((e) => e.isDirectory() && !e.name.startsWith("_") && !e.name.startsWith("@"))
    .map((e) => pageDirectories(path.join(dir, e.name))));
  return [...(entries.some((e) => e.name === "page.tsx") ? [dir] : []), ...children.flat()];
}

async function main() {
  const app = path.join(process.cwd(), "app");
  const directories = await pageDirectories(app);
  let generated = 0;
  for (const dir of directories) {
    const segments = path.relative(app, dir).split(path.sep);
    // Next's build adapter cannot resolve prerendered static metadata under
    // dynamic segments. Inherit the nearest parent poster, or keep a live handler.
    if (segments.some((segment) => segment.startsWith("["))) {
      await rm(path.join(dir, "opengraph-image.png"), { force: true });
      await rm(path.join(dir, "opengraph-image.alt.txt"), { force: true });
      continue;
    }
    // Dynamic image handlers retain live public titles (rounds, tips, products).
    const entries = await readdir(dir);
    if (entries.includes("opengraph-image.tsx")) {
      if (entries.includes("opengraph-image.png")) throw new Error(`Conflicting image handlers in ${dir}: remove the generated PNG and alt text.`);
      continue;
    }
    const route = "/" + segments.filter((s) => !s.startsWith("(")).join("/");
    const response = await renderPoster(copyForRoute(route));
    const buffer = Buffer.from(await response.arrayBuffer());
    const file = path.join(dir, "opengraph-image.png");
    const previous = await readFile(file).catch(() => null);
    if (!previous?.equals(buffer)) await writeFile(file, buffer);
    await writeFile(path.join(dir, "opengraph-image.alt.txt"), `${copyForRoute(route).title} | PassionSeed`);
    generated++;
  }
  console.log(`Generated ${generated} page posters at 1200 × 630. Dynamic image handlers use the same renderer.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
