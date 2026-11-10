import { discordProfileUrl, nameWithNickname, personOf } from "./canvas-people";

const ID = "11111111-1111-4111-8111-111111111111";

describe("personOf", () => {
  it("takes the nickname and verified Discord account from the SHIFT application", () => {
    const p = personOf({
      userId: ID,
      name: "Mint Srisuk",
      application: { nickname: "มิ้นท์", discord_user_id: "123456789012345678", discord_username: "mint_th" },
      profileAvatar: "https://cdn.discordapp.com/avatars/1/a.png",
      identity: { provider_id: "999999999999999999", name: "other#0", custom_claims: { global_name: "Mint ☀️" }, avatar_url: "https://cdn.discordapp.com/avatars/1/b.png" },
    });
    expect(p).toEqual({
      userId: ID,
      name: "Mint Srisuk",
      nickname: "มิ้นท์",
      avatarUrl: "https://cdn.discordapp.com/avatars/1/b.png",
      discord: { id: "123456789012345678", username: "mint_th", displayName: "Mint ☀️" },
    });
  });

  it("falls back to the Discord sign-in, without the old #0 discriminator", () => {
    const p = personOf({ userId: ID, name: "Ton", identity: { provider_id: "222222222222222222", name: "ton.k#0", custom_claims: { global_name: "ton.k" } } });
    expect(p.nickname).toBeNull();
    // A display name equal to the username adds nothing.
    expect(p.discord).toEqual({ id: "222222222222222222", username: "ton.k", displayName: null });
  });

  it("has no Discord for someone who never linked it, and keeps only https pictures", () => {
    const p = personOf({ userId: ID, name: "Ploy", application: { nickname: " ", discord_user_id: null, discord_username: null }, profileAvatar: "javascript:alert(1)" });
    expect(p).toMatchObject({ nickname: null, discord: null, avatarUrl: null });
  });

  it("ignores an id that is not a Discord snowflake", () => {
    const p = personOf({ userId: ID, name: "Beam", application: { nickname: null, discord_user_id: "not-an-id", discord_username: "beam" } });
    expect(p.discord).toEqual({ id: null, username: "beam", displayName: null });
    expect(discordProfileUrl(p.discord!)).toBeNull();
  });
});

describe("helpers", () => {
  it("names someone with their nickname once", () => {
    expect(nameWithNickname({ name: "Mint Srisuk", nickname: "มิ้นท์" })).toBe("Mint Srisuk (มิ้นท์)");
    expect(nameWithNickname({ name: "Mint", nickname: "Mint" })).toBe("Mint");
    expect(nameWithNickname({ name: "Mint", nickname: null })).toBe("Mint");
  });

  it("links to a Discord profile by id", () => {
    expect(discordProfileUrl({ id: "123456789012345678", username: "mint_th", displayName: null })).toBe("https://discord.com/users/123456789012345678");
  });
});
