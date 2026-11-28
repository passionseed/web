import { myPageEmailContent, registrationEmailContent } from "../registration-email";

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

describe("myPageEmailContent", () => {
  it("links each sign-up's own page with the friend's team ready to join", () => {
    const { html, text } = myPageEmailContent({ payTokens: ["c".repeat(32), "d".repeat(32)], joinCode: "01234567" });
    expect(text).toContain(`/hackathon/join/${"c".repeat(32)}?join=01234567`);
    expect(text).toContain(`/hackathon/join/${"d".repeat(32)}?join=01234567`);
    expect(text.indexOf("c".repeat(32))).toBeLessThan(text.indexOf("d".repeat(32)));
    expect(html).toContain("<a href=");
  });

  it("links the plain page when there's no team code", () => {
    const { text } = myPageEmailContent({ payTokens: ["e".repeat(32)], joinCode: null });
    expect(text).toContain(`/hackathon/join/${"e".repeat(32)}`);
    expect(text).not.toContain("?join=");
  });
});
