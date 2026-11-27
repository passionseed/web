/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

const getShareContext = jest.fn();
const saveStoryProof = jest.fn();
const checkRateLimit = jest.fn();
const shareOpen = jest.fn();

jest.mock("@/lib/supabase/hackathon-share-links", () => ({ getShareContext: (...a: unknown[]) => getShareContext(...a) }));
jest.mock("@/lib/supabase/hackathon-story-proofs", () => ({ saveStoryProof: (...a: unknown[]) => saveStoryProof(...a) }));
jest.mock("@/lib/expert-interview/rate-limiter", () => ({ checkRateLimit: (...a: unknown[]) => checkRateLimit(...a) }));
jest.mock("@/lib/hackathon/elemental/share", () => ({ ...jest.requireActual("@/lib/hackathon/elemental/share"), shareOpen: () => shareOpen() }));

import { POST } from "./route";

const TOKEN = "a".repeat(32);
const URL_ = `http://localhost/api/hackathon/elemental/${TOKEN}/story-proof`;

function upload(file: File | null, { origin = "http://localhost" }: { origin?: string | null } = {}) {
  const form = new FormData();
  if (file) form.append("proof", file);
  const headers: Record<string, string> = {};
  if (origin) headers.origin = origin;
  const req = new NextRequest(URL_, { method: "POST", body: form, headers });
  return POST(req, { params: Promise.resolve({ token: TOKEN }) });
}

const png = (size = 3) => new File([new Uint8Array(size)], "story.png", { type: "image/png" });

beforeEach(() => {
  jest.clearAllMocks();
  shareOpen.mockReturnValue(true);
  getShareContext.mockResolvedValue({ id: "reg-1", status: "pending", school: null, teamId: null });
  checkRateLimit.mockResolvedValue({ allowed: true, remaining: 5, resetAt: new Date() });
  saveStoryProof.mockResolvedValue(undefined);
});

it("stores the proof and says the team's styles are unlocked, without the image or its path", async () => {
  const res = await upload(png());
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ storyProof: "unlocked" });
  expect(saveStoryProof).toHaveBeenCalledWith("elemental-2026", "reg-1", expect.any(File), "png");
});

it("refuses another site", async () => {
  const res = await upload(png(), { origin: "https://evil.example" });
  expect(res.status).toBe(403);
  expect(saveStoryProof).not.toHaveBeenCalled();
});

it("404s an unknown pay token", async () => {
  getShareContext.mockResolvedValue(null);
  expect((await upload(png())).status).toBe(404);
});

it("refuses while sharing is closed, and for a cancelled sign-up", async () => {
  shareOpen.mockReturnValue(false);
  let res = await upload(png());
  expect(res.status).toBe(409);
  expect(await res.json()).toEqual({ error: "closed" });

  shareOpen.mockReturnValue(true);
  getShareContext.mockResolvedValue({ id: "reg-1", status: "cancelled", school: null, teamId: null });
  res = await upload(png());
  expect(res.status).toBe(409);
  expect(await res.json()).toEqual({ error: "cancelled" });
  expect(saveStoryProof).not.toHaveBeenCalled();
});

it("refuses a missing file and a wrong type", async () => {
  let res = await upload(null);
  expect(res.status).toBe(400);
  expect(await res.json()).toEqual({ error: "no_file" });
  res = await upload(new File([new Uint8Array(3)], "x.gif", { type: "image/gif" }));
  expect(await res.json()).toEqual({ error: "file_type" });
  expect(saveStoryProof).not.toHaveBeenCalled();
});

it("rate-limits per sign-up and per network", async () => {
  checkRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetAt: new Date() });
  const res = await upload(png());
  expect(res.status).toBe(429);
  expect(checkRateLimit).toHaveBeenCalledTimes(2);
  expect(saveStoryProof).not.toHaveBeenCalled();
});

it("fails closed when storing fails (no table or bucket yet)", async () => {
  saveStoryProof.mockRejectedValue(new Error("relation does not exist"));
  const res = await upload(png());
  expect(res.status).toBe(500);
  expect(JSON.stringify(await res.json())).not.toContain("relation");
});
