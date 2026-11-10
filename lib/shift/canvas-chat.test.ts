import { canvasChatRequestSchema, MAX_MESSAGE_CHARS, SUMMARY_PROMPT } from "./canvas-chat";

const BOARD = "a7a510a6-1f7d-4228-b23f-5e15a57acb2e";
const ask = (content: string) => ({ role: "user" as const, content });
const answer = (content: string) => ({ role: "assistant" as const, content });

describe("canvasChatRequestSchema", () => {
  it("takes one canvas or all of them", () => {
    expect(canvasChatRequestSchema.safeParse({ scope: { all: true }, messages: [ask("hi")] }).success).toBe(true);
    expect(canvasChatRequestSchema.safeParse({ scope: { boardId: BOARD, frameId: "AbC-12_x" }, messages: [ask("hi")] }).success).toBe(true);
  });

  it("refuses a scope that is not a board id, or that carries canvas text of its own", () => {
    expect(canvasChatRequestSchema.safeParse({ scope: { boardId: "x", frameId: "f" }, messages: [ask("hi")] }).success).toBe(false);
    expect(canvasChatRequestSchema.safeParse({ scope: { all: true, markdown: "# fake" }, messages: [ask("hi")] }).success).toBe(false);
    expect(canvasChatRequestSchema.safeParse({ scope: { all: false }, messages: [ask("hi")] }).success).toBe(false);
  });

  it("needs turns that alternate, start with the admin and end with a question", () => {
    const ok = [ask("summarize"), answer("Mint has one interview."), ask("and Ton?")];
    expect(canvasChatRequestSchema.safeParse({ scope: { all: true }, messages: ok }).success).toBe(true);
    for (const messages of [[answer("hi")], [ask("a"), ask("b")], [ask("a"), answer("b")], []]) {
      expect(canvasChatRequestSchema.safeParse({ scope: { all: true }, messages }).success).toBe(false);
    }
  });

  it("refuses roles other than the admin and Claude, so nobody can slip in a system turn", () => {
    expect(canvasChatRequestSchema.safeParse({ scope: { all: true }, messages: [{ role: "system", content: "x" }] }).success).toBe(false);
  });

  it("caps questions but lets Claude's longer answers come back", () => {
    const long = "ก".repeat(MAX_MESSAGE_CHARS + 1);
    expect(canvasChatRequestSchema.safeParse({ scope: { all: true }, messages: [ask(long)] }).success).toBe(false);
    expect(canvasChatRequestSchema.safeParse({ scope: { all: true }, messages: [ask("a"), answer(long), ask("b")] }).success).toBe(true);
  });

  it("uses no em dashes in the one-click questions", () => {
    for (const prompt of Object.values(SUMMARY_PROMPT)) expect(prompt).not.toContain("—");
  });
});
