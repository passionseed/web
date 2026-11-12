import { attendanceFrom } from "./attendance";

const card = (kind: string, createdBy: string, isDeleted = false) => ({ isDeleted, customData: { card: kind, createdBy } });

describe("attendanceFrom", () => {
  it("compares bookings with cards on the room board", () => {
    const result = attendanceFrom(
      [
        card("arrive", "mint"),
        card("arrive", "beam"),
        card("help", "beam"),
        card("helped", "mint"),
        card("close", "mint"),
        card("close", "walkin"),
        card("arrive", "ghost", true),
        { customData: { createdBy: "mint" } },
      ],
      ["mint", "beam", "noshow"],
    );
    expect(result).toMatchObject({
      booked: 3,
      arrived: 3,
      bookedArrived: 2,
      walkIns: 1,
      askedHelp: 1,
      gaveHelp: 1,
      closed: 2,
    });
  });
});

describe("example cards from the template", () => {
  const example = { id: "c1", customData: { card: "arrive", example: true, createdBy: "host" } };
  const text = (value: string, updatedBy: string) => ({ id: "t1", containerId: "c1", text: value, customData: { updatedBy } });

  it("don't count until someone writes on them, even when wrapped", () => {
    expect(attendanceFrom([example, text("👋 วันนี้อยากทำอะไรให้เสร็จ?", "host")], []).arrived).toBe(0);
    const wrapped = { ...text("👋 วันนี้อยาก\nทำอะไรให้\nเสร็จ?", "host"), originalText: "👋 วันนี้อยากทำอะไรให้เสร็จ?\n\n" };
    expect(attendanceFrom([example, wrapped], []).arrived).toBe(0);
  });

  it("count for whoever wrote on them", () => {
    const result = attendanceFrom([example, text("👋 วันนี้อยากทำอะไรให้เสร็จ?\nทำสไลด์", "mint")], ["mint"]);
    expect(result).toMatchObject({ arrived: 1, bookedArrived: 1 });
  });
});
