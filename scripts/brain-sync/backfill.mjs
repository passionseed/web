#!/usr/bin/env node
// One-off backfill of company-brain product-log.md from every merged web PR.
// Run by hand (not in CI); it only edits the file, it never commits or pushes.
//
//   node scripts/brain-sync/backfill.mjs <brain-checkout-path> [--dry-run]
//
// Needs the GitHub CLI (`gh`) signed in with read access to passionseed/web.
// Summaries come from the PR title (no AI). Entries already in the log
// (matched by PR URL) are kept as they are, so it is safe to run twice.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO = "passionseed/web";
const MONTH = /^## (\d{4}-\d{2})\s*$/;
const ENTRY = /^- (\d{4}-\d{2}-\d{2}) · \[.*\]\((https:\/\/github\.com\/[^)]+\/pull\/\d+)\)/;

const bangkokDate = (iso) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date(iso));

// No em or en dashes on brain pages (company-brain copy rule).
const noDashes = (s) => s.replace(/\s*[\u2014\u2013]\s*/g, ", ");

function cleanTitle(title) {
  return noDashes(title)
    .replace(/\s*\(#\d+\)\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function summaryFrom(title) {
  // "feat(shift): add globe design" -> "Add globe design."
  let s = cleanTitle(title).replace(/^[a-z]+(\([^)]*\))?!?:\s*/i, "");
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return /[.!?]$/.test(s) ? s : `${s}.`;
}

const linkText = (title) => cleanTitle(title).replace(/[[\]]/g, (c) => `\\${c}`);

function fetchMergedPrs() {
  const out = execFileSync(
    "gh",
    ["pr", "list", "--repo", REPO, "--state", "merged", "--limit", "1000",
      "--json", "number,title,mergedAt,url,body"],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
  );
  return JSON.parse(out);
}

/** Splits product-log.md into the text before "## Log" and the month -> lines map. */
function parseLog(text) {
  const lines = text.split("\n");
  const logAt = lines.findIndex((l) => /^## Log\s*$/.test(l));
  if (logAt === -1) throw new Error('product-log.md has no "## Log" heading');
  const head = lines.slice(0, logAt + 1);
  const months = new Map();
  let current = null;
  for (const line of lines.slice(logAt + 1)) {
    const m = line.match(MONTH);
    if (m) {
      current = m[1];
      if (!months.has(current)) months.set(current, []);
    } else if (current && line.trim() && line.trim() !== "No entries yet.") {
      months.get(current).push(line);
    }
  }
  return { head, months };
}

function render({ head, months }) {
  const out = [...head];
  for (const month of [...months.keys()].sort().reverse()) {
    const entries = months.get(month);
    // Newest first; lines that are not entries keep their place at the end.
    const dated = entries.filter((l) => ENTRY.test(l));
    const other = entries.filter((l) => !ENTRY.test(l));
    dated.sort((a, b) => b.match(ENTRY)[1].localeCompare(a.match(ENTRY)[1]));
    out.push("", `## ${month}`, "", ...dated, ...other);
  }
  return `${out.join("\n").replace(/\n+$/, "")}\n`;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const brain = args.find((a) => !a.startsWith("--"));
  if (!brain) {
    console.error("Usage: node scripts/brain-sync/backfill.mjs <brain-checkout-path> [--dry-run]");
    process.exit(2);
  }
  const file = path.join(brain, "product-log.md");
  if (!fs.existsSync(file)) {
    console.error(`No product-log.md in ${brain}. Is that a company-brain checkout?`);
    process.exit(2);
  }

  const log = parseLog(fs.readFileSync(file, "utf8"));
  const seen = new Set();
  for (const lines of log.months.values()) {
    for (const l of lines) {
      const m = l.match(ENTRY);
      if (m) seen.add(m[2]);
    }
  }

  let added = 0;
  for (const pr of fetchMergedPrs()) {
    if (!pr.mergedAt || seen.has(pr.url)) continue;
    const date = bangkokDate(pr.mergedAt);
    const month = date.slice(0, 7);
    if (!log.months.has(month)) log.months.set(month, []);
    log.months.get(month).push(`- ${date} · [${linkText(pr.title)}](${pr.url}): ${summaryFrom(pr.title)}`);
    seen.add(pr.url);
    added++;
  }

  if (added) {
    log.head = log.head.map((l) => (/^updated: /.test(l) ? `updated: ${bangkokDate(new Date())}` : l));
  }
  const result = render(log);
  if (dryRun) {
    process.stdout.write(result);
  } else {
    fs.writeFileSync(file, result);
  }
  console.error(`backfill: ${added} new entr${added === 1 ? "y" : "ies"}${dryRun ? " (dry run, file not written)" : ` written to ${file}`}.`);
  if (added && !dryRun) {
    console.error("Next: review the diff, run `node scripts/brain-sync/check-pii.mjs <brain-path>`, then commit on a branch and open a PR.");
  }
}

main();
