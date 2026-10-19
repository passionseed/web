/**
 * Builds output/marketing/publish-queue.json from PUBLISH_PLAN: every slot
 * with its final text, media files (checked on disk) and status, for the
 * social-publish skill to work through. Also writes x-posts.md for review.
 *
 *   npx tsx scripts/build-publish-queue.ts [exportDate]
 *
 * exportDate is the output/marketing/<date> folder holding the rendered
 * slides (default: the newest one). Existing statuses and URLs are kept, so
 * re-running never forgets what was already published.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { LINKEDIN_POSTS, PUBLISH_PLAN, X_POSTS } from "../lib/marketing/sets";
import { xWeightedLength } from "../lib/marketing/xText";

type Status = "planned" | "scheduled" | "posted" | "skipped" | "failed";

interface QueueItem {
  id: string;
  platform: "linkedin" | "x";
  account: string;
  post: string;
  at: string;
  text: string;
  media: string[];
  mediaKind: "pdf" | "images" | "none";
  documentTitle?: string;
  status: Status;
  url?: string;
  note?: string;
}

const ROOT = resolve(__dirname, "..");
const MARKETING = join(ROOT, "output", "marketing");
const QUEUE_FILE = join(MARKETING, "publish-queue.json");
const ACCOUNTS = { linkedin: "linkedin.com/in/bigfang", x: "x.com/PassionSeed_th" } as const;

function newestExport(): string {
  const dates = readdirSync(MARKETING).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if (!dates.length) throw new Error("No output/marketing/<date> export found. Run render-marketing.mjs first.");
  return dates[dates.length - 1];
}

function mustExist(file: string): string {
  if (!existsSync(file)) throw new Error(`Missing media: ${file}`);
  return file;
}

function linkedinItem(slug: string, at: string, dir: string): Omit<QueueItem, "status"> {
  const post = LINKEDIN_POSTS.find((p) => p.slug === slug);
  if (!post) throw new Error(`Unknown LinkedIn post ${slug}`);
  const pdf = post.attach ? mustExist(join(dir, post.attach, `${post.attach}.pdf`)) : null;
  return {
    id: `linkedin:${slug}`,
    platform: "linkedin",
    account: ACCOUNTS.linkedin,
    post: slug,
    at,
    text: post.body,
    media: pdf ? [pdf] : [],
    mediaKind: pdf ? "pdf" : "none",
    documentTitle: pdf ? post.title : undefined,
  };
}

function xItem(slug: string, at: string, dir: string): Omit<QueueItem, "status"> {
  const post = X_POSTS.find((p) => p.slug === slug);
  if (!post) throw new Error(`Unknown X post ${slug}`);
  const images = post.images
    ? post.images.slides.map((n) => mustExist(join(dir, post.images!.set, `${String(n).padStart(2, "0")}.png`)))
    : [];
  return {
    id: `x:${slug}`,
    platform: "x",
    account: ACCOUNTS.x,
    post: slug,
    at,
    text: post.text,
    media: images,
    mediaKind: images.length ? "images" : "none",
  };
}

const exportDate = process.argv[2] ?? newestExport();
const dir = join(MARKETING, exportDate);
const previous: QueueItem[] = existsSync(QUEUE_FILE) ? JSON.parse(readFileSync(QUEUE_FILE, "utf8")).items : [];
const kept = new Map(previous.map((item) => [item.id, item]));

const items: QueueItem[] = PUBLISH_PLAN.map((slot) => {
  const fresh = slot.platform === "linkedin" ? linkedinItem(slot.post, slot.at, dir) : xItem(slot.post, slot.at, dir);
  const old = kept.get(fresh.id);
  // Published or scheduled items keep their record; planned ones take fresh copy.
  if (old && old.status !== "planned") return old;
  return { ...fresh, status: "planned" };
});

writeFileSync(
  QUEUE_FILE,
  `${JSON.stringify({ exportDate, generatedAt: new Date().toISOString(), accounts: ACCOUNTS, items }, null, 2)}\n`,
);

const xDoc = X_POSTS.flatMap((p) => [
  `## ${p.title} (\`${p.slug}\`, ${xWeightedLength(p.text)}/280)`,
  "",
  p.text,
  "",
  p.images ? `Images: ${p.images.set} slides ${p.images.slides.join(", ")}` : "No images",
  "",
  "---",
  "",
]);
writeFileSync(join(dir, "x-posts.md"), [`# X posts (@PassionSeed_th), ${exportDate}`, "", ...xDoc].join("\n"));

const counts = items.reduce<Record<string, number>>((acc, i) => ({ ...acc, [i.status]: (acc[i.status] ?? 0) + 1 }), {});
console.log(`✅ ${items.length} slots -> ${QUEUE_FILE}`, counts);
