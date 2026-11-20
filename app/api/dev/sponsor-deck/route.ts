import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";

import { applyDeckEdits, MAX_EDITS, MAX_LENGTH, type DeckEdit } from "@/components/hackathon/elemental/sponsor/deck-edits";

/**
 * Saves text typed in the sponsor deck's edit mode into SponsorDeck.tsx.
 * Only on `next dev` and only from this computer: everywhere else it's a 404,
 * so the live site can never write files. Changes still go through a pull
 * request like any other code.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE = path.join(process.cwd(), "components/hackathon/elemental/sponsor/SponsorDeck.tsx");
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function hostname(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value.includes("://") ? value : `http://${value}`).hostname;
  } catch {
    return null;
  }
}

/** next dev listens on every network interface: refuse anyone but this machine. */
function fromThisComputer(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  const host = hostname(req.headers.get("host"));
  if (!host || !LOCAL_HOSTS.has(host)) return false;
  const origin = req.headers.get("origin");
  return origin === null || LOCAL_HOSTS.has(hostname(origin) ?? "");
}

function isEdit(x: unknown): x is DeckEdit {
  if (!x || typeof x !== "object") return false;
  const e = x as Record<string, unknown>;
  return (
    (e.kind === "text" || e.kind === "fill") &&
    typeof e.before === "string" &&
    typeof e.after === "string" &&
    e.before.length <= MAX_LENGTH &&
    e.after.length <= MAX_LENGTH &&
    Number.isInteger(e.nth) &&
    (e.nth as number) >= 0
  );
}

export async function POST(req: NextRequest) {
  if (!fromThisComputer(req)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json().catch(() => null)) as { edits?: unknown } | null;
  const edits = body?.edits;
  if (!Array.isArray(edits) || edits.length > MAX_EDITS || !edits.every(isEdit)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const src = await fs.readFile(FILE, "utf8");
  const { text, results } = applyDeckEdits(src, edits);
  if (text !== src) await fs.writeFile(FILE, text);
  return NextResponse.json({ results });
}
