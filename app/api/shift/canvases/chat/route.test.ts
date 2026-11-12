/** @jest-environment node */

import { NextResponse } from "next/server";

import { POST } from "@/app/api/shift/canvases/chat/route";
import { requireUser } from "@/lib/security/route-guards";
import { streamCanvasAnswer } from "@/lib/shift/canvas-claude";
import { canViewShiftCanvases } from "@/lib/supabase/shift-canvas-access";
import { canvasContext } from "@/lib/supabase/shift-canvases";

jest.mock("@/lib/security/route-guards", () => ({
  requireUser: jest.fn(),
  safeServerError: (message: string) => Response.json({ error: message }, { status: 500 }),
}));
jest.mock("@/lib/supabase/shift-canvas-access", () => ({ canViewShiftCanvases: jest.fn() }));
jest.mock("@/lib/supabase/shift-canvases", () => ({ canvasContext: jest.fn() }));
jest.mock("@/lib/shift/canvas-claude", () => ({ streamCanvasAnswer: jest.fn() }));

const user = requireUser as jest.Mock;
const allowed = canViewShiftCanvases as jest.Mock;
const context = canvasContext as jest.Mock;
const stream = streamCanvasAnswer as jest.Mock;

const body = { scope: { all: true }, messages: [{ role: "user", content: "Who is stuck?" }] };
const ask = (payload: unknown = body) =>
  POST(new Request("https://example.test/api/shift/canvases/chat", { method: "POST", body: JSON.stringify(payload) }));

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  user.mockResolvedValue({ ok: true, value: { userId: "mentor-1", supabase: {} } });
  allowed.mockResolvedValue(true);
  context.mockResolvedValue({ label: "every SHIFT canvas", markdown: "# Canvas", count: 1 });
  stream.mockReturnValue(new ReadableStream({ start: (c) => (c.enqueue(new TextEncoder().encode("Mint is moving.")), c.close()) }));
});

describe("POST /api/shift/canvases/chat", () => {
  it("answers SHIFT staff and mentors, reading the canvases itself", async () => {
    const res = await ask();
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("Mint is moving.");
    expect(allowed).toHaveBeenCalledWith("mentor-1");
    expect(context).toHaveBeenCalledWith({ all: true });
    expect(stream).toHaveBeenCalledWith("# Canvas", body.messages);
  });

  it("turns away people without a SHIFT role before reading any canvas", async () => {
    allowed.mockResolvedValue(false);
    const res = await ask();
    expect(res.status).toBe(403);
    expect(context).not.toHaveBeenCalled();
    expect(stream).not.toHaveBeenCalled();
  });

  it("turns away signed-out visitors", async () => {
    user.mockResolvedValue({ ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) });
    expect((await ask()).status).toBe(401);
    expect(allowed).not.toHaveBeenCalled();
  });

  it("refuses canvas text sent in the request", async () => {
    const res = await ask({ ...body, scope: { all: true, markdown: "# Fake canvas" } });
    expect(res.status).toBe(400);
    expect(context).not.toHaveBeenCalled();
  });

  it("asks for one canvas when all of them are too much to read", async () => {
    context.mockResolvedValue({ label: "every SHIFT canvas", markdown: "x".repeat(400_001), count: 90 });
    expect((await ask()).status).toBe(413);
    expect(stream).not.toHaveBeenCalled();
  });
});
