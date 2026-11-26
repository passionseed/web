#!/usr/bin/env node
/**
 * Builds lib/hackathon/elemental/schools/schools.json: the schools an
 * Elemental sharer can pick on the share page (M.3 to M.6, anywhere in
 * Thailand). Big, 2026-11-26: "let them pick their school name, get a school
 * name list from open data", one free seat per school.
 *
 * Sources, all Thai government open data:
 * - obec: OBEC (สพฐ.) schools, school year 2563 (data.go.th obec-school-007).
 *   Kept when the school teaches M.3 or higher (classMaxLevel ม.3 to ม.6).
 * - satit: university demonstration schools (data.go.th satit_sch_11_04, MHESI).
 *   The kindergarten and primary-only campuses are dropped.
 * - bma: Bangkok (กทม.) schools, school year 2568 (data.bangkok.go.th schooladdress).
 *   Kept when the school teaches up to M.3 or M.6.
 * - opec: private schools in Bangkok (data.bangkok.go.th private_school). Kindergartens dropped.
 * - dla: local-government (อปท.) schools, 2569 (data.go.th school12). The list has
 *   no grade levels, so only kindergartens are dropped.
 * Not covered yet: private schools outside Bangkok. MOE's national list
 * (catalog.moe.go.th, data.go.th gdpublish-cer) was down on 2026-11-26.
 * Anyone not on the list types their school's name instead.
 *
 * Usage: node scripts/build-elemental-schools.mjs [--cache <dir>]
 *   --cache: read <dir>/<source>.<json|csv> instead of downloading (same files the URLs give).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "lib/hackathon/elemental/schools/schools.json");

const SOURCES = {
  obec: { url: "https://opendata.edudev.in.th/v1/OBEC_SCHOOL_007", ext: "json", encoding: "utf-8" },
  satit: {
    url: "https://data.mhesi.go.th/dataset/e89ede35-7d81-4011-a61f-ff927cf09a9d/resource/71bac8c5-7ae4-4e8f-8272-23a063f5bc60/download/satit_sch_11_04.csv",
    ext: "csv",
    encoding: "windows-874",
  },
  bma: {
    url: "https://data.bangkok.go.th/dataset/f91adb8e-b6c4-4aa1-98f3-7cc0b781e6bb/resource/6125d62f-a4c6-4cba-a128-f9fb249c09e4/download/school-bma.csv",
    ext: "csv",
    encoding: "windows-874",
  },
  opec: {
    url: "https://data.bangkok.go.th/dataset/f0059550-56c7-43d7-8860-43198ae7c7b8/resource/f0ceb94d-d33f-446e-ac38-a6a04594d98b/download/private_school.csv",
    ext: "csv",
    encoding: "utf-8",
  },
  dla: {
    url: "https://opendata.dla.go.th/dataset/faabac25-137f-4bea-999f-b65f0aeee6fe/resource/e1c5f298-529e-431c-b4aa-62319dbb2057/download/untitled.csv",
    ext: "csv",
    encoding: "utf-8",
  },
};

const args = process.argv.slice(2);
const cacheDir = args.includes("--cache") ? args[args.indexOf("--cache") + 1] : null;

async function load(name) {
  const s = SOURCES[name];
  let bytes;
  const cached = cacheDir && join(cacheDir, `${name}.${s.ext}`);
  if (cached && existsSync(cached)) {
    bytes = readFileSync(cached);
  } else {
    const res = await fetch(s.url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status} from ${s.url}`);
    bytes = Buffer.from(await res.arrayBuffer());
  }
  return new TextDecoder(s.encoding).decode(bytes).replace(/^﻿/, "");
}

/** A small CSV reader: quoted fields, commas and newlines inside quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";
/** The name as shown, without the "โรงเรียน" in front (the page adds it back). */
function displayName(raw) {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(โรงเรียน|รร\.)\s*/, "")
    .trim();
}
/** The same normalisation as lib/hackathon/elemental/schools.ts, for spotting the same school twice. */
function fold(s) {
  return displayName(s)
    .replace(/[๐-๙]/g, (d) => String(THAI_DIGITS.indexOf(d)))
    .toLowerCase()
    .replace(/[\s.,()\-–_'"“”]/g, "");
}
const province = (p) => (p || "").replace(/^จังหวัด/, "").replace(/^จ\./, "").trim();
const hashKey = (source, prov, name) =>
  `${source}:${createHash("sha1").update(`${prov}|${fold(name)}`).digest("hex").slice(0, 10)}`;

const schools = [];
const seen = new Set();
const counts = {};
function add(source, key, rawName, prov) {
  const name = displayName(rawName);
  if (!name) return;
  const p = province(prov);
  const dedupe = `${fold(name)}|${p}`;
  if (seen.has(dedupe)) return;
  seen.add(dedupe);
  schools.push([key, name, p]);
  counts[source] = (counts[source] ?? 0) + 1;
}

const SECONDARY_MAX = new Set(["ม.3", "ม.4", "ม.5", "ม.6"]);
for (const s of JSON.parse(await load("obec"))) {
  if (!SECONDARY_MAX.has(s.classMaxLevel)) continue;
  add("obec", `obec:${s.moeCode}`, s.schoolName, s.province);
}

for (const [prov, name] of parseCsv(await load("satit")).slice(1)) {
  if (/อนุบาล|ประถม/.test(name) && !/มัธยม/.test(name)) continue;
  add("satit", hashKey("satit", province(prov), name), name, prov);
}

{
  const rows = parseCsv(await load("bma"));
  // Row 0 is a Thai header, row 1 the English one.
  const head = rows[1];
  const col = (k) => head.indexOf(k);
  for (const r of rows.slice(2)) {
    if (!/มัธย/.test(r[col("LEVEL")])) continue;
    add("bma", `bma:${r[col("IDSCHOOL")]}`, r[col("SCHOOLNAME")], "กรุงเทพมหานคร");
  }
}

{
  const rows = parseCsv(await load("opec"));
  const head = rows[0];
  for (const r of rows.slice(1)) {
    const name = r[head.indexOf("name")];
    if (/อนุบาล/.test(name)) continue;
    add("opec", `opec:${r[head.indexOf("id_sch")]}`, name, "กรุงเทพมหานคร");
  }
}

{
  const rows = parseCsv(await load("dla"));
  const head = rows[0];
  const iProv = head.indexOf("จังหวัด");
  const iName = head.indexOf("ชื่อสถานศึกษา");
  for (const r of rows.slice(1)) {
    const name = r[iName];
    if (!name || /อนุบาล/.test(name)) continue;
    add("dla", hashKey("dla", province(r[iProv]), name), name, r[iProv]);
  }
}

schools.sort((a, b) => a[1].localeCompare(b[1], "th") || a[2].localeCompare(b[2], "th"));
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify({
    builtOn: new Date().toISOString().slice(0, 10),
    sources: counts,
    // [key, name without "โรงเรียน", province]
    schools,
  }) + "\n",
);
console.log(`Wrote ${schools.length} schools to ${OUT}`, counts);
