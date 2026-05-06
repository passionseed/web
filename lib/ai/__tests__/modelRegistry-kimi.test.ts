/** @jest-environment node */

import { getModel, normalizeModelName, AVAILABLE_MODELS, getAllModels } from "@/lib/ai/modelRegistry";
import { generateText } from "ai";

const RUN_LIVE_TESTS = process.env.RUN_LIVE_AI_MODEL_TESTS === "true";

describe("Kimi model provider", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("getModel('kimi-for-coding') returns a configured model instance", () => {
    const model = getModel("kimi-for-coding");
    expect(model).toBeDefined();
    expect(model).not.toBeNull();
    // It should NOT be the Google fallback
    const googleFallback = getModel("gemini-3-flash-preview");
    expect(model).not.toBe(googleFallback);
  });

  it("missing KIMI_API_KEY throws a clear error mentioning the missing key", () => {
    delete process.env.KIMI_API_KEY;
    // Re-import to pick up the missing env var
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getModel: getModelFresh } = require("@/lib/ai/modelRegistry");
      expect(() => getModelFresh("kimi-for-coding")).toThrow(/KIMI_API_KEY/i);
    });
  });

  it("Kimi appears in AVAILABLE_MODELS registry with provider: 'kimi'", () => {
    expect(AVAILABLE_MODELS).toHaveProperty("kimi");
    const kimiModels = (AVAILABLE_MODELS as Record<string, Array<{ id: string }>>)["kimi"];
    expect(kimiModels).toBeInstanceOf(Array);
    expect(kimiModels.length).toBeGreaterThan(0);
    expect(kimiModels.some((m) => m.id === "kimi-for-coding")).toBe(true);
  });

  it("normalizeModelName('kimi-for-coding') resolves correctly", () => {
    expect(normalizeModelName("kimi-for-coding")).toBe("kimi-for-coding");
  });

  it("Kimi provider does not break existing providers (regression gate)", () => {
    const google = getModel("gemini-3-flash-preview");
    const anthropic = getModel("claude-haiku-4-5");
    const minimax = getModel("minimax-m2-highspeed");
    const openai = getModel("gpt-5-mini-2025-08-07");

    expect(google).toBeDefined();
    expect(anthropic).toBeDefined();
    expect(minimax).toBeDefined();
    expect(openai).toBeDefined();

    const kimi = getModel("kimi-for-coding");
    expect(kimi).not.toBe(google);
    expect(kimi).not.toBe(anthropic);
    expect(kimi).not.toBe(minimax);
    expect(kimi).not.toBe(openai);
  });

  it("getAllModels includes kimi with correct provider", () => {
    const all = getAllModels();
    const kimiEntry = all.find((m) => m.id === "kimi-for-coding");
    expect(kimiEntry).toBeDefined();
    expect(kimiEntry?.provider).toBe("kimi");
  });
});

const describeLive = RUN_LIVE_TESTS ? describe : describe.skip;

describeLive("Kimi model provider — live integration", () => {
  jest.setTimeout(60_000);

  it("Kimi model supports multimodal input (text + images)", async () => {
    const model = getModel("kimi-for-coding");

    const result = await generateText({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Describe this image in one word." },
            {
              type: "image",
              image: new Uint8Array([0x89, 0x50, 0x4e, 0x47]), // PNG magic bytes
            },
          ],
        },
      ],
    });

    expect(result.text).toBeDefined();
    expect(typeof result.text).toBe("string");
  });

  it("Kimi model resolves through full chain to live API", async () => {
    const resolvedName = normalizeModelName("kimi-for-coding");
    expect(resolvedName).toBe("kimi-for-coding");

    const model = getModel(resolvedName);
    expect(model).toBeDefined();

    const result = await generateText({
      model,
      prompt: "Say 'hello from kimi' and nothing else.",
    });

    expect(result.text).toBeDefined();
    expect(typeof result.text).toBe("string");
    expect(result.text.toLowerCase()).toContain("kimi");
  });
});
