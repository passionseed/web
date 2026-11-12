type UnstableCacheCall = [
  callback: (...args: never[]) => unknown,
  keyParts?: string[],
  options?: unknown,
];

async function captureRadarCacheKeys(preview: boolean): Promise<string[][]> {
  jest.resetModules();

  const unstableCache = jest.fn(
    (callback: (...args: never[]) => unknown) => callback
  );

  jest.doMock("server-only", () => ({}));
  jest.doMock("next/cache", () => ({ unstable_cache: unstableCache }));
  jest.doMock("@/lib/radar/preview", () => ({
    isRadarPreview: () => preview,
    radarReadClient: jest.fn(),
    wherePublished: <T>(query: T) => query,
  }));

  await import("../territory");
  await import("../server");

  return unstableCache.mock.calls.map(
    (call) => (call as UnstableCacheCall)[1] ?? []
  );
}

describe("Radar cache preview isolation", () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock("server-only");
    jest.dontMock("next/cache");
    jest.dontMock("@/lib/radar/preview");
  });

  it("tags the field skills cache so field and territory edits refresh it", async () => {
    jest.resetModules();
    const unstableCache = jest.fn((callback: (...args: never[]) => unknown) => callback);
    jest.doMock("server-only", () => ({}));
    jest.doMock("next/cache", () => ({ unstable_cache: unstableCache }));
    jest.doMock("@/lib/radar/preview", () => ({
      isRadarPreview: () => false,
      radarReadClient: jest.fn(),
      wherePublished: <T>(query: T) => query,
    }));
    await import("../server");

    // server.ts imports territory.ts, whose two caches register first.
    const options = unstableCache.mock.calls
      .slice(-2)
      .map((call) => (call as UnstableCacheCall)[2] as { revalidate: number; tags: string[] });
    expect(options).toEqual([
      { revalidate: 300, tags: ["published-radar-fields"] },
      { revalidate: 300, tags: ["published-radar-fields", "radar-territories"] },
    ]);
  });

  it.each([false, true])(
    "includes preview=%s in every persisted cache key",
    async (preview) => {
      const keys = await captureRadarCacheKeys(preview);

      expect(keys).toEqual([
        ["radar-territory-v1", String(preview)],
        ["radar-skill-index-v1", String(preview)],
        ["published-radar-field-v8", String(preview)],
        ["radar-field-skills-v1", String(preview)],
      ]);
    }
  );
});
