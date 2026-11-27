import { deviceTickLeft, meterModeFor, meterTitle } from "../Progress";

describe("deviceTickLeft: the strip fills column by column", () => {
  it("puts 10, 25 and 50 devices at 20%, 52% and 100%", () => {
    expect(deviceTickLeft(10)).toBe("20%");
    expect(deviceTickLeft(25)).toBe("52%");
    expect(deviceTickLeft(50)).toBe("100%");
    expect(deviceTickLeft(80)).toBe("100%");
  });
});

describe("meterModeFor", () => {
  it("greys a link out when its seat is taken, it was turned down, or sign-up closed short", () => {
    expect(meterModeFor({ seat: { state: "open" } }, true)).toBe("open");
    expect(meterModeFor({ seat: { state: "taken" } }, true)).toBe("gone");
    expect(meterModeFor({ seat: { state: "rejected" } }, true)).toBe("rejected");
    expect(meterModeFor({ seat: { state: "open" } }, false)).toBe("closed");
    // A seat this link already won stays as it is after close.
    expect(meterModeFor({ seat: { state: "checking", recipient: { who: "self" } } }, false)).toBe("open");
  });
});

describe("meterTitle", () => {
  it("says what's left, then stops at close", () => {
    expect(meterTitle({ devices: 12, paid: 0 }, "student")).toBe("ที่นั่งฟรี: อีก 38 เครื่อง + 3 คนจ่าย");
    expect(meterTitle({ devices: 50, paid: 2 }, "student")).toBe("ที่นั่งฟรี: อีก 1 คนจ่าย");
    expect(meterTitle({ devices: 44, paid: 2 }, "student", "closed")).toBe("ปิดนับแล้ว");
    expect(meterTitle({ devices: 52, paid: 1 }, "teacher", "gone")).toBeNull();
    expect(meterTitle({ devices: 23, paid: 1 }, "teacher")).toBe("Demo Day: อีก 27 เครื่อง");
  });
});
