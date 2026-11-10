/** @jest-environment node */

import { POST } from "@/app/api/shift/canvases/tracker-note/route";
import { requireUser } from "@/lib/security/route-guards";
import { canViewShiftCanvases } from "@/lib/supabase/shift-canvas-access";
import { readShiftCanvas } from "@/lib/supabase/shift-canvases";
import { saveTrackerNotes } from "@/lib/supabase/shift-tracker-notes";

jest.mock("@/lib/security/route-guards", () => ({
  requireUser: jest.fn(),
  safeServerError: (message: string) => Response.json({ error: message }, { status: 500 }),
}));
jest.mock("@/lib/supabase/shift-canvas-access", () => ({ canViewShiftCanvases: jest.fn() }));
jest.mock("@/lib/supabase/shift-canvases", () => ({ readShiftCanvas: jest.fn() }));
jest.mock("@/lib/supabase/shift-tracker-notes", () => ({ saveTrackerNotes: jest.fn() }));

const user = requireUser as jest.Mock;
const allowed = canViewShiftCanvases as jest.Mock;
const read = readShiftCanvas as jest.Mock;
const save = saveTrackerNotes as jest.Mock;

const BOARD = "a7a510a6-1f7d-4228-b23f-5e15a57acb2e";
const person = (userId: string) => ({ userId, name: userId, nickname: null, avatarUrl: null, discord: null });
const body = { boardId: BOARD, frameId: "fa", answer: "Mint has one interview and no tests yet." };
const post = (payload: unknown = body) =>
  POST(new Request("https://example.test/api/shift/canvases/tracker-note", { method: "POST", body: JSON.stringify(payload) }));

beforeEach(() => {
  user.mockResolvedValue({ ok: true, value: { userId: "mentor-1", supabase: {} } });
  allowed.mockResolvedValue(true);
  read.mockResolvedValue({ row: { title: "โปรเจกต์ · Mint", ownerPerson: person("mint"), team: [person("ploy")] }, markdown: "" });
  save.mockResolvedValue(["Mint Srisuk", "Ploy"]);
});

describe("POST /api/shift/canvases/tracker-note", () => {
  it("saves the answer for everyone on the canvas, as the person saving it", async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, saved: ["Mint Srisuk", "Ploy"] });
    expect(read).toHaveBeenCalledWith(BOARD, "fa");
    const [ids, note, by] = save.mock.calls[0];
    expect(ids).toEqual(["mint", "ploy"]);
    expect(note).toContain('Claude summary of the SHIFT canvas "โปรเจกต์ · Mint"');
    expect(note).toContain(body.answer);
    expect(by).toBe("mentor-1");
  });

  it("turns away people without a SHIFT role", async () => {
    allowed.mockResolvedValue(false);
    expect((await post()).status).toBe(403);
    expect(save).not.toHaveBeenCalled();
  });

  it("takes the students from the canvas, never from the request", async () => {
    expect((await post({ ...body, userIds: ["someone-else"] })).status).toBe(400);
    expect(save).not.toHaveBeenCalled();
  });

  it("says so when the canvas is gone or nobody on it is in the Tracker", async () => {
    read.mockResolvedValueOnce(null);
    expect((await post()).status).toBe(404);
    save.mockResolvedValueOnce([]);
    const res = await post();
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/Tracker/);
  });
});
