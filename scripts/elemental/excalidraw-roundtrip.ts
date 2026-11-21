/**
 * Elemental canvas notes, checked against the real Excalidraw (ticket E03's day-1 spike).
 *
 *   pnpm exec tsx scripts/elemental/excalidraw-roundtrip.ts            # check, exit 1 on any failure
 *   pnpm exec tsx scripts/elemental/excalidraw-roundtrip.ts --write-fixture
 *
 * @excalidraw/excalidraw is ESM-only and imports browser globals at load, so it
 * cannot run in Jest (jest.config.js only transforms a few ESM packages). This
 * script bundles it for Node with esbuild into a temp file, installs a minimal
 * DOM shim, and then:
 *
 * 1. Holds lib/elemental/canvas/fracIndex.ts equal to the `fractional-indexing`
 *    package Excalidraw itself uses (appends, prepends and random in-betweens).
 * 2. Lays a SHIFT project canvas out with Excalidraw (projectCanvasSkeleton
 *    through convertToExcalidrawElements, as the editor does), adds 12 notes with
 *    buildNote, rewrites one and deletes another, stores the board the way
 *    whiteboard_merge_elements does (JSON, ordered by index in byte order), and
 *    runs restoreElements as WhiteboardCanvas does on open. Every note element
 *    must come back unchanged, and every index must stay valid and in order
 *    (bound text above its container).
 * 3. Checks each note element has the same fields, of the same types, as a
 *    note the editor makes (shiftCardSkeleton through convertToExcalidrawElements).
 *    --write-fixture writes that editor-made note, text replaced by 'x' and
 *    authors by placeholders, to lib/elemental/canvas/fixtures/shift-test-note.json
 *    for the Jest test.
 *
 * Text measuring is shimmed (10 px per character), so this checks structure,
 * not pixels. How a note looks is a browser check on the dry-run list.
 */
import { build } from "esbuild";
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";

import { isValidIndex, keyBetween, lastIndex } from "../../lib/elemental/canvas/fracIndex";
import { isPlacementObstacle } from "../../lib/elemental/canvas/geometry";
import { buildNote, buildTombstone, type Note, rewriteNote } from "../../lib/elemental/canvas/note";
import { projectCanvasSkeleton, shiftCardSkeleton } from "../../lib/whiteboard/shift-cards";

type El = Record<string, unknown> & { id: string; type: string; index?: string | null; isDeleted?: boolean; customData?: Record<string, unknown> };
type Excalidraw = {
  convertToExcalidrawElements: (skeletons: unknown[], opts?: { regenerateIds?: boolean }) => El[];
  restoreElements: (elements: unknown[], local: null) => El[];
};
type FracIndexing = { generateKeyBetween: (a: string | null, b: string | null) => string };

const ROOT = path.resolve(__dirname, "../..");
const FIXTURE = path.join(ROOT, "lib/elemental/canvas/fixtures/shift-test-note.json");
const OWNER = "00000000-0000-4000-8000-000000000001";
const failures: string[] = [];
const fail = (msg: string) => failures.push(msg);

// ---------------------------------------------------------------------------
// Loading Excalidraw in Node

function installDomShim() {
  const g = globalThis as Record<string, unknown>;
  const ctx2d = {
    font: "",
    measureText: (t: string) => ({ width: t.length * 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
    fillText() {},
    save() {},
    restore() {},
    scale() {},
  };
  const el = () => ({
    style: {},
    getContext: () => ctx2d,
    setAttribute() {},
    appendChild() {},
    addEventListener() {},
    removeEventListener() {},
    classList: { add() {}, remove() {} },
  });
  const noop = () => {};
  g.window = g;
  if (!(g.navigator as { userAgent?: string } | undefined)?.userAgent) {
    Object.defineProperty(g, "navigator", { value: { userAgent: "node", platform: "node" }, configurable: true });
  }
  g.document = {
    createElement: el,
    createElementNS: el,
    body: el(),
    head: el(),
    documentElement: el(),
    fonts: { add: noop, check: () => true, load: async () => [], addEventListener: noop, status: "loaded" },
    addEventListener: noop,
    removeEventListener: noop,
    querySelector: () => null,
  };
  g.location = { origin: "http://localhost", href: "http://localhost/", protocol: "http:", host: "localhost", hostname: "localhost", search: "", hash: "", pathname: "/" };
  g.devicePixelRatio = 1;
  g.addEventListener = noop;
  g.removeEventListener = noop;
  g.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  g.requestAnimationFrame = (f: () => void) => setTimeout(f, 0);
  g.cancelAnimationFrame = clearTimeout;
  g.localStorage = { getItem: () => null, setItem: noop, removeItem: noop };
  g.FontFace = class {
    constructor(public family: string) {}
    load() {
      return Promise.resolve(this);
    }
  };
  for (const name of ["HTMLElement", "Element", "Node", "HTMLCanvasElement", "Image"]) g[name] = class {};
  g.DOMParser = class {
    parseFromString() {
      return g.document;
    }
  };
}

async function loadBundle<T>(source: string, resolveDir: string, outDir: string, name: string): Promise<T> {
  const result = await build({
    stdin: { contents: source, resolveDir, loader: "js" },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "error",
    loader: { ".css": "empty", ".woff2": "empty", ".ttf": "empty" },
    define: { "process.env.NODE_ENV": '"production"', "import.meta.env": "{}" },
    banner: { js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);' },
  });
  const file = path.join(outDir, `${name}.mjs`);
  writeFileSync(file, result.outputFiles[0].text);
  return (await import(pathToFileURL(file).href)) as T;
}

// ---------------------------------------------------------------------------
// 1. keyBetween against fractional-indexing

function checkKeyBetween(real: FracIndexing) {
  const same = (a: string | null, b: string | null) => {
    const mine = keyBetween(a, b);
    const theirs = real.generateKeyBetween(a, b);
    if (mine !== theirs) fail(`keyBetween(${a}, ${b}) = ${mine}, fractional-indexing says ${theirs}`);
    return theirs;
  };
  let last: string | null = null;
  for (let i = 0; i < 2000; i++) last = same(last, null);
  let first: string | null = null;
  for (let i = 0; i < 500; i++) first = same(null, first);

  // Random in-betweens from a seeded generator, so a failure repeats.
  let state = 42;
  const random = () => ((state = (Math.imul(state, 1103515245) + 12345) >>> 0) / 2 ** 32);
  const keys: string[] = [same(null, null)];
  for (let i = 0; i < 3000; i++) {
    const at = Math.floor(random() * (keys.length + 1));
    const key = same(keys[at - 1] ?? null, keys[at] ?? null);
    keys.splice(at, 0, key);
  }
  for (let i = 1; i < keys.length; i++) if (!(keys[i - 1] < keys[i])) fail(`keys out of order at ${i}`);
  console.log(`keyBetween: ${2000 + 500 + 3001} keys equal to fractional-indexing`);
}

// ---------------------------------------------------------------------------
// 2. Notes on a real canvas survive restoreElements

const stamp = (els: El[]): El[] => els.map((el) => ({ ...el, customData: { ...(el.customData ?? {}), createdBy: OWNER, updatedBy: OWNER } }));

/** The board as whiteboard_merge_elements stores it: JSON, ordered by index in byte order, then id. */
const stored = (els: El[]): El[] =>
  (JSON.parse(JSON.stringify(els)) as El[]).sort((a, b) => {
    const ai = a.index ?? "￿";
    const bi = b.index ?? "￿";
    return ai < bi ? -1 : ai > bi ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

function checkIndices(els: El[], label: string) {
  const byId = new Map(els.map((el) => [el.id, el]));
  els.forEach((el, i) => {
    if (!isValidIndex(el.index)) fail(`${label}: ${el.id} has an invalid index ${el.index}`);
    if (i > 0 && !((els[i - 1].index as string) < (el.index as string))) fail(`${label}: index not increasing at ${el.id}`);
    const container = typeof el.containerId === "string" ? byId.get(el.containerId) : undefined;
    if (container && !((container.index as string) < (el.index as string))) fail(`${label}: bound text ${el.id} is not above its container`);
  });
}

function checkRoundTrip(ex: Excalidraw): Note {
  const canvas = stamp(ex.restoreElements(ex.convertToExcalidrawElements(projectCanvasSkeleton("x")), null));
  checkIndices(canvas, "canvas from the editor");
  const frame = canvas.find((el) => el.type === "frame")!;
  const zone = canvas.find((el) => el.customData?.zone === "test")! as El & { x: number; y: number; width: number; height: number };

  let board = [...canvas];
  const notes: Note[] = [];
  for (let i = 0; i < 12; i++) {
    const note = buildNote({
      entryId: `spike-${i}`,
      kind: "test",
      text: i === 0 ? "x" : `tester ${i}\n${"ลองใช้แล้วชอบ ".repeat(i)}`,
      frameId: frame.id,
      zoneBox: zone,
      obstacles: board.filter((el) => isPlacementObstacle(el as never)) as never,
      afterIndex: lastIndex(board),
      ownerId: OWNER,
      now: 1_790_000_000_000 + i,
    });
    notes.push(note);
    board.push(...(note as unknown as El[]));
  }
  // An edit rewrites note 3 in place; note 5 is removed.
  const edited = rewriteNote(notes[3], "edited", 1_790_000_100_000);
  const gone = notes[5].map((el) => buildTombstone(el, 1_790_000_200_000));
  const replace = new Map<string, El>([...edited, ...gone].map((el) => [el.id, el as unknown as El]));
  board = board.map((el) => replace.get(el.id) ?? el);

  const saved = stored(board);
  checkIndices(saved, "stored board");
  const restored = ex.restoreElements(saved, null);
  if (restored.map((el) => el.id).join() !== saved.map((el) => el.id).join()) fail("restoreElements changed the element order");
  const back = new Map(restored.map((el) => [el.id, el]));
  let compared = 0;
  for (const el of saved.filter((e) => e.id.startsWith("el-"))) {
    const after = back.get(el.id);
    if (!after) {
      fail(`restoreElements dropped ${el.id}`);
      continue;
    }
    compared++;
    if (!isDeepStrictEqual(JSON.parse(JSON.stringify(after)), el)) {
      const keys = new Set([...Object.keys(el), ...Object.keys(after)]);
      const diff = [...keys].filter((k) => !isDeepStrictEqual((after as El)[k], el[k]));
      fail(`restoreElements changed ${el.id}: ${diff.map((k) => `${k} ${JSON.stringify(el[k])} -> ${JSON.stringify((after as El)[k])}`).join("; ")}`);
    }
  }
  for (const el of saved) {
    if (back.get(el.id)?.index !== el.index) fail(`restoreElements re-indexed ${el.id}: ${el.index} -> ${back.get(el.id)?.index}`);
  }
  checkIndices(restored, "restored board");
  console.log(`round trip: ${compared} note elements (12 notes, 1 rewritten, 1 deleted) unchanged on a ${saved.length}-element board`);
  return notes[0];
}

// ---------------------------------------------------------------------------
// 3. Same fields as a note the editor makes

const shape = (el: Record<string, unknown>) =>
  Object.fromEntries(
    Object.keys(el)
      .sort()
      .map((k) => [k, el[k] === null ? "null" : Array.isArray(el[k]) ? "array" : typeof el[k]]),
  );

function editorNote(ex: Excalidraw): El[] {
  const canvas = stamp(ex.restoreElements(ex.convertToExcalidrawElements(projectCanvasSkeleton("x")), null));
  const frame = canvas.find((el) => el.type === "frame")!;
  const made = ex.convertToExcalidrawElements([shiftCardSkeleton("test", 400, 1200)]).map((el) => ({ ...el, frameId: frame.id }));
  const [rect, text] = stamp(ex.restoreElements([...canvas, ...made], null).slice(canvas.length));
  // Placeholders for everything that could identify a board or a person.
  return [
    { ...rect, id: "fixture-note", frameId: "fixture-frame", boundElements: [{ type: "text", id: "fixture-note-text" }] },
    { ...text, id: "fixture-note-text", frameId: "fixture-frame", containerId: "fixture-note", text: "x", originalText: "x" },
  ];
}

function checkFields(ex: Excalidraw, note: Note, writeFixture: boolean) {
  const [rect, text] = editorNote(ex);
  if (writeFixture) {
    const fixture = {
      about:
        "A SHIFT 'test' note as the whiteboard editor makes and saves it (shiftCardSkeleton through Excalidraw 0.18.1's convertToExcalidrawElements and restoreElements, authors stamped as the save API does). Text replaced by 'x', ids and authors by placeholders. Written by scripts/elemental/excalidraw-roundtrip.ts --write-fixture.",
      elements: [rect, text],
    };
    writeFileSync(FIXTURE, JSON.stringify(fixture, null, 2) + "\n");
    console.log(`wrote ${path.relative(ROOT, FIXTURE)}`);
  }
  const saved = JSON.parse(readFileSync(FIXTURE, "utf8")) as { elements: El[] };
  const pairs: [string, Record<string, unknown>, Record<string, unknown>][] = [
    ["rectangle vs the editor", note[0], rect],
    ["text vs the editor", note[1], text],
    ["rectangle vs the fixture", note[0], saved.elements[0]],
    ["text vs the fixture", note[1], saved.elements[1]],
  ];
  for (const [label, ours, theirs] of pairs) {
    if (!isDeepStrictEqual(shape(ours), shape(theirs))) fail(`${label}: fields differ\n  ours   ${JSON.stringify(shape(ours))}\n  theirs ${JSON.stringify(shape(theirs))}`);
  }
  console.log("fields: rectangle and text match the editor's note and the fixture");
}

// ---------------------------------------------------------------------------

async function main() {
  const writeFixture = process.argv.includes("--write-fixture");
  installDomShim();
  const outDir = mkdtempSync(path.join(tmpdir(), "elemental-excalidraw-"));
  const excalidrawDir = realpathSync(path.join(ROOT, "node_modules/@excalidraw/excalidraw"));
  const ex = await loadBundle<Excalidraw>('export { convertToExcalidrawElements, restoreElements } from "@excalidraw/excalidraw";', ROOT, outDir, "excalidraw");
  // fractional-indexing is Excalidraw's own dependency, resolved from its folder (pnpm keeps it there).
  const fi = await loadBundle<FracIndexing>('export { generateKeyBetween } from "fractional-indexing";', excalidrawDir, outDir, "fractional-indexing");

  rmSync(outDir, { recursive: true, force: true });

  checkKeyBetween(fi);
  const note = checkRoundTrip(ex);
  checkFields(ex, note, writeFixture);

  if (failures.length) {
    console.error(`\nFAILED (${failures.length}):\n- ${failures.slice(0, 40).join("\n- ")}`);
    process.exit(1);
  }
  console.log("\nOK: Elemental notes round-trip through Excalidraw unchanged, with valid indices.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
