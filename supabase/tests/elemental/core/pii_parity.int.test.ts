/**
 * The SQL PII check (public.elemental__pii_kind, migration
 * 20261123100000_elemental_core.sql) and refusePii (lib/elemental/core/pii.ts)
 * must agree on every case in lib/elemental/core/pii-cases.json, and on
 * variants and random strings built from the characters the rules care about.
 * They agree on refuse or pass, and on the kind too.
 *
 *   pnpm test:elemental:integration supabase/tests/elemental/core
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Client } from "pg";

import { piiKind, refusePii } from "@/lib/elemental/core";
import { applyAll, connectionString, ROOT, start, stop } from "@/scripts/elemental/harness";

interface Cases {
  refuse: { text: string; kind: string }[];
  pass: { text: string }[];
}

const cases: Cases = JSON.parse(readFileSync(join(ROOT, "lib", "elemental", "core", "pii-cases.json"), "utf8"));

/** SQL kinds for many texts in one round trip, in order. */
async function sqlKinds(texts: string[]): Promise<(string | null)[]> {
  const client = new Client({ connectionString: connectionString() });
  await client.connect();
  try {
    const { rows } = await client.query<{ kind: string | null }>(
      "SELECT public.elemental__pii_kind(t) AS kind FROM unnest($1::text[]) WITH ORDINALITY AS u(t, o) ORDER BY o",
      [texts],
    );
    return rows.map((row) => row.kind);
  } finally {
    await client.end();
  }
}

function jsKind(text: string): string | null {
  const result = refusePii({ text });
  return result.ok ? null : result.kind;
}

/** Texts where the two sides disagree, for a readable failure (never logged outside the test). */
async function disagreements(texts: string[]): Promise<{ text: string; js: string | null; sql: string | null }[]> {
  const sql = await sqlKinds(texts);
  return texts.map((text, i) => ({ text, js: jsKind(text), sql: sql[i] })).filter((row) => row.js !== row.sql);
}

/** Deterministic PRNG (mulberry32), so a failure reproduces. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pieces the rules look at: digits (Arabic, Thai, full-width), separators, labels, @, dots, TLDs,
// whitespace of several kinds, invisible characters and plain words in both languages.
const PIECES = [
  "0", "8", "1", "2", "5", "9", "๐", "๘", "๑", "０", "８", "+", "+66", "-", ".", "(", ")", " ", "  ", " ", "　", "\t",
  "​", "­", "@", "＠", ":", "：", "=", "line", "LINE", "ไลน์", "id", "ID", "ig", "fb", "x", "tt", "yt", "discord",
  "tiktok", "ไอจี", "เฟส", "เฟสบุ๊ก", "www", "http://", "https://", "com", "co", "th", "me", "gg", "be", "a", "b", "_", "mint",
  "online", "deadline", "fig", "insta", "abc", "เพื่อน", "ร้าน", "ม.5", "/", "e", "g",
];

function randomText(next: () => number): string {
  const n = 1 + Math.floor(next() * 7);
  let out = "";
  for (let i = 0; i < n; i++) out += PIECES[Math.floor(next() * PIECES.length)];
  return out;
}

describe("PII parity: refusePii and the SQL check", () => {
  beforeAll(async () => {
    await start();
    applyAll();
  }, 240_000);

  afterAll(() => stop());

  it("refuses every refuse case, with the same kind", async () => {
    const texts = cases.refuse.map((c) => c.text);
    const sql = await sqlKinds(texts);
    cases.refuse.forEach((c, i) => {
      expect({ text: c.text, js: piiKind(c.text), sql: sql[i] }).toEqual({ text: c.text, js: c.kind, sql: c.kind });
    });
  });

  it("passes every pass case", async () => {
    const texts = cases.pass.map((c) => c.text);
    const sql = await sqlKinds(texts);
    cases.pass.forEach((c, i) => {
      expect({ text: c.text, js: piiKind(c.text), sql: sql[i] }).toEqual({ text: c.text, js: null, sql: null });
    });
  });

  it("agrees on the cases wrapped in other text, upper-cased and spaced differently", async () => {
    const all = [...cases.refuse.map((c) => c.text), ...cases.pass.map((c) => c.text)];
    const variants = all.flatMap((text) => [
      `ทดสอบ ${text} ครับ`,
      `before ${text} after`,
      `${text}.`,
      `(${text})`,
      text.toUpperCase(),
      text.replace(/ /g, " "),
      text.replace(/ /g, "  "),
      `เพื่อน${text}`,
      `x${text}`,
    ]);
    expect(await disagreements(variants)).toEqual([]);
  });

  it("agrees on 4,000 random strings built from the characters the rules use", async () => {
    const next = rng(20261123);
    const texts = Array.from({ length: 4000 }, () => randomText(next));
    // Both refuse and pass must be well represented, or the run proves little.
    const refused = texts.filter((t) => jsKind(t) !== null).length;
    expect(refused).toBeGreaterThan(400);
    expect(texts.length - refused).toBeGreaterThan(400);
    expect(await disagreements(texts)).toEqual([]);
  });
});
