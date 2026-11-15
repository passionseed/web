/** @jest-environment node */
import { QuestError } from "@/bot/src/quests/api";

const call = jest.fn();
const resolveIslandViewer = jest.fn();
const refresh = jest.fn();
const signedPhotos = jest.fn();

jest.mock("next/cache", () => ({ refresh: () => refresh() }));
jest.mock("@/lib/supabase/shift-quests/db", () => ({
  questApi: () => ({ call, rows: jest.fn() }),
}));
jest.mock("@/lib/supabase/shift-quests/viewer", () => ({
  resolveIslandViewer: () => resolveIslandViewer(),
}));
jest.mock("@/lib/supabase/shift-quests/evidence", () => {
  const actual = jest.requireActual<typeof import("@/lib/supabase/shift-quests/evidence")>("@/lib/supabase/shift-quests/evidence");
  return { photoRows: actual.photoRows, signedPhotos: (...args: unknown[]) => signedPhotos(...args) };
});
jest.mock("sharp", () => jest.fn());
jest.mock("@/utils/supabase/admin", () => ({ createAdminClient: jest.fn() }));

import { hidePeerCheck, loadPeerCheck, loadPeerChecks, loadPeerQueue, sendPeerCheck, setPeerOpen } from "../peer-actions";

const ACTOR = "123456789012345678";
const USER = "0b7f4a52-5c1e-4c9b-9f27-6f0f3c1d2e3a";
const SUB = "33333333-3333-4333-8333-333333333333";
const INSTANCE = "55555555-5555-4555-8555-555555555555";
const CHECK = "77777777-7777-4777-8777-777777777777";
const me = { name: "Mint", avatarUrl: null, staff: false };
const ready = { state: "ready", me, actor: ACTOR, userId: USER, session: { onboarded: true, roles: [], unread: 0 } };

function db(answers: Record<string, unknown>) {
  call.mockImplementation(async (fn: string) => {
    if (!(fn in answers)) throw new Error(`unexpected call ${fn}`);
    const answer = answers[fn];
    if (answer instanceof Error) throw answer;
    return answer;
  });
}

beforeEach(() => {
  call.mockReset();
  refresh.mockReset();
  signedPhotos.mockReset().mockImplementation(async (rows: { id: string; width: number; height: number }[]) =>
    rows.map((r) => ({ id: r.id, url: `https://signed/${r.id}`, width: r.width, height: r.height })),
  );
  resolveIslandViewer.mockResolvedValue(ready);
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => jest.restoreAllMocks());

describe("the peer's side", () => {
  it("reads the queue as names-free items, and none on an older database", async () => {
    db({
      shift_quest_schema_version: 15,
      shift_quest_peer_queue: [{ submission_id: SUB, title: "เจอคนจริงคนแรก", revision: 1, created_at: "t", photos: 2, checks: 0 }, { x: 1 }],
    });
    await expect(loadPeerQueue()).resolves.toEqual({
      ok: true,
      data: [{ submissionId: SUB, title: "เจอคนจริงคนแรก", revision: 1, createdAt: "t", photos: 2, checks: 0 }],
    });
    expect(call).toHaveBeenCalledWith("shift_quest_peer_queue", ACTOR);
    call.mockReset();
    db({ shift_quest_schema_version: 14 });
    await expect(loadPeerQueue()).resolves.toEqual({ ok: true, data: [] });
  });

  it("opens one submission with its photos signed and no paths", async () => {
    db({
      shift_quest_schema_version: 15,
      shift_quest_peer_view: {
        submission_id: SUB, revision: 1, status: "pending", title: "t", goal: "g", criteria: "c", kind: "main",
        slug: "meet-one-real-person", milestone: 1, evidence: "e", reflection: "r", artifact_url: null,
        photos: [{ id: "p1", path: `${SUB}/p1.webp`, width: 10, height: 10 }], can_check: true, mine: null,
      },
    });
    const result = await loadPeerCheck({ submissionId: SUB });
    expect(result).toMatchObject({ ok: true, data: { submissionId: SUB, kind: "main", canCheck: true, mine: null } });
    expect(JSON.stringify(result)).not.toContain(".webp");
  });

  it("sends a check, and passes the database's refusals through in Thai", async () => {
    db({ shift_quest_schema_version: 15, shift_quest_peer_check: { id: CHECK } });
    await expect(sendPeerCheck({ submissionId: SUB, ticked: ["m1-target"], line: "  ดีมาก  " })).resolves.toEqual({
      ok: true,
      data: { id: CHECK },
    });
    expect(call).toHaveBeenCalledWith("shift_quest_peer_check", ACTOR, SUB, ["m1-target"], "ดีมาก");
    expect(refresh).not.toHaveBeenCalled();
    call.mockReset();
    db({ shift_quest_schema_version: 15, shift_quest_peer_check: new QuestError("peer_limit") });
    const limited = await sendPeerCheck({ submissionId: SUB, ticked: [], line: "x" });
    expect(limited).toMatchObject({ ok: false, code: "peer_limit" });
    expect(limited.ok ? "" : limited.error).toContain("10");
  });

  it("refuses bad ticks, an empty line or a long one before the database", async () => {
    for (const input of [
      { submissionId: SUB, ticked: ["M1"], line: "x" },
      { submissionId: SUB, ticked: Array.from({ length: 11 }, (_, i) => `c${i}`), line: "x" },
      { submissionId: SUB, ticked: [], line: "   " },
      { submissionId: SUB, ticked: [], line: "ก".repeat(281) },
    ]) {
      expect(await sendPeerCheck(input)).toMatchObject({ ok: false, code: "invalid_input" });
    }
    expect(call).not.toHaveBeenCalled();
  });
});

describe("the submitter's side", () => {
  it("opens the work to peers after a send", async () => {
    db({ shift_quest_schema_version: 15, shift_quest_peer_open: { peer_open: true } });
    await expect(setPeerOpen({ submissionId: SUB, open: true })).resolves.toEqual({ ok: true, data: { open: true } });
    expect(call).toHaveBeenCalledWith("shift_quest_peer_open", ACTOR, SUB, true);
  });

  it("reads the checks for the quest page", async () => {
    db({
      shift_quest_schema_version: 15,
      shift_quest_peer_list: {
        submission_id: SUB, revision: 1, peer_open: true,
        checks: [{ id: CHECK, peer: null, ticked: ["m1-target"], line: "ดี", created_at: "t", hidden: false }],
      },
    });
    await expect(loadPeerChecks({ instanceId: INSTANCE })).resolves.toEqual({
      ok: true,
      data: { submissionId: SUB, revision: 1, peerOpen: true, checks: [{ id: CHECK, peer: null, ticked: ["m1-target"], line: "ดี", createdAt: "t", hidden: false }] },
    });
  });
});

describe("hidePeerCheck (mentors)", () => {
  it("lets a reviewer who never ran /start hide a check, and refreshes the review page", async () => {
    resolveIslandViewer.mockResolvedValue({ state: "not_started", me: { ...me, staff: true }, actor: ACTOR, userId: USER });
    db({ shift_quest_peer_hide: { hidden: true } });
    await expect(hidePeerCheck({ checkId: CHECK, hide: true })).resolves.toEqual({ ok: true, data: { hidden: true } });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("shows the database's refusal to a student, and refuses the signed-out", async () => {
    db({ shift_quest_peer_hide: new QuestError("not_authorized") });
    expect(await hidePeerCheck({ checkId: CHECK, hide: true })).toMatchObject({ ok: false, code: "not_authorized" });
    resolveIslandViewer.mockResolvedValue({ state: "signed_out" });
    expect(await hidePeerCheck({ checkId: CHECK, hide: true })).toMatchObject({ ok: false, code: "not_authorized" });
    expect(await hidePeerCheck({ checkId: "x", hide: true })).toMatchObject({ ok: false, code: "invalid_input" });
  });
});
