import {
  QUIZ_ELEMENTS,
  QUIZ_QUESTIONS,
  QUIZ_RESULTS,
  daysLeftToSignUp,
  isQuizElement,
  quizJoinHref,
  scoreQuiz,
} from "../quiz";

describe("Elemental quiz", () => {
  it("gives every question one answer per element", () => {
    for (const q of QUIZ_QUESTIONS) {
      expect(q.answers.map((a) => a.element).sort()).toEqual([...QUIZ_ELEMENTS].sort());
    }
  });

  it("doesn't always put the same element first", () => {
    const firsts = new Set(QUIZ_QUESTIONS.map((q) => q.answers[0].element));
    expect(firsts.size).toBeGreaterThan(3);
  });

  it("has a result for every element, and each element is needed by exactly one other", () => {
    const needed = QUIZ_ELEMENTS.map((el) => QUIZ_RESULTS[el].needs).sort();
    expect(needed).toEqual([...QUIZ_ELEMENTS].sort());
    for (const el of QUIZ_ELEMENTS) expect(QUIZ_RESULTS[el].needs).not.toBe(el);
  });

  it("keeps em dashes out of the copy", () => {
    const copy = JSON.stringify([QUIZ_QUESTIONS, QUIZ_RESULTS]);
    expect(copy).not.toContain("—");
  });

  it("scores the element picked most", () => {
    expect(scoreQuiz(["fire", "water", "water", "earth", "water", "air", "aether", "fire"])).toBe("water");
  });

  it("breaks a tie with the tied element picked last", () => {
    expect(scoreQuiz(["fire", "water", "fire", "water"])).toBe("water");
    expect(scoreQuiz(["water", "fire", "water", "fire", "air"])).toBe("fire");
  });

  it("checks element keys from the URL", () => {
    expect(isQuizElement("aether")).toBe(true);
    expect(isQuizElement("metal")).toBe(false);
  });

  it("tags sign-up links with the quiz source and the element", () => {
    expect(quizJoinHref("air")).toBe("/hackathon/join?src=quiz&utm_campaign=quiz&utm_content=air");
  });

  it("counts Bangkok days left, including the closing day", () => {
    // 2026-11-24 10:00 Bangkok.
    expect(daysLeftToSignUp("2026-12-03", new Date("2026-11-24T03:00:00Z"))).toBe(10);
    // 2026-12-03 23:00 Bangkok is still the closing day.
    expect(daysLeftToSignUp("2026-12-03", new Date("2026-12-03T16:00:00Z"))).toBe(1);
    // 2026-12-04 00:30 Bangkok: closed.
    expect(daysLeftToSignUp("2026-12-03", new Date("2026-12-03T17:30:00Z"))).toBe(0);
  });
});
