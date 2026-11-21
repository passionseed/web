/**
 * @jest-environment node
 */
import { Routes, type Client } from "discord.js";

import { ElementalError } from "../api";
import { normalizeSettings, type ElementalRuntime } from "../context";
import { discordMemberRolesPort, setMemberRolesPortFactory, staffIdsAmong } from "../staffcheck";

// Made-up snowflakes only.
const GUILD = "100000000000000001";
const ROLE = {
  host: "300000000000000001",
  helper: "300000000000000002",
  mentor: "300000000000000003",
  judge: "300000000000000004",
  safety: "300000000000000005",
  paid: "300000000000000006",
  fire: "300000000000000013",
};
const user = (n: number) => `2000000000000${String(n).padStart(5, "0")}`;
const settings = normalizeSettings({ guild_id: GUILD, edition: "elemental-dryrun", edition_kind: "rehearsal", roles: ROLE }, GUILD)!;

function runtime(get: (route: string) => Promise<unknown>): ElementalRuntime {
  return { client: { rest: { get } } as unknown as Client } as ElementalRuntime;
}

describe("staff check", () => {
  test("reads each person's roles once and returns the staff among them, in order", async () => {
    const roles: Record<string, string[]> = {
      [user(1)]: [ROLE.paid, ROLE.fire],
      [user(2)]: [ROLE.judge],
      [user(3)]: [ROLE.paid, ROLE.mentor],
      [user(4)]: [ROLE.paid],
    };
    const routes: string[] = [];
    const rt = runtime(async (route) => {
      routes.push(route);
      const id = route.split("/").at(-1)!;
      return { roles: roles[id] ?? [] };
    });
    const found = await staffIdsAmong(rt, GUILD, settings, [user(1), user(2), user(3), user(2), user(4)]);
    expect(found).toEqual([user(2), user(3)]);
    expect(routes.sort()).toEqual([user(1), user(2), user(3), user(4)].map((id) => Routes.guildMember(GUILD, id)).sort());
  });

  test.each(Object.entries(ROLE).filter(([key]) => ["host", "helper", "mentor", "judge", "safety"].includes(key)))(
    "the %s role counts as staff",
    async (_key, role) => {
      const rt = runtime(async () => ({ roles: [role] }));
      expect(await staffIdsAmong(rt, GUILD, settings, [user(1)])).toEqual([user(1)]);
    }
  );

  test("someone not in the server holds no role", async () => {
    const rt = runtime(async () => {
      throw Object.assign(new Error("Unknown Member"), { code: 10007, status: 404 });
    });
    expect(await discordMemberRolesPort(rt, GUILD).roles(user(1))).toBeNull();
    expect(await staffIdsAmong(rt, GUILD, settings, [user(1)])).toEqual([]);
  });

  test("any other failure refuses (roles_unavailable) instead of passing an unchecked person", async () => {
    const rt = runtime(async () => {
      throw Object.assign(new Error("Missing Access"), { code: 50001, status: 403 });
    });
    const quiet = jest.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(staffIdsAmong(rt, GUILD, settings, [user(1)])).rejects.toEqual(new ElementalError("roles_unavailable"));
    quiet.mockRestore();
  });

  test("a test port replaces Discord", async () => {
    const rt = runtime(async () => {
      throw new Error("Discord should not be called");
    });
    setMemberRolesPortFactory(rt, () => ({ roles: async () => [ROLE.safety] }));
    expect(await staffIdsAmong(rt, GUILD, settings, [user(5)])).toEqual([user(5)]);
    setMemberRolesPortFactory(rt, null);
  });
});
