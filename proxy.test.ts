/** @jest-environment node */
import { NextRequest } from "next/server";
import proxy from "./proxy";
import { updateSession } from "@/utils/supabase/proxy";

jest.mock("@/utils/supabase/proxy", () => ({
  ...jest.requireActual("@/utils/supabase/proxy"),
  updateSession: jest.fn(),
}));
jest.mock("@/lib/og/linkPreviewBots", () => ({ adminPreviewPath: () => null }));

it("blocks a cross-origin admin write before it reaches a route handler", async () => {
  const response = await proxy(new NextRequest("https://passionseed.org/api/admin/users/roles", {
    method: "POST", headers: { origin: "https://evil.invalid" },
  }));
  expect(response.status).toBe(403);
  expect(updateSession).not.toHaveBeenCalled();
});

it("allows same-origin admin writes to reach their own authorization checks", async () => {
  const response = await proxy(new NextRequest("https://passionseed.org/api/admin/users/roles", {
    method: "POST", headers: { origin: "https://passionseed.org" },
  }));
  expect(response.headers.get("x-middleware-next")).toBe("1");
});

it("does not apply the admin origin requirement to signed webhooks", async () => {
  const response = await proxy(new NextRequest("https://passionseed.org/api/meta/webhook", { method: "POST" }));
  expect(response.headers.get("x-middleware-next")).toBe("1");
});
