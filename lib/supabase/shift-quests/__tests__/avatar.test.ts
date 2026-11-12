/** @jest-environment node */
import { guildAvatarUrl, normalizeAvatarUrl, userAvatarUrl } from "../avatar";

const USER = "123456789012345678";
const GUILD = "999999999999999999";
const HASH = "0123456789abcdef0123456789abcdef";
const ANIMATED = `a_${HASH}`;

describe("normalizeAvatarUrl", () => {
  it.each([
    [`https://cdn.discordapp.com/avatars/${USER}/${HASH}.png`, `https://cdn.discordapp.com/avatars/${USER}/${HASH}.png?size=64`],
    // Animated and other formats become one still PNG frame.
    [`https://cdn.discordapp.com/avatars/${USER}/${ANIMATED}.gif`, `https://cdn.discordapp.com/avatars/${USER}/${ANIMATED}.png?size=64`],
    [`https://cdn.discordapp.com/avatars/${USER}/${HASH}.webp?size=1024`, `https://cdn.discordapp.com/avatars/${USER}/${HASH}.png?size=64`],
    [`https://cdn.discordapp.com/avatars/${USER}/${HASH}.jpg`, `https://cdn.discordapp.com/avatars/${USER}/${HASH}.png?size=64`],
    [`https://media.discordapp.net/avatars/${USER}/${HASH}.png?size=4096&quality=lossless`, `https://media.discordapp.net/avatars/${USER}/${HASH}.png?size=64`],
    ["https://cdn.discordapp.com/embed/avatars/3.png", "https://cdn.discordapp.com/embed/avatars/3.png?size=64"],
    [
      `https://cdn.discordapp.com/guilds/${GUILD}/users/${USER}/avatars/${ANIMATED}.gif`,
      `https://cdn.discordapp.com/guilds/${GUILD}/users/${USER}/avatars/${ANIMATED}.png?size=64`,
    ],
    // Surrounding spaces from a sloppy identity payload.
    [`  https://cdn.discordapp.com/avatars/${USER}/${HASH}.png  `, `https://cdn.discordapp.com/avatars/${USER}/${HASH}.png?size=64`],
  ])("keeps Discord's avatar %s as a 64px PNG", (raw, expected) => {
    expect(normalizeAvatarUrl(raw)).toBe(expected);
  });

  it.each([
    ["http, not https", `http://cdn.discordapp.com/avatars/${USER}/${HASH}.png`],
    ["another host", `https://evil.example/avatars/${USER}/${HASH}.png`],
    ["a look-alike host", `https://cdn.discordapp.com.evil.example/avatars/${USER}/${HASH}.png`],
    ["a subdomain", `https://x.cdn.discordapp.com/avatars/${USER}/${HASH}.png`],
    ["credentials", `https://user:pass@cdn.discordapp.com/avatars/${USER}/${HASH}.png`],
    ["a port", `https://cdn.discordapp.com:8443/avatars/${USER}/${HASH}.png`],
    ["an attachment path", `https://cdn.discordapp.com/attachments/${USER}/${USER}/photo.png`],
    ["an emoji path", `https://cdn.discordapp.com/emojis/${USER}.png`],
    ["a path escape", `https://cdn.discordapp.com/avatars/${USER}/../../attachments/x.png`],
    ["an encoded slash", `https://cdn.discordapp.com/avatars/${USER}/${HASH}%2F..%2Fx.png`],
    ["a short id", `https://cdn.discordapp.com/avatars/1/${HASH}.png`],
    ["a hash that is not Discord's", `https://cdn.discordapp.com/avatars/${USER}/not-a-hash.png`],
    ["an extension that is not an image", `https://cdn.discordapp.com/avatars/${USER}/${HASH}.svg`],
    ["no extension", `https://cdn.discordapp.com/avatars/${USER}/${HASH}`],
    ["an extra segment", `https://cdn.discordapp.com/avatars/${USER}/${HASH}.png/x`],
    ["a big embed index", "https://cdn.discordapp.com/embed/avatars/123.png"],
    ["javascript", "javascript:alert(1)"],
    ["a data URL", "data:image/png;base64,AAAA"],
    ["not a URL", "not a url"],
    ["an empty string", ""],
    ["null", null],
    ["a number", 42],
    ["an object", { href: `https://cdn.discordapp.com/avatars/${USER}/${HASH}.png` }],
  ])("refuses %s", (_label, raw) => {
    expect(normalizeAvatarUrl(raw)).toBeNull();
  });

  it("refuses a very long string without parsing it", () => {
    expect(normalizeAvatarUrl(`https://cdn.discordapp.com/avatars/${USER}/${HASH}.png?${"x".repeat(600)}`)).toBeNull();
  });
});

describe("guildAvatarUrl and userAvatarUrl", () => {
  it("build 64px PNG URLs on Discord's CDN", () => {
    expect(guildAvatarUrl(GUILD, USER, ANIMATED)).toBe(`https://cdn.discordapp.com/guilds/${GUILD}/users/${USER}/avatars/${ANIMATED}.png?size=64`);
    expect(userAvatarUrl(USER, HASH)).toBe(`https://cdn.discordapp.com/avatars/${USER}/${HASH}.png?size=64`);
  });

  it.each([
    ["no hash", GUILD, USER, null],
    ["a hash that is not Discord's", GUILD, USER, "../../x"],
    ["a guild id that is not a snowflake", "guild", USER, HASH],
    ["a user id that is not a snowflake", GUILD, "../roles", HASH],
  ])("are null with %s", (_label, guild, user, hash) => {
    expect(guildAvatarUrl(guild, user, hash)).toBeNull();
    if (guild === GUILD) expect(userAvatarUrl(user, hash)).toBeNull();
  });
});

describe("fetchShiftGuildMember: the member's picture", () => {
  const ENV = { ...process.env };
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  async function load() {
    jest.resetModules();
    return (await import("@/lib/shift/discordGuild")).fetchShiftGuildMember;
  }

  const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

  beforeEach(() => {
    process.env = { ...ENV, DISCORD_SHIFT_BOT_TOKEN: "bot-token", DISCORD_SHIFT_GUILD_ID: GUILD };
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    process.env = ENV;
    global.fetch = originalFetch;
  });

  it("prefers the server avatar the member set in the SHIFT server", async () => {
    fetchMock.mockResolvedValue(json({ roles: [], nick: null, avatar: ANIMATED, user: { id: USER, avatar: HASH } }));
    await expect((await load())(USER)).resolves.toMatchObject({
      ok: true,
      avatar: `https://cdn.discordapp.com/guilds/${GUILD}/users/${USER}/avatars/${ANIMATED}.png?size=64`,
    });
  });

  it("falls back to the account's own avatar", async () => {
    fetchMock.mockResolvedValue(json({ roles: [], nick: null, avatar: null, user: { id: USER, avatar: HASH } }));
    await expect((await load())(USER)).resolves.toMatchObject({ avatar: `https://cdn.discordapp.com/avatars/${USER}/${HASH}.png?size=64` });
  });

  it.each([
    ["no avatar at all", { roles: [], user: { id: USER, avatar: null } }],
    ["no user object", { roles: [] }],
    ["hashes that are not Discord's", { roles: [], avatar: "../../x", user: { avatar: "https://evil.example/a.png" } }],
  ])("is null with %s", async (_label, body) => {
    fetchMock.mockResolvedValue(json(body));
    await expect((await load())(USER)).resolves.toMatchObject({ ok: true, avatar: null });
  });
});
