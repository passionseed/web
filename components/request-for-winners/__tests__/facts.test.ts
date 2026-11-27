import {
  RFW,
  maybeThaiDate,
  opensLine,
  priceLine,
  thaiDateWithYear,
  weekLines,
} from "../facts";

describe("Request for Winners facts", () => {
  it("prints a date with weekday and Buddhist-era year", () => {
    expect(thaiDateWithYear("2026-12-12")).toMatch(/12 .+ 2569$/);
  });

  it("opens after Elemental's Demo Day, with no guessed date", () => {
    expect(RFW.opensOn).toBeNull();
    expect(opensLine()).toMatch(/^หลัง Demo Day ของ Elemental \(.*12 .+ 2569\)$/);
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
