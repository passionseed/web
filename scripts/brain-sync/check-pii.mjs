#!/usr/bin/env node
// Scans the uncommitted changes in a git checkout (the company brain) for
// personal data and secrets before the web-sync bot commits them.
//
//   node scripts/brain-sync/check-pii.mjs <repo-dir>   exit 1 and list hits
//   node scripts/brain-sync/check-pii.mjs --self-test  run the built-in cases
//
// Only added lines are checked, so existing page content never blocks a run.
// No dependencies: runs on a bare Node install.

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// Company addresses and git noreply addresses are not personal data.
const ALLOWED_EMAIL = /@(passionseed\.org|users\.noreply\.github\.com|anthropic\.com)$/i;

function luhn(digits) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

const RULES = [
  {
    name: "email address",
    re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,
    keep: (m) => !ALLOWED_EMAIL.test(m),
  },
  {
    // 0812345678, 081-234-5678, 081 234 5678, +66 81 234 5678
    name: "Thai mobile number",
    re: /(?<![\d+])(?:\+66[\s-]?|0)[689]\d(?:[\s-]?\d){7}(?!\d)/g,
  },
  {
    // 02-123-4567, 053 123 456 (separators required so plain numbers pass)
    name: "Thai landline number",
    re: /(?<![\d-])0[2-7]\d?[\s-]\d{3}[\s-]\d{3,4}(?![\d-])/g,
  },
  {
    // +1 415 555 0100, +44 20 7946 0958 (+66 handled above)
    name: "international phone number",
    re: /(?<![\w+])\+(?!66)[1-9]\d{0,2}[\s-]?\(?\d{1,4}\)?(?:[\s-]?\d){6,11}(?!\d)/g,
  },
  {
    // 1234567890123 or 1-2345-67890-12-3
    name: "13-digit ID number",
    re: /(?<![\d-])(?:\d{13}|\d-\d{4}-\d{5}-\d{2}-\d)(?![\d-])/g,
  },
  {
    name: "card number",
    re: /(?<![\d-])\d(?:[ -]?\d){12,18}(?![\d-])/g,
    keep: (m) => {
      const digits = m.replace(/\D/g, "");
      // 13 plain digits are already reported as an ID number.
      if (/^\d{13}$/.test(m)) return false;
      return luhn(digits);
    },
  },
  {
    name: "GitHub token",
    re: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g,
  },
  { name: "API secret key (sk-)", re: /\bsk-(?:ant-|proj-|live-|test-)?[A-Za-z0-9_-]{16,}/g },
  { name: "Stripe key", re: /\b[rsp]k_(?:live|test)_[A-Za-z0-9]{16,}/g },
  { name: "AWS access key", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { name: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}/g },
  { name: "Slack token", re: /\bxox[abposr]-[A-Za-z0-9-]{10,}/g },
  { name: "JWT", re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name: "private key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  {
    name: "credentials in a URL",
    re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@[^\s]+/gi,
  },
];

/** Returns [{ rule, match }] for every hit in one line of text. */
export function scanLine(line) {
  const hits = [];
  for (const rule of RULES) {
    for (const m of line.matchAll(rule.re)) {
      if (!rule.keep || rule.keep(m[0])) hits.push({ rule: rule.name, match: m[0] });
    }
  }
  return hits;
}

/** Returns [{ file, line, rule, match }] for every added line in a unified diff. */
export function scanDiff(diff) {
  const hits = [];
  let file = null;
  let lineNo = 0;
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ ")) {
      file = raw.slice(4).replace(/^b\//, "");
      continue;
    }
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      lineNo = Number(hunk[1]);
      continue;
    }
    if (raw.startsWith("+")) {
      for (const h of scanLine(raw.slice(1))) hits.push({ file, line: lineNo, ...h });
      lineNo++;
    } else if (!raw.startsWith("-") && !raw.startsWith("\\")) {
      lineNo++;
    }
  }
  return hits;
}

function redact(s) {
  return s.length <= 6 ? "***" : `${s.slice(0, 3)}…${s.slice(-2)} (${s.length} chars)`;
}

function diffOf(dir) {
  const git = (...args) =>
    execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  // Mark new files so they show up in the diff without staging their content.
  git("add", "-A", "--intent-to-add");
  return git("diff", "HEAD", "--no-color", "--no-ext-diff", "-U0");
}

function selfTest() {
  // Fake values are split with + so secret scanners do not flag this file.
  const bad = [
    ["student@gmail.com", "email address"],
    ["call 081-234-5678", "Thai mobile number"],
    ["0812345678", "Thai mobile number"],
    ["+66 81 234 5678", "Thai mobile number"],
    ["office 02-123-4567", "Thai landline number"],
    ["+1 415 555 0100", "international phone number"],
    ["id 1101700203451", "13-digit ID number"],
    ["id 1-1017-00203-45-1", "13-digit ID number"],
    ["card 4111 1111 1111 1111", "card number"],
    ["gh" + "p_abcdefghijklmnopqrstuvwxyz0123456789", "GitHub token"],
    ["github" + "_pat_11ABCDEFG0123456789_abcdefghijklmnop", "GitHub token"],
    ["sk" + "-ant-api03-abcdefghijklmnopqrstuv", "API secret key (sk-)"],
    ["sk" + "_live_abcdefghijklmnop1234", "Stripe key"],
    ["AKIA" + "IOSFODNN7EXAMPLE", "AWS access key"],
    ["eyJhbGciOiJIUzI1NiJ9" + ".eyJyb2xlIjoic2VydmljZSJ9.abcdefghijklmnop", "JWT"],
    ["-----BEGIN RSA " + "PRIVATE KEY-----", "private key"],
    ["postgres://user:" + "hunter22@db.example.com/x", "credentials in a URL"],
  ];
  const good = [
    "- 2026-10-21 · [SHIFT feedback: ฿690 community sign-up (#208)](https://github.com/passionseed/web/pull/208): adds the sign-up",
    "Contact hello@passionseed.org for details.",
    "Co-Authored-By: Claude <noreply@anthropic.com>",
    "updated: 2026-10-21",
    "Price: ฿1,999 per student, 120 students as of 2026-10-01",
    "Round 3 runs 2026-11-01 to 2026-11-07.",
    "Order id 12345678 and version 1.0.254",
    "See https://brain.passionseed.org/numbers for totals.",
  ];
  let failed = 0;
  for (const [text, rule] of bad) {
    if (!scanLine(text).some((h) => h.rule === rule)) {
      console.error(`FAIL: expected "${rule}" in: ${text}`);
      failed++;
    }
  }
  for (const text of good) {
    const hits = scanLine(text);
    if (hits.length) {
      console.error(`FAIL: unexpected ${hits.map((h) => h.rule).join(", ")} in: ${text}`);
      failed++;
    }
  }
  const diffHits = scanDiff(
    "+++ b/shift.md\n@@ -1,0 +5,2 @@\n+fine line\n+reach me at kid@example.com\n-old@example.com\n",
  );
  if (diffHits.length !== 1 || diffHits[0].file !== "shift.md" || diffHits[0].line !== 6) {
    console.error("FAIL: scanDiff line tracking", diffHits);
    failed++;
  }
  if (failed) {
    console.error(`check-pii self-test: ${failed} failure(s)`);
    process.exit(1);
  }
  console.log(`check-pii self-test: ${bad.length + good.length + 1} cases passed`);
}

function main() {
  const arg = process.argv[2];
  if (arg === "--self-test") return selfTest();
  if (!arg) {
    console.error("Usage: node scripts/brain-sync/check-pii.mjs <repo-dir> | --self-test");
    process.exit(2);
  }
  const hits = scanDiff(diffOf(arg));
  if (!hits.length) {
    console.log("check-pii: no personal data or secrets found in the added lines.");
    return;
  }
  console.error(`check-pii: ${hits.length} possible personal data or secret hit(s); not committing.`);
  for (const h of hits) console.error(`  ${h.file}:${h.line}  ${h.rule}: ${redact(h.match)}`);
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
