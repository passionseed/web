import { createOnboardingHandler } from "./handler";

class MockHeaders {
  private readonly values = new Map<string, string>();

  constructor(init?: Record<string, string>) {
    Object.entries(init ?? {}).forEach(([key, value]) => {
      this.values.set(key.toLowerCase(), value);
    });
  }

  get(name: string): string | null {
    return this.values.get(name.toLowerCase()) ?? null;
  }
}

class MockResponse {
  readonly status: number;
  readonly headers: MockHeaders;
  private readonly rawBody: string;

  constructor(body?: string | null, init?: { status?: number; headers?: Record<string, string> }) {
    this.status = init?.status ?? 200;
    this.headers = new MockHeaders(init?.headers);
    this.rawBody = body ?? "";
  }

  async json(): Promise<unknown> {
    return this.rawBody ? JSON.parse(this.rawBody) : null;
  }
}

describe("onboarding-chat handler", () => {
  const originalResponse = globalThis.Response;

  beforeAll(() => {
    (globalThis as { Response?: unknown }).Response = MockResponse;
  });

  afterAll(() => {
    (globalThis as { Response?: unknown }).Response = originalResponse;
  });

  function makeRequest(payload: unknown): Request {
    return {
      method: "POST",
      json: async () => payload,
    } as Request;
  }

  it("strips READY_FOR_INTERESTS token and transitions in chat mode", async () => {
    const callGemini = jest.fn().mockResolvedValue(
      "Great to hear that. What kind of projects make you lose track of time? [READY_FOR_INTERESTS]"
    );

    const handler = createOnboardingHandler(callGemini);

    const res = await handler(
      makeRequest({
        mode: "chat",
        chat_history: [{ role: "user", parts: [{ text: "I like helping people" }] }],
        user_context: { name: "Nina", education_level: "high_school" },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      message: "Great to hear that. What kind of projects make you lose track of time?",
      action: "transition_to_interests",
    });
  });

  it("returns parsed categories in generate_interests mode", async () => {
    const callGemini = jest.fn().mockResolvedValue(
      '```json\n{"categories":[{"name":"System Architect","statements":["I like systems","I like clarity","I like plans","I like patterns","I like structure","I like debugging"]}]}\n```'
    );

    const handler = createOnboardingHandler(callGemini);

    const res = await handler(
      makeRequest({
        mode: "generate_interests",
        chat_history: [{ role: "user", parts: [{ text: "I enjoy solving complex problems" }] }],
        user_context: { name: "Nina", education_level: "high_school" },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.action).toBe("show_interest_categories");
    expect(body.action_data.categories).toHaveLength(1);
    expect(body.action_data.categories[0].name).toBe("System Architect");
  });

  it("uses selected interests to suggest careers", async () => {
    const callGemini = jest.fn().mockResolvedValue(
      '{"careers":["Product Designer","UX Researcher","Learning Experience Designer","Community Builder","Service Designer","Innovation Strategist"]}'
    );

    const handler = createOnboardingHandler(callGemini);

    const res = await handler(
      makeRequest({
        mode: "suggest_careers",
        chat_history: [],
        user_context: {
          name: "Nina",
          education_level: "high_school",
          selected_interests: ["I like solving user problems", "I enjoy interviewing people"],
        },
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.action).toBe("show_career_suggestions");
    expect(body.action_data.careers).toContain("Product Designer");

    expect(callGemini).toHaveBeenCalledTimes(1);
    const [, history] = callGemini.mock.calls[0];
    expect(history[0].parts[0].text).toContain("I like solving user problems");
  });

  it("returns bad request for unknown mode with CORS header", async () => {
    const callGemini = jest.fn();
    const handler = createOnboardingHandler(callGemini);

    const res = await handler(
      makeRequest({
        mode: "invalid_mode",
        chat_history: [],
        user_context: { name: "Nina", education_level: "high_school" },
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(String(body.error)).toContain("Unknown mode");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns error when Gemini response does not contain JSON", async () => {
    const callGemini = jest.fn().mockResolvedValue("not-json");
    const handler = createOnboardingHandler(callGemini);

    const res = await handler(
      makeRequest({
        mode: "generate_interests",
        chat_history: [],
        user_context: { name: "Nina", education_level: "high_school" },
      })
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(String(body.error)).toContain("No JSON");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("handles preflight OPTIONS", async () => {
    const handler = createOnboardingHandler(jest.fn());
    const res = await handler({ method: "OPTIONS" } as Request);

    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain("content-type");
  });
});
