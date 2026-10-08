import {
  buildLeadFacts,
  buildPersonalizeMessages,
  extractPlaceholders,
  lastInboundFromMessages,
  restorePlaceholders,
  rewriteKeepsShiftFacts,
  sanitizePersonalizedMessage,
  stripModelWrapper,
} from "@/lib/dm-leads/personalize";

describe("personalize helpers", () => {
  it("extracts playbook placeholders", () => {
    expect(extractPlaceholders("รอบหน้าเริ่ม [วันที่] เหลือ [n] ที่")).toEqual([
      "[วันที่]",
      "[n]",
    ]);
  });

  it("restores dropped placeholders at the end", () => {
    const rewritten = restorePlaceholders(
      "PathLab สาย[X] เริ่ม [วันที่] ครับ",
      "PathLab สายวิศวะคอม เริ่มได้เลยครับ"
    );
    expect(rewritten).toContain("[X]");
    expect(rewritten).toContain("[วันที่]");
  });

  it("does not duplicate placeholders that survived the rewrite", () => {
    const rewritten = restorePlaceholders(
      "เริ่ม [วันที่] ครับ",
      "รอบหน้าเริ่ม [วันที่] ครับ"
    );
    expect(rewritten.match(/\[วันที่\]/g)).toHaveLength(1);
  });

  it("strips fences and wrapping quotes from model output", () => {
    expect(stripModelWrapper('```text\n"สวัสดีครับน้องมายด์"\n```')).toBe(
      "สวัสดีครับน้องมายด์"
    );
  });

  it("rejects empty or wildly long rewrites", () => {
    expect(sanitizePersonalizedMessage("สั้นครับ", "   ")).toBeNull();
    expect(sanitizePersonalizedMessage("สั้นครับ", "ก".repeat(2000))).toBeNull();
  });

  it("drops a SHIFT rewrite that changes the round or the apply link", () => {
    const template = [
      "ส่งลิงก์สมัคร SHIFT[2] ให้แล้วน้า 🌱",
      "https://passionseed.org/shift/apply?round=2&utm_source=ig-comment-dm",
      "กรอก 2 นาที ปิดรับ ส. 10 ต.ค. รับแค่ 21 คน",
      "สงสัยอะไรพิมพ์ถามในนี้ได้เลย",
    ].join("\n");
    const swapped = template.replaceAll("SHIFT[2]", "SHIFT[1]").replaceAll("round=2", "round=1");

    expect(rewriteKeepsShiftFacts(template, swapped)).toBe(false);
    expect(sanitizePersonalizedMessage(template, swapped)).toBeNull();
    expect(sanitizePersonalizedMessage(template, "ส่งลิงก์ให้แล้วน้า")).toBeNull();
    expect(sanitizePersonalizedMessage(template, `${template}\nรุ่นก่อน ฿670`)).toBeNull();
    expect(sanitizePersonalizedMessage(template, `น้องมายด์ครับ\n${template}`)).toContain("round=2");
    expect(rewriteKeepsShiftFacts("น้องอยู่ ม.ไหนครับ", "SHIFT[1] ฿670 round=1")).toBe(true);
    expect(rewriteKeepsShiftFacts(template.replaceAll("round=2", "round=12"), template.replaceAll("round=2", "round=12"))).toBe(true);
  });

  it("lists known lead facts for the prompt", () => {
    const facts = buildLeadFacts({
      displayName: "มายด์",
      username: "mind.m5",
      gradeLevel: "ม.5",
      interests: ["แพทยศาสตร์"],
      coverage: "uncovered",
      pathlabPayReady: true,
      lastInbound: "อยากเข้าหมอค่ะ",
    });
    expect(facts).toContain("มายด์");
    expect(facts).toContain("ม.5");
    expect(facts).toContain("แพทยศาสตร์");
    expect(facts).toContain("pre-sell");
    expect(facts).toContain("อยากเข้าหมอค่ะ");
  });

  it("builds a system/user pair that includes the template and lead facts", () => {
    const messages = buildPersonalizeMessages({
      template: "น้องอยู่ ม.ไหน แล้วสนใจคณะไหนอยู่ครับ",
      lead: { displayName: "มายด์", gradeLevel: "ม.5", interests: ["แพทยศาสตร์"] },
      kind: "script",
    });
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].content).toContain("มายด์");
    expect(messages[1].content).toContain("น้องอยู่ ม.ไหน");
  });

  it("reads the latest inbound body from a thread", () => {
    expect(
      lastInboundFromMessages([
        { direction: "outbound", body: "สวัสดีครับ" },
        { direction: "inbound", body: "สนใจวิศวะค่ะ" },
        { direction: "outbound", body: "โอเคครับ" },
      ])
    ).toBe("สนใจวิศวะค่ะ");
  });

  it("falls back to the template when Qwen is unavailable", async () => {
    jest.resetModules();
    jest.doMock("@/lib/dm-leads/qwen-client", () => ({
      completeQwenChat: jest.fn().mockRejectedValue(new Error("down")),
    }));
    const { personalizeMessage: isolated } = await import("@/lib/dm-leads/personalize");
    await expect(
      isolated({
        template: "น้องอยู่ ม.ไหนครับ",
        lead: { displayName: "มายด์" },
      })
    ).resolves.toBe("น้องอยู่ ม.ไหนครับ");
    jest.dontMock("@/lib/dm-leads/qwen-client");
  });
});
