/** @jest-environment node */
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createClient } from "@/utils/supabase/server";

jest.mock("next/navigation", () => ({
  redirect: jest.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  }),
}));
jest.mock("@/utils/supabase/server", () => ({ createClient: jest.fn() }));

const user = { id: "u1" };
let auth: { data: { user: unknown }; error: unknown };
let roles: { data: unknown; error: unknown };
interface RoleQuery {
  select: jest.Mock<RoleQuery>;
  eq: jest.Mock<RoleQuery>;
  limit: jest.Mock<Promise<{ data: unknown; error: unknown }>>;
}
const roleQuery: RoleQuery = {
  select: jest.fn((): RoleQuery => roleQuery),
  eq: jest.fn((): RoleQuery => roleQuery),
  limit: jest.fn(async () => roles),
};

beforeEach(() => {
  auth = { data: { user }, error: null };
  roles = { data: [{ role: "admin" }], error: null };
  jest.mocked(createClient).mockResolvedValue({
    auth: { getUser: jest.fn(async () => auth) },
    from: jest.fn(() => roleQuery),
  } as never);
});

test("returns the admin user", async () => {
  await expect(requireAdmin()).resolves.toBe(user);
  expect(roleQuery.eq).toHaveBeenCalledWith("role", "admin");
});

test("signed out goes to /login, a non-admin to /me", async () => {
  auth = { data: { user: null }, error: null };
  await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT /login");
  auth = { data: { user }, error: null };
  roles = { data: [], error: null };
  await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT /me");
  roles = { data: null, error: { message: "timeout" } };
  await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT /me");
  expect(redirect).toHaveBeenCalledTimes(3);
});
