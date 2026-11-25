import {
  buildPaidPayload,
  buildSignupPayload,
  crossedCheckpoint,
  nextCheckpointLine,
  seatBar,
} from "../notify-discord";

const NOW = new Date("2026-11-24T10:00:00+07:00");

describe("seatBar", () => {
  it("fills cells in proportion to the target", () => {
    expect(seatBar(0, 100)).toBe(`${"░".repeat(20)} 0/100 (0%)`);
    expect(seatBar(50, 100)).toBe(`${"▓".repeat(10)}${"░".repeat(10)} 50/100 (50%)`);
  });

  it("never overflows past the target", () => {
    expect(seatBar(150, 100)).toBe(`${"▓".repeat(20)} 150/100 (100%)`);
  });
});

describe("crossedCheckpoint", () => {
  it("names the checkpoint a payment crosses", () => {
    expect(crossedCheckpoint(48, 51)).toBe(50);
    expect(crossedCheckpoint(49, 50)).toBe(50);
  });

  it("is null when no checkpoint is crossed", () => {
    expect(crossedCheckpoint(50, 52)).toBeNull();
    expect(crossedCheckpoint(10, 12)).toBeNull();
  });
});

describe("nextCheckpointLine", () => {
  it("says how many seats are still needed", () => {
    expect(nextCheckpointLine(20, NOW)).toMatch(/^เป้าถัดไป 50 ภายใน .+ · ขาดอีก 30$/);
  });

  it("is null after the last checkpoint", () => {
    expect(nextCheckpointLine(20, new Date("2026-12-10T10:00:00+07:00"))).toBeNull();
  });
});

describe("buildSignupPayload", () => {
  const payload = buildSignupPayload(
    {
      signupNumber: 23,
      members: [
        { name: "Mint", school: "Triam Udom" },
        { name: "Por", school: "Satit Chula" },
      ],
      teamMode: "create",
      teamName: "@everyone wins",
      amountBaht: 298,
      source: "ig-story",
      paidSeats: 12,
    },
    NOW,
  );
  const embed = payload.embeds[0];

  it("never lets user text ping anyone", () => {
    expect(payload.allowed_mentions).toEqual({ parse: [] });
  });

  it("shows the count, names, schools, team and amount", () => {
    expect(embed.title).toBe("🔥 Elemental สมัครใหม่ #23");
    expect(embed.description).toContain("**Mint** · Triam Udom");
    expect(embed.description).toContain("**Por** · Satit Chula");
    const fields = Object.fromEntries(embed.fields.map((f) => [f.name, f.value]));
    expect(fields["แบบ"]).toBe("ตั้งทีมใหม่ “@everyone wins”");
    expect(fields["ยอด"]).toBe("2 คน · ฿298");
    expect(fields["มาจาก"]).toBe("ig-story");
    expect(fields["ที่นั่งที่จ่ายแล้ว"]).toContain("12/350");
  });

  it("falls back to direct when there is no tracked link", () => {
    const solo = buildSignupPayload(
      { signupNumber: 1, members: [{ name: "A", school: "B" }], teamMode: "solo", teamName: null, amountBaht: 199, source: null, paidSeats: 0 },
      NOW,
    );
    const fields = Object.fromEntries(solo.embeds[0].fields.map((f) => [f.name, f.value]));
    expect(fields["แบบ"]).toBe("เดี่ยว");
    expect(fields["มาจาก"]).toBe("direct");
  });
});

describe("buildPaidPayload", () => {
  it("shows the seats added", () => {
    const p = buildPaidPayload(
      { names: ["Mint"], memberCount: 1, amountBaht: 199, teamName: null, paidSeats: 13, via: "slip" },
      NOW,
    );
    expect(p.embeds[0].title).toBe("💸 จ่ายแล้ว! +1 ที่นั่ง");
    expect(p.embeds[0].description).toBe("**Mint** · ฿199");
  });

  it("celebrates crossing a checkpoint", () => {
    const p = buildPaidPayload(
      { names: ["Mint", "Por"], memberCount: 2, amountBaht: 298, teamName: "Fire", paidSeats: 51, via: "admin" },
      NOW,
    );
    expect(p.embeds[0].title).toBe("🎉 Elemental ทะลุ 50 ที่นั่งแล้ว!");
    expect(p.embeds[0].footer.text).toBe("แอดมินยืนยันสลิป");
  });
});
