/**
 * One set of cases for both copies of the SHIFT canvas rule: the TypeScript
 * one (canvas-trust.test.ts) and Postgres's whiteboard_merge_elements, run
 * against the real migrations by `pnpm test:whiteboard-sql`
 * (scripts/whiteboard-sql-check.ts). If the two copies drift apart, one of the
 * runs fails.
 *
 * Each case is a board as saved, one person's save, and what must come of it:
 * the ids left out, and customData fields of what is kept. `sqlOnly` holds
 * checks only the database can make, because only it knows who is on the
 * board, who started a project, and who wrote what.
 */

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export const PEOPLE = {
  owner: id(1),
  mate: id(2),
  other: id(3),
  /** The board's owner, a moderator. */
  staff: id(4),
  /** A site admin who is an editor on the board, a moderator. */
  admin: id(5),
  /** Signed in, but not on the board. */
  outsider: id(6),
} as const;
export type Person = keyof typeof PEOPLE;

export const BOARD_ID = "00000000-0000-4000-8000-0000000000b0";
export const BOARD_OWNER: Person = "staff";
export const BOARD_EDITORS: Person[] = ["owner", "mate", "other", "admin"];
export const SITE_ADMINS: Person[] = ["admin"];
export const isModerator = (p: Person) => p === BOARD_OWNER || SITE_ADMINS.includes(p);

export type CaseElement = {
  id: string;
  type: string;
  version: number;
  frameId?: string | null;
  containerId?: string | null;
  isDeleted?: boolean;
  customData?: Record<string, unknown> | null;
  [key: string]: unknown;
};

/** An ISO time `minutes` from now. Cases are built when they run, so "now" is close for both copies. */
const at = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();
/** In an expectation: any ISO time within five minutes of now. */
export const NOW = "<now>";
/** In an expectation: any value but this one. */
export const not = (value: unknown) => ({ $not: value });

export type TrustCase = {
  name: string;
  saved: CaseElement[];
  saver: Person;
  save: CaseElement[];
  dropped: string[];
  /** Ids Postgres leaves out where the browser cannot tell (it lets the save correct it). Defaults to `dropped`. */
  sqlDropped?: string[];
  expect?: Record<string, Record<string, unknown>>;
  sqlOnly?: Record<string, Record<string, unknown>>;
  /** Projects registered before the save, and checks on the registry after it (database only). */
  projects?: Record<string, Person>;
  projectsAfter?: Record<string, Person>;
};

const { owner, mate, other, outsider } = PEOPLE;
const v1 = { v: 1, text: "ปัญหาแรก", at: "2026-11-01T03:00:00.000Z", by: owner };

/** A canvas (F) owned by owner with mate on its team, holding a versioned note (N) and its text (T); loose things beside it. */
function board(): Record<string, CaseElement> {
  return {
    F: { id: "F", type: "frame", version: 3, customData: { project: "p1", owner, editors: [mate], createdBy: owner } },
    N: { id: "N", type: "rectangle", version: 2, frameId: "F", customData: { card: "problem", createdBy: owner, versions: [v1] } },
    T: { id: "T", type: "text", version: 2, frameId: "F", containerId: "N", text: "ปัญหาแรก", customData: { createdBy: owner } },
    L: { id: "L", type: "rectangle", version: 1, customData: { createdBy: other } },
    P: { id: "P", type: "frame", version: 1, customData: { createdBy: other } },
    Q: { id: "Q", type: "rectangle", version: 1, frameId: "P", customData: { createdBy: mate } },
    // A plain frame with only its creator's work inside, and one from before authors were recorded.
    P2: { id: "P2", type: "frame", version: 1, customData: { createdBy: other } },
    Q2: { id: "Q2", type: "rectangle", version: 1, frameId: "P2", customData: { createdBy: other } },
    R: { id: "R", type: "frame", version: 1 },
    // A sticky someone else nudged before its maker's save arrived.
    W2: { id: "W2", type: "rectangle", version: 2, customData: { createdBy: other, originalBy: mate } },
  };
}
const saved = () => Object.values(board());
const edit = (key: string, changes: Partial<CaseElement> = {}): CaseElement => {
  const el = board()[key];
  return { ...el, x: 10, ...changes, version: el.version + 1 };
};
const fresh = (customData: Record<string, unknown>, changes: Partial<CaseElement> = {}): CaseElement => ({
  id: "G",
  type: "frame",
  version: 1,
  ...changes,
  customData,
});

export function trustCases(): TrustCase[] {
  return [
    // Who may change a canvas.
    { name: "a teammate edits a note on the canvas", saved: saved(), saver: "mate", save: [edit("N")], dropped: [] },
    { name: "the board's owner edits any canvas", saved: saved(), saver: "staff", save: [edit("N")], dropped: [] },
    { name: "a site admin on the board edits any canvas", saved: saved(), saver: "admin", save: [edit("N")], dropped: [] },
    { name: "someone else cannot edit a note on the canvas", saved: saved(), saver: "other", save: [edit("N")], dropped: ["N"] },
    { name: "someone else cannot edit the note's text", saved: saved(), saver: "other", save: [edit("T", { text: "x" })], dropped: ["T"] },
    { name: "someone else cannot move a note out first", saved: saved(), saver: "other", save: [edit("N", { frameId: null })], dropped: ["N"] },
    {
      name: "someone else cannot unhook the text from its note",
      saved: saved(),
      saver: "other",
      save: [edit("T", { frameId: null, containerId: null })],
      dropped: ["T"],
    },
    {
      name: "someone else cannot put something into the canvas",
      saved: saved(),
      saver: "other",
      save: [{ id: "X", type: "rectangle", version: 1, frameId: "F" }],
      dropped: ["X"],
    },
    {
      name: "someone else cannot write into a note on the canvas",
      saved: saved(),
      saver: "other",
      save: [{ id: "X", type: "text", version: 1, containerId: "N", text: "hi" }],
      dropped: ["X"],
    },
    {
      name: "someone else cannot overwrite the canvas as another type",
      saved: saved(),
      saver: "other",
      save: [{ id: "F", type: "rectangle", version: 9, isDeleted: true }],
      dropped: ["F"],
    },
    { name: "the rest of the board stays open to everyone", saved: saved(), saver: "other", save: [edit("L")], dropped: [] },

    // Teammates and the canvas frame.
    { name: "a teammate renames and moves the canvas", saved: saved(), saver: "mate", save: [edit("F", { name: "ใหม่" })], dropped: [] },
    { name: "a teammate cannot delete the canvas", saved: saved(), saver: "mate", save: [edit("F", { isDeleted: true })], dropped: ["F"] },
    {
      name: "a teammate cannot untag the canvas",
      saved: saved(),
      saver: "mate",
      save: [edit("F", { customData: { owner, editors: [mate] } })],
      dropped: ["F"],
    },
    {
      name: "a teammate cannot change the team or the owner",
      saved: saved(),
      saver: "mate",
      save: [edit("F", { customData: { project: "p1", owner: mate, editors: [mate, other] } })],
      dropped: [],
      expect: { F: { owner, editors: [mate] } },
    },
    {
      name: "a deleted canvas stays its owner's",
      saved: saved().map((el) => (el.id === "F" ? { ...el, isDeleted: true } : el)),
      saver: "mate",
      save: [{ ...board().F, version: 4, isDeleted: false, customData: { project: "p1", owner: mate, editors: [] } }],
      dropped: ["F"],
    },

    // Handing a canvas over.
    {
      name: "the owner hands the canvas to a teammate, and the project goes with it",
      saved: saved(),
      saver: "owner",
      save: [edit("F", { customData: { project: "p1", owner: mate, editors: [owner] } })],
      dropped: [],
      expect: { F: { owner: mate, editors: [owner] } },
      projects: { p1: "owner" },
      projectsAfter: { p1: "mate" },
    },
    {
      name: "the board's owner hands a canvas over, but not its project",
      saved: saved(),
      saver: "staff",
      save: [edit("F", { customData: { project: "p1", owner: other, editors: [mate] } })],
      dropped: [],
      expect: { F: { owner: other, editors: [mate] } },
      projects: { p1: "owner" },
      projectsAfter: { p1: "owner" },
    },
    {
      name: "a site admin hands a canvas over with its project",
      saved: saved(),
      saver: "admin",
      save: [edit("F", { customData: { project: "p1", owner: other, editors: [mate] } })],
      dropped: [],
      expect: { F: { owner: other } },
      projects: { p1: "owner" },
      projectsAfter: { p1: "other" },
    },
    {
      name: "a canvas cannot go to someone who is not on the board",
      saved: saved(),
      saver: "owner",
      save: [edit("F", { customData: { project: "p1", owner: outsider, editors: [mate] } })],
      dropped: [],
      sqlOnly: { F: { owner, editors: [mate] } },
    },
    {
      name: "teammates must be on the board",
      saved: saved(),
      saver: "owner",
      save: [edit("F", { customData: { project: "p1", owner, editors: [outsider, other, mate, other] } })],
      dropped: [],
      expect: { F: { owner } },
      sqlOnly: { F: { editors: [mate, other] } },
    },

    // New canvases and project ids.
    {
      name: "a new canvas belongs to whoever saves it, whatever it claims",
      saved: saved(),
      saver: "other",
      save: [fresh({ project: "p-new", owner, editors: [mate] })],
      dropped: [],
      expect: { G: { owner: other, editors: [mate], project: "p-new" } },
      projectsAfter: { "p-new": "other" },
    },
    {
      name: "someone else's copy of a project becomes a new project",
      saved: saved(),
      saver: "other",
      save: [fresh({ project: "p1", owner, editors: [] })],
      dropped: [],
      expect: { G: { owner: other } },
      sqlOnly: { G: { project: not("p1") } },
      projects: { p1: "owner" },
      projectsAfter: { p1: "owner" },
    },
    {
      name: "the person who started a project continues it on another board",
      saved: saved(),
      saver: "owner",
      save: [fresh({ project: "p1", owner, editors: [mate] })],
      dropped: [],
      expect: { G: { owner, project: "p1" } },
      projects: { p1: "owner" },
    },
    {
      name: "a site admin's copy of a project stays its starter's",
      saved: saved(),
      saver: "admin",
      save: [fresh({ project: "p1", owner, editors: [] })],
      dropped: [],
      sqlOnly: { G: { owner, project: "p1" } },
      projects: { p1: "owner" },
    },
    {
      // Anyone owns the boards they make or duplicate, so owning a board must not reach other boards' projects.
      name: "a board's owner cannot take a project over by copying it onto their board",
      saved: saved(),
      saver: "staff",
      save: [fresh({ project: "p1", owner, editors: [] })],
      dropped: [],
      expect: { G: { owner: PEOPLE.staff } },
      sqlOnly: { G: { project: not("p1") } },
      projects: { p1: "owner" },
      projectsAfter: { p1: "owner" },
    },
    {
      name: "only its creator turns a plain frame into a canvas",
      saved: saved(),
      saver: "mate",
      save: [edit("P2", { customData: { project: "p9", createdBy: other } })],
      dropped: ["P2"],
    },
    {
      name: "its creator cannot make a frame a canvas while someone else's work is inside",
      saved: saved(),
      saver: "other",
      save: [edit("P", { customData: { project: "p9", createdBy: other } })],
      dropped: ["P"],
    },
    {
      name: "the creator of a plain frame with only their work inside may make it a canvas",
      saved: saved(),
      saver: "other",
      save: [edit("P2", { customData: { project: "p9", createdBy: other } })],
      dropped: [],
      expect: { P2: { owner: other, project: "p9" } },
    },
    {
      name: "a frame from before authors were recorded becomes a canvas only by a moderator",
      saved: saved(),
      saver: "other",
      save: [edit("R", { customData: { project: "p9" } })],
      dropped: [],
      sqlDropped: ["R"],
    },
    { name: "a moderator may make any frame a canvas", saved: saved(), saver: "staff", save: [edit("P", { customData: { project: "p9" } })], dropped: [] },

    // Versions of elements.
    {
      name: "one save cannot push an element's version out of reach",
      saved: saved(),
      saver: "other",
      save: [{ ...board().L, version: 1 + 1_000_001 }],
      dropped: ["L"],
    },
    { name: "a big but possible version jump is fine", saved: saved(), saver: "other", save: [{ ...board().L, version: 1 + 1_000_000 }], dropped: [] },

    // Note versions.
    {
      name: "versions cannot be removed",
      saved: saved(),
      saver: "mate",
      save: [edit("N", { customData: { card: "problem", createdBy: owner, versions: [] } })],
      dropped: [],
      expect: { N: { versions: [v1] } },
    },
    {
      name: "an old version cannot be rewritten",
      saved: saved(),
      saver: "mate",
      save: [edit("N", { customData: { card: "problem", createdBy: owner, versions: [{ ...v1, text: "แก้ประวัติ", by: mate }] } })],
      dropped: [],
      expect: { N: { versions: [v1] } },
    },
    {
      name: "a new version is by whoever saves it",
      saved: saved(),
      saver: "mate",
      save: [edit("N", { customData: { card: "problem", createdBy: owner, versions: [v1, { v: 2, text: "ใหม่", at: at(0), by: other, why: "สัมภาษณ์" }] } })],
      dropped: [],
      expect: { N: { versions: [v1, { v: 2, text: "ใหม่", at: NOW, by: mate, why: "สัมภาษณ์" }] } },
    },
    {
      name: "a new version with an old time is dated now",
      saved: saved(),
      saver: "mate",
      save: [edit("N", { customData: { card: "problem", createdBy: owner, versions: [v1, { v: 2, text: "ใหม่", at: "2020-01-01T00:00:00.000Z", by: mate }] } })],
      dropped: [],
      expect: { N: { versions: [v1, { v: 2, text: "ใหม่", at: NOW, by: mate }] } },
    },
    {
      name: "a pasted note keeps its versions, marked copied unless the paster just wrote them",
      saved: saved(),
      saver: "other",
      save: [
        {
          id: "Z",
          type: "rectangle",
          version: 1,
          customData: { card: "idea", versions: [v1, { v: 2, text: "ของฉัน", at: at(-1), by: other }, { v: 3, text: "อนาคต", at: at(60), by: other }] },
        },
      ],
      dropped: [],
      expect: {
        Z: {
          versions: [
            { ...v1, copied: true },
            { v: 2, text: "ของฉัน", at: NOW, by: other },
            { v: 3, text: "อนาคต", at: not(null), by: other, copied: true },
          ],
        },
      },
    },

    // Authorship (database only: the browser does not set authors).
    {
      name: "an element keeps the author it was saved with",
      saved: saved(),
      saver: "other",
      save: [edit("Q", { customData: { createdBy: other } })],
      dropped: [],
      sqlOnly: { Q: { createdBy: mate, updatedBy: other } },
    },
    {
      name: "the person an element names as its maker takes it back with their own save",
      saved: saved(),
      saver: "mate",
      save: [edit("W2")],
      dropped: [],
      sqlOnly: { W2: { createdBy: mate, originalBy: undefined } },
    },
    {
      name: "anyone else's save leaves the named maker alone",
      saved: saved(),
      saver: "owner",
      save: [edit("W2", { customData: { createdBy: owner } })],
      dropped: [],
      sqlOnly: { W2: { createdBy: other, originalBy: mate } },
    },
    {
      name: "something new is by whoever saves it, and a pasted author is kept as originalBy",
      saved: saved(),
      saver: "other",
      save: [{ id: "W", type: "rectangle", version: 1, customData: { createdBy: mate } }],
      dropped: [],
      sqlOnly: { W: { createdBy: other, originalBy: mate } },
    },
  ];
}

/**
 * Whether `actual` matches `expected`: equal JSON (key order aside), where an
 * expected NOW matches an ISO time within five minutes of now and not(x)
 * matches anything but x. Returns a description of the first mismatch, or null.
 */
export function mismatch(actual: unknown, expected: unknown, path = "$"): string | null {
  if (expected === NOW) {
    const t = typeof actual === "string" ? Date.parse(actual) : NaN;
    return Math.abs(t - Date.now()) < 5 * 60_000 ? null : `${path}: expected a time near now, got ${JSON.stringify(actual)}`;
  }
  if (expected && typeof expected === "object" && "$not" in expected) {
    const banned = (expected as { $not: unknown }).$not;
    return actual !== undefined && mismatch(actual, banned, path) !== null ? null : `${path}: expected anything but ${JSON.stringify(banned)}`;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      return `${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
    }
    for (let i = 0; i < expected.length; i++) {
      const m = mismatch(actual[i], expected[i], `${path}[${i}]`);
      if (m) return m;
    }
    return null;
  }
  if (expected && typeof expected === "object") {
    if (!actual || typeof actual !== "object" || Array.isArray(actual)) return `${path}: expected an object, got ${JSON.stringify(actual)}`;
    const a = actual as Record<string, unknown>;
    const e = expected as Record<string, unknown>;
    const keys = new Set([...Object.keys(a), ...Object.keys(e)].filter((k) => a[k] !== undefined || e[k] !== undefined));
    for (const k of keys) {
      const m = mismatch(a[k], e[k], `${path}.${k}`);
      if (m) return m;
    }
    return null;
  }
  return actual === expected ? null : `${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
}

/** Checks `customData` fields of kept elements: every field named in `checks` must match. */
export function checkFields(
  kept: ReadonlyMap<string, { customData?: Record<string, unknown> | null }>,
  checks: Record<string, Record<string, unknown>> | undefined,
): string[] {
  const problems: string[] = [];
  for (const [elementId, fields] of Object.entries(checks ?? {})) {
    const el = kept.get(elementId);
    if (!el) {
      problems.push(`${elementId}: not kept`);
      continue;
    }
    for (const [field, value] of Object.entries(fields)) {
      const m = mismatch(el.customData?.[field], value, `${elementId}.customData.${field}`);
      if (m) problems.push(m);
    }
  }
  return problems;
}
