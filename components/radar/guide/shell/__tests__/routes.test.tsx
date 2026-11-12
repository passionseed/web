/**
 * The code-guide routes: static params (drafts only off production), segment
 * config, per-level metadata, unknown levels, and the cover-or-deck branch of
 * /radar/[slug]. The guide module is a small fixture so this never depends on
 * content in progress; nothing touches the database or the network.
 */
import type { ReactElement } from "react";

jest.mock("server-only", () => ({}));

// Pin the fixture to a draft so the production branch is tested whatever
// status the real content has.
jest.mock("@/lib/radar-guides/cybersecurity/meta", () => {
  const actual = jest.requireActual("@/lib/radar-guides/cybersecurity/meta");
  return { ...actual, CYBERSECURITY_META: { ...actual.CYBERSECURITY_META, status: "draft" } };
});

jest.mock("@/lib/radar-guides/cybersecurity/guide", () => {
  const { CYBERSECURITY_META } = jest.requireMock("@/lib/radar-guides/cybersecurity/meta");
  type P = { key: string; order: number; titleTh: string; navLabelTh: string; minutes: number; legacyHashes?: string[] };
  const pages = CYBERSECURITY_META.pages.map((p: P) => ({
    ...p,
    questionTh: `คำถาม ${p.key}`,
    asOf: "2026-11-11",
    factIds: [],
    og: { headlineTh: `หัวข้อ ${p.key}` },
    blocks: [],
  }));
  return { cybersecurityGuide: { meta: CYBERSECURITY_META, pages, facts: [], banned: [] } };
});

const getCachedPublishedRadarField = jest.fn();
jest.mock("@/lib/radar/server", () => ({
  getCachedPublishedRadarField: (...args: unknown[]) => getCachedPublishedRadarField(...args),
  getCachedFieldSkills: jest.fn(async () => []),
}));

jest.mock("@/lib/radar/territory", () => ({ isTerritoryIndex: () => false, territoryKeyOf: () => null }));

jest.mock("@/components/radar/RadarFieldPageClient", () => ({
  RadarFieldPageClient: function RadarFieldPageClient() {
    return null;
  },
}));

jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
  useSelectedLayoutSegment: () => null,
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const levelRoute = require("@/app/radar/[slug]/(guide)/[page]/page");
const fieldRoute = require("@/app/radar/[slug]/page");
const registry = require("@/lib/radar-guides/registry.server");
const { GuideCover } = require("@/components/radar/guide/shell/GuideCover");
/* eslint-enable @typescript-eslint/no-require-imports */

const ORIGINAL_ENV = process.env.VERCEL_ENV;
afterEach(() => {
  if (ORIGINAL_ENV === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = ORIGINAL_ENV;
  getCachedPublishedRadarField.mockReset();
});

const DASH = /[\u2013\u2014]/;

describe("/radar/[slug]/[page]", () => {
  it("is static from code: no dynamic params, force-static", () => {
    expect(levelRoute.dynamicParams).toBe(false);
    expect(levelRoute.dynamic).toBe("force-static");
  });

  it("lists every level of a visible guide, and leaves drafts out on production", () => {
    process.env.VERCEL_ENV = "preview";
    const params = levelRoute.generateStaticParams();
    expect(params).toHaveLength(11);
    expect(params[0]).toEqual({ slug: "cybersecurity", page: "mythos" });
    expect(params.at(-1)).toEqual({ slug: "cybersecurity", page: "next" });

    process.env.VERCEL_ENV = "production"; // the fixture guide is a draft
    expect(levelRoute.generateStaticParams()).toEqual([]);
  });

  it("loadGuidePage returns null for an unknown level or career", () => {
    expect(registry.loadGuidePage("cybersecurity", "nope", "preview")).toBeNull();
    expect(registry.loadGuidePage("data-scientist", "mythos", "preview")).toBeNull();
    expect(registry.loadGuidePage("cybersecurity", "money", "production")).toBeNull();
    expect(registry.loadGuidePage("cybersecurity", "money", "preview")?.page.key).toBe("money");
  });

  it("metadata: absolute title, no dashes, canonical is the level path", async () => {
    process.env.VERCEL_ENV = "preview";
    const md = await levelRoute.generateMetadata({ params: Promise.resolve({ slug: "cybersecurity", page: "money" }) });
    expect(md.title).toEqual({ absolute: "เงินเดือนจริงในไทย | ไซเบอร์ซีเคียวริตี้ | Career Radar" });
    expect(md.alternates.canonical).toBe("/radar/cybersecurity/money");
    expect(JSON.stringify(md)).not.toMatch(DASH);
    expect(
      await levelRoute.generateMetadata({ params: Promise.resolve({ slug: "cybersecurity", page: "nope" }) })
    ).toEqual({});
  });

  it("404s an unknown level", async () => {
    process.env.VERCEL_ENV = "preview";
    await expect(
      levelRoute.default({ params: Promise.resolve({ slug: "cybersecurity", page: "nope" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("/radar/[slug] cover or deck", () => {
  const call = (slug: string, search: Record<string, string> = {}) =>
    fieldRoute.default({ params: Promise.resolve({ slug }), searchParams: Promise.resolve(search) }) as Promise<ReactElement>;

  it("shows the guide cover for a guide career, without the database", async () => {
    process.env.VERCEL_ENV = "preview";
    const el = await call("cybersecurity");
    expect(el.type).toBe(GuideCover);
    expect(getCachedPublishedRadarField).not.toHaveBeenCalled();
  });

  it("shows the deck for ?from=plan and ?view=deck", async () => {
    process.env.VERCEL_ENV = "preview";
    getCachedPublishedRadarField.mockResolvedValue(null);
    await expect(call("cybersecurity", { from: "plan" })).rejects.toThrow("NEXT_NOT_FOUND");
    await expect(call("cybersecurity", { view: "deck" })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getCachedPublishedRadarField).toHaveBeenCalledTimes(2);
  });

  it("shows the deck for a career without a guide, and for a draft guide on production", async () => {
    getCachedPublishedRadarField.mockResolvedValue(null);
    process.env.VERCEL_ENV = "preview";
    await expect(call("data-scientist")).rejects.toThrow("NEXT_NOT_FOUND");
    process.env.VERCEL_ENV = "production";
    await expect(call("cybersecurity")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getCachedPublishedRadarField).toHaveBeenCalledTimes(2);
  });

  it("cover metadata comes from code with an absolute title", async () => {
    process.env.VERCEL_ENV = "preview";
    const md = await fieldRoute.generateMetadata({ params: Promise.resolve({ slug: "cybersecurity" }) });
    expect(md.title).toEqual({ absolute: "ไซเบอร์ซีเคียวริตี้ ลองเล่น 11 ด่าน | Career Radar" });
    expect(md.alternates.canonical).toBe("/radar/cybersecurity");
    expect(getCachedPublishedRadarField).not.toHaveBeenCalled();
  });
});
