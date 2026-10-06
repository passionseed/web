/** @jest-environment node */
import { NextRequest } from "next/server";
import { GET } from "./route";
import { createClient } from "@/utils/supabase/server";

const pending: Array<() => Promise<void>> = [];
jest.mock("next/server", () => ({ ...jest.requireActual("next/server"), after: (fn: () => Promise<void>) => pending.push(fn) }));
jest.mock("@/utils/supabase/server", () => ({ createClient: jest.fn() }));

beforeEach(() => { pending.length = 0; });

test("redirects to the page with attribution and records the click", async () => {
  const insert = jest.fn().mockResolvedValue({ error: null });
  (createClient as jest.Mock).mockResolvedValue({ from: jest.fn(() => ({ insert })) });
  const response = await GET(new NextRequest("https://passionseed.org/go/ig_reel_01"), { params: Promise.resolve({ source: "ig_reel_01" }) });
  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe("https://passionseed.org/shift?utm_source=ig_reel_01");
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  await pending[0]();
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({
    visitor_fingerprint: expect.any(String),
    event_data: { source: "ig_reel_01", target: "shift" },
  }));
});

test("LINE links use the configured account even if analytics fails", async () => {
  (createClient as jest.Mock).mockRejectedValue(new Error("offline"));
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  const response = await GET(new NextRequest("https://passionseed.org/go/camphub?to=line"), { params: Promise.resolve({ source: "camphub" }) });
  expect(response.headers.get("location")).toBe("https://line.me/R/ti/p/@passionseed");
  await expect(pending[0]()).resolves.toBeUndefined();
  log.mockRestore();
});

test("does not accept arbitrary redirect destinations", async () => {
  const response = await GET(new NextRequest("https://passionseed.org/go/camphub?to=https://example.com"), { params: Promise.resolve({ source: "camphub" }) });
  expect(response.status).toBe(400);
  expect(pending).toHaveLength(0);
});
