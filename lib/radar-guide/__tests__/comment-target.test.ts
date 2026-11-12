import { isAutoSendableTarget, isRadarTarget, resolveCommentTarget } from "../comment-target";
import type { RadarReel } from "../types";

const MAPPED: RadarReel = {
  id: "11111111-1111-4111-8111-111111111111",
  platform: "instagram",
  mediaId: "17900000000000001",
  shortcode: "DA1b2C3dE",
  fieldSlug: "cybersecurity",
  chapterKey: "money",
  videoKind: "founder",
  angle: "salary_reveal",
  isTrial: false,
  careerLabelTh: "ไซเบอร์",
  dmEnabled: true,
};

const HUB_REEL: RadarReel = { ...MAPPED, id: "hub", mediaId: "17900000000000003", fieldSlug: null, chapterKey: null, careerLabelTh: null };

function lookup(reels: RadarReel[]) {
  const calls: string[] = [];
  const fn = async (mediaId: string) => {
    calls.push(mediaId);
    return reels.find((r) => r.mediaId === mediaId) ?? null;
  };
  return Object.assign(fn, { calls });
}

describe("resolveCommentTarget", () => {
  it("keyword on a mapped reel gives the reel's career and chapter", async () => {
    const target = await resolveCommentTarget({ text: "RADAR", mediaId: MAPPED.mediaId }, lookup([MAPPED]));
    expect(target).toEqual({
      campaign: "radar",
      fieldSlug: "cybersecurity",
      chapterKey: "money",
      reel: MAPPED,
      matchedBy: "keyword",
    });
    expect(isAutoSendableTarget(target)).toBe(true);
  });

  it("keyword on an unmapped post gives the hub", async () => {
    const target = await resolveCommentTarget({ text: "เรดาร์ค่ะ", mediaId: "17999999999999999" }, lookup([MAPPED]));
    expect(target).toMatchObject({ campaign: "radar", fieldSlug: null, chapterKey: null, reel: null, matchedBy: "keyword" });
  });

  it("keyword with an empty media id gives the hub without a lookup", async () => {
    const get = lookup([MAPPED]);
    const target = await resolveCommentTarget({ text: "radar", mediaId: "" }, get);
    expect(target).toMatchObject({ fieldSlug: null, reel: null, matchedBy: "keyword" });
    expect(get.calls).toEqual([]);
  });

  it("keyword on a hub reel gives the hub with the reel attached", async () => {
    const target = await resolveCommentTarget({ text: "RADAR", mediaId: HUB_REEL.mediaId }, lookup([HUB_REEL]));
    expect(target).toMatchObject({ fieldSlug: null, reel: HUB_REEL, matchedBy: "keyword" });
  });

  it("keyword mixed with another campaign on an unmapped post goes to review, never auto", async () => {
    const target = await resolveCommentTarget({ text: "shift radar", mediaId: "1799" }, lookup([]));
    expect(target).toMatchObject({ campaign: "radar", matchedBy: null, needsReview: true });
    expect(isAutoSendableTarget(target)).toBe(false);
  });

  it.each(["เรื่องนี้ไม่อยู่ในเรดาร์เลย", "radar ของพี่แม่นมาก", "อยากเรียน shift แต่ยังไม่อยู่ในเรดาร์"])(
    "the word inside a sentence (%p) on an unmapped post is review only",
    async (text) => {
      const target = await resolveCommentTarget({ text, mediaId: "17999999999999999" }, lookup([MAPPED]));
      expect(target).toMatchObject({ campaign: "radar", reel: null, matchedBy: null, needsReview: true });
      expect(isAutoSendableTarget(target)).toBe(false);
    }
  );

  it.each(["RADAR", "radar!", "เรดาร์ค่ะ", "ขอ radar 🙏", "@friend radar", "Radar radar", "เรดาร์ครับพี่"])(
    "a keyword-only comment (%p) on an unmapped post gets the hub",
    async (text) => {
      const target = await resolveCommentTarget({ text, mediaId: "17999999999999999" }, lookup([MAPPED]));
      expect(target).toMatchObject({ campaign: "radar", reel: null, matchedBy: "keyword" });
      expect(isAutoSendableTarget(target)).toBe(true);
    }
  );

  it("keyword inside a sentence on a mapped Radar reel still counts", async () => {
    const target = await resolveCommentTarget({ text: "อยากได้ radar ของไซเบอร์", mediaId: MAPPED.mediaId }, lookup([MAPPED]));
    expect(target).toMatchObject({ campaign: "radar", reel: MAPPED, matchedBy: "keyword" });
  });

  it("request phrase on a mapped reel matches by request_phrase", async () => {
    const target = await resolveCommentTarget({ text: "ขอลิงก์ค่ะ", mediaId: MAPPED.mediaId }, lookup([MAPPED]));
    expect(target).toMatchObject({ campaign: "radar", fieldSlug: "cybersecurity", matchedBy: "request_phrase" });
    expect(isAutoSendableTarget(target)).toBe(true);
  });

  it("request phrase on an unmapped post is nothing", async () => {
    const target = await resolveCommentTarget({ text: "ขอลิงก์ค่ะ", mediaId: "17999999999999999" }, lookup([MAPPED]));
    expect(target).toBeNull();
  });

  it("request phrase on a mapped reel with DMs off goes to review, not auto", async () => {
    const off = { ...MAPPED, dmEnabled: false };
    const target = await resolveCommentTarget({ text: "ขอลิงก์ค่ะ", mediaId: off.mediaId }, lookup([off]));
    expect(target).toMatchObject({ campaign: "radar", matchedBy: null, needsReview: true });
    expect(isAutoSendableTarget(target)).toBe(false);
  });

  it.each(["ขอค่ะ", "อยากได้", "ขอด้วยนะคะ", "link?"])(
    "vague comment %p on a mapped reel needs review",
    async (text) => {
      const target = await resolveCommentTarget({ text, mediaId: MAPPED.mediaId }, lookup([MAPPED]));
      expect(target).toMatchObject({ campaign: "radar", matchedBy: null, needsReview: true });
      expect(isRadarTarget(target)).toBe(true);
      expect(isAutoSendableTarget(target)).toBe(false);
    }
  );

  it("an unrelated comment on a mapped reel is nothing", async () => {
    const target = await resolveCommentTarget({ text: "สวยมาก 🔥", mediaId: MAPPED.mediaId }, lookup([MAPPED]));
    expect(target).toBeNull();
  });

  it("another campaign's keyword keeps its campaign, even on a Radar reel", async () => {
    expect(await resolveCommentTarget({ text: "shift", mediaId: "1799" }, lookup([]))).toMatchObject({
      campaign: "shift",
      matchedBy: null,
      reel: null,
    });
    expect(
      await resolveCommentTarget({ text: "port ค่ะ", mediaId: MAPPED.mediaId }, lookup([MAPPED]))
    ).toMatchObject({ campaign: "port", matchedBy: null });
  });

  it("returns null when nothing matched", async () => {
    expect(await resolveCommentTarget({ text: "❤️", mediaId: "1799" }, lookup([]))).toBeNull();
    expect(await resolveCommentTarget({ text: null, mediaId: null }, lookup([]))).toBeNull();
  });

  it("treats a failed lookup as unmapped", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    const failing = async () => {
      throw new Error("db down");
    };
    expect(await resolveCommentTarget({ text: "RADAR", mediaId: MAPPED.mediaId! }, failing)).toMatchObject({
      fieldSlug: null,
      matchedBy: "keyword",
    });
    expect(await resolveCommentTarget({ text: "ขอลิงก์", mediaId: MAPPED.mediaId! }, failing)).toBeNull();
    spy.mockRestore();
  });

  it("ignores a TikTok mapping for Instagram comments", async () => {
    const tiktok = { ...MAPPED, platform: "tiktok" as const };
    const target = await resolveCommentTarget({ text: "radar", mediaId: tiktok.mediaId }, lookup([tiktok]));
    expect(target).toMatchObject({ fieldSlug: null, reel: null });
  });
});
