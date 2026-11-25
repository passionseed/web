import { registrationEmailContent } from "../registration-email";

describe("registrationEmailContent", () => {
  it("links the person's own page", () => {
    const { html, text } = registrationEmailContent({ payToken: "a".repeat(32), amountBaht: 199, team: null });
    expect(text).toContain(`/hackathon/join/${"a".repeat(32)}`);
    expect(html).not.toContain("team=");
  });

  it("adds the team invite link but never the typed team name", () => {
    const { html, text } = registrationEmailContent({
      payToken: "b".repeat(32),
      amountBaht: 149,
      team: { name: "<b>Fire</b>", inviteCode: "0123456789ab" },
    });
    expect(text).toContain("/hackathon/join?team=0123456789ab");
    expect(html).not.toContain("Fire");
    expect(text).not.toContain("Fire");
  });
});
