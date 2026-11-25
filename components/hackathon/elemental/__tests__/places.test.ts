import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";

import { PLACES, placeFor, ticketNumber } from "../places";

const token = "0123456789abcdef0123456789abcdef";

describe("placeFor", () => {
  it("gives everyone in a full team a different place", () => {
    const srcs = Array.from({ length: ELEMENTAL.maxGroupSize }, (_, i) => placeFor(token, i).src);
    expect(new Set(srcs).size).toBe(ELEMENTAL.maxGroupSize);
  });

  it("picks the same place for the same person every time", () => {
    expect(placeFor(token, null)).toBe(placeFor(token, null));
    expect(PLACES).toContain(placeFor(token, null));
  });
});

describe("ticketNumber", () => {
  it("is six characters, stable, and not part of the token", () => {
    const n = ticketNumber(token);
    expect(n).toMatch(/^[0-9A-Z]{6}$/);
    expect(ticketNumber(token)).toBe(n);
    expect(token.toUpperCase()).not.toContain(n);
  });
});
