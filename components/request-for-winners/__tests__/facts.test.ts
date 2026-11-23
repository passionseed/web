import {
  RFW,
  maybeThaiDate,
  priceLine,
  thaiDateWithYear,
  weekLines,
} from "../facts";

describe("Request for Winners facts", () => {
  it("prints the opening date with weekday and Buddhist-era year", () => {
    expect(thaiDateWithYear(RFW.opensOn)).toMatch(/11 .+ 2569$/);
  });

  it("leaves unknown dates and prices empty instead of guessing", () => {
    expect(maybeThaiDate(null)).toBeNull();
    expect(priceLine(null)).toBeNull();
  });

  it("formats a known price", () => {
    expect(priceLine(0)).toBe("ฟรี");
    expect(priceLine(1500)).toBe("฿1,500");
  });

  it("gives one line per week, empty where a week isn't planned", () => {
    expect(weekLines(4, null)).toEqual([null, null, null, null]);
    expect(weekLines(3, ["a"])).toEqual(["a", null, null]);
  });
});
