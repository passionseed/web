import { describeSeedstackAccount } from "../seedstackAccountInfo";

const discordIdentity = {
  provider: "discord",
  identity_data: {
    full_name: "mint_dev",
    name: "mint_dev#0",
    custom_claims: { global_name: "Mint" },
    email: "mint@example.com",
  },
};

describe("describeSeedstackAccount", () => {
  it("shows the Discord display name and username, never the email", () => {
    const account = describeSeedstackAccount(
      { email: "mint@example.com", app_metadata: { provider: "discord" }, identities: [discordIdentity] },
      "Mint",
    );
    expect(account).toEqual({ label: "Mint (@mint_dev)", isDiscord: true, needsSwitch: false });
  });

  it("falls back to the username when there is no global name", () => {
    const account = describeSeedstackAccount(
      { identities: [{ provider: "discord", identity_data: { name: "mint_dev#0" } }] },
      null,
    );
    expect(account.label).toBe("@mint_dev");
  });

  it("does not repeat the name when display name equals username", () => {
    const account = describeSeedstackAccount(
      { identities: [{ provider: "discord", identity_data: { full_name: "mint", custom_claims: { global_name: "mint" } } }] },
      null,
    );
    expect(account.label).toBe("mint");
  });

  it("reads user_metadata when identities are missing but the provider is Discord", () => {
    const account = describeSeedstackAccount(
      { app_metadata: { provider: "discord" }, user_metadata: { full_name: "mint_dev" } },
      null,
    );
    expect(account).toEqual({ label: "@mint_dev", isDiscord: true, needsSwitch: true });
  });

  it("uses a linked Discord identity even when the primary provider is Google", () => {
    const account = describeSeedstackAccount(
      {
        email: "mint@gmail.com",
        app_metadata: { provider: "google" },
        user_metadata: { full_name: "Mint Google" },
        identities: [{ provider: "google", identity_data: { full_name: "Mint Google" } }, discordIdentity],
      },
      "Mint",
    );
    expect(account.label).toBe("Mint (@mint_dev)");
    expect(account.isDiscord).toBe(true);
  });

  it("shows the email for a non-Discord account and asks to switch without a seat", () => {
    const account = describeSeedstackAccount(
      {
        email: "mint@gmail.com",
        app_metadata: { provider: "google" },
        user_metadata: { full_name: "Mint Google" },
        identities: [{ provider: "google", identity_data: { full_name: "Mint Google" } }],
      },
      null,
    );
    expect(account).toEqual({ label: "mint@gmail.com", isDiscord: false, needsSwitch: true });
  });

  it("returns a null label when nothing is safe to show", () => {
    expect(describeSeedstackAccount({}, null).label).toBeNull();
  });
});
