import { seatProgressView, type SeatRow } from "@/lib/hackathon/elemental/share-rules";

import { deviceTickLeft, meterTitle } from "../Progress";

const me = "aaaaaaaa-0000-4000-8000-000000000001";
const row = (index: number, status: SeatRow["status"], recipient: string | null = null): SeatRow => ({ id: `s${index}`, index, status, recipientRegistrationId: recipient });
const view = (devices: number, paid: number, rows: SeatRow[] = [], phase: "open" | "after-close" = "open") =>
  seatProgressView({ progress: { devices, paid }, rows, ownRegistrationId: me, selfPaid: false, phase });

describe("deviceTickLeft: the strip fills column by column", () => {
  it("puts 10, 25 and 50 devices at 20%, 52% and 100%", () => {
    expect(deviceTickLeft(10)).toBe("20%");
    expect(deviceTickLeft(25)).toBe("52%");
    expect(deviceTickLeft(50)).toBe("100%");
    expect(deviceTickLeft(80)).toBe("100%");
  });
});

describe("meterTitle: what's left, in words", () => {
  it("counts down to seat 1", () => {
    expect(meterTitle(view(12, 0))).toBe("อีก 38 เครื่อง + 1 คนจ่าย = ที่นั่งฟรีที่ 1");
    expect(meterTitle(view(50, 0))).toBe("อีก 1 คนจ่าย = ที่นั่งฟรีที่ 1");
  });

  it("after seat 1, counts down to seat 2", () => {
    expect(meterTitle(view(62, 1, [row(1, "confirmed", me)]))).toBe("ได้ 1 ที่ · อีก 38 เครื่อง + 1 คนจ่าย = ที่ 2");
  });

  it("says when both are earned, and stops at close", () => {
    expect(meterTitle(view(112, 3, [row(1, "confirmed", me), row(2, "qualified", "5e6f7a8b-0000-4000-8000-000000000002")]))).toBe("ได้ครบ 2 ที่แล้ว");
    expect(meterTitle(view(44, 1, [], "after-close"))).toBe("ปิดนับแล้ว");
    expect(meterTitle(view(74, 1, [row(1, "confirmed", me)], "after-close"))).toBe("ปิดนับแล้ว · ได้ 1 ที่");
  });
});
