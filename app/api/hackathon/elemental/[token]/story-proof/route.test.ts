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

const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d];
const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1];
const file = (head: number[], type: string, name = "story") => new File([new Uint8Array([...head, 1, 2, 3])], name, { type });
const png = () => file(PNG_HEAD, "image/png", "story.png");

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
  expect(saveStoryProof).toHaveBeenCalledWith("elemental-2026", "reg-1", expect.any(File), { ext: "png", contentType: "image/png" });
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

it("checks the first bytes, not only the reported type", async () => {
  // Text, or an HTML page, labelled as a PNG.
  for (const head of [[...Buffer.from("hello world!")], [...Buffer.from("<html><body>")]]) {
    const res = await upload(file(head, "image/png", "story.png"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "file_type" });
  }
  expect(saveStoryProof).not.toHaveBeenCalled();
});

it("stores a real image as the type its bytes say, whatever the label", async () => {
  const res = await upload(file(PNG_HEAD, "image/jpeg", "story.jpg"));
  expect(res.status).toBe(200);
  expect(saveStoryProof).toHaveBeenCalledWith("elemental-2026", "reg-1", expect.any(File), { ext: "png", contentType: "image/png" });
  await upload(file(JPEG_HEAD, "image/jpeg", "story.jpg"));
  expect(saveStoryProof).toHaveBeenLastCalledWith("elemental-2026", "reg-1", expect.any(File), { ext: "jpg", contentType: "image/jpeg" });
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
