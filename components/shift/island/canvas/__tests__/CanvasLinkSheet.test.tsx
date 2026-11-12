import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";

import { linkCanvas, listMyCanvases, unlinkCanvas } from "@/app/shift/island/actions";
import type { CanvasChoice } from "@/lib/shift-island/quest-canvas";

import { CanvasLinkSheet } from "../CanvasLinkSheet";

jest.mock("@/app/shift/island/actions", () => ({
  listMyCanvases: jest.fn(),
  linkCanvas: jest.fn(),
  unlinkCanvas: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../../IslandSheet", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandSheet: ({ open, title, description, children }: { open: boolean; title: string; description?: string; children: unknown }) =>
      open
        ? createElement("div", { role: "dialog", "aria-label": title }, createElement("p", null, description), children as never)
        : null,
  };
});

const mockedList = listMyCanvases as jest.MockedFunction<typeof listMyCanvases>;
const mockedLink = linkCanvas as jest.MockedFunction<typeof linkCanvas>;
const mockedUnlink = unlinkCanvas as jest.MockedFunction<typeof unlinkCanvas>;

const BOARD = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const choice = (over: Partial<CanvasChoice>): CanvasChoice => ({
  boardId: BOARD,
  frameId: "f1",
  title: "Lamp project",
  boardTitle: "ห้อง 5/1",
  role: "owner",
  lastEdited: Date.UTC(2026, 10, 11, 18, 30),
  notes: 4,
  versions: 2,
  linked: false,
  ...over,
});

beforeEach(() => {
  mockedList.mockReset();
  mockedLink.mockReset().mockResolvedValue({ ok: true, data: null });
  mockedUnlink.mockReset().mockResolvedValue({ ok: true, data: null });
});

describe("CanvasLinkSheet", () => {
  it("does not load anything while closed", () => {
    render(<CanvasLinkSheet open={false} link={{ linked: false }} onClose={jest.fn()} onLinked={jest.fn()} />);
    expect(mockedList).not.toHaveBeenCalled();
  });

  it("loads the student's canvases on open and lists them with board, date, notes and role", async () => {
    mockedList.mockResolvedValue({
      ok: true,
      data: [choice({}), choice({ frameId: "f2", title: "Zine", role: "team", boardTitle: "บอร์ดกลุ่ม", lastEdited: null, notes: 0 })],
    });
    render(<CanvasLinkSheet open link={{ linked: false }} onClose={jest.fn()} onLinked={jest.fn()} />);
    expect(screen.getByRole("dialog", { name: "เชื่อมแคนวาส" })).toBeInTheDocument();
    expect(screen.getByText("เห็นเฉพาะแคนวาสที่คุณเป็นเจ้าของหรืออยู่ในทีม")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "กำลังหาแคนวาสของคุณ" })).toBeInTheDocument();
    expect(await screen.findByText("Lamp project")).toBeInTheDocument();
    expect(screen.getByText(/^บอร์ด ห้อง 5\/1 · แก้ล่าสุด 12 พ\.ย\. · โน้ต 4 ใบ$/)).toBeInTheDocument();
    expect(screen.getByText("บอร์ด บอร์ดกลุ่ม · โน้ต 0 ใบ")).toBeInTheDocument();
    expect(screen.getByText("เจ้าของ")).toBeInTheDocument();
    expect(screen.getByText("ทีม")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "เชื่อมแคนวาสนี้" })).toHaveLength(2);
    expect(screen.getByText("เพื่อนในทีมเควสต์จะเห็นโน้ตเมื่ออยู่ในทีมของแคนวาสด้วย")).toBeInTheDocument();
    expect(mockedList).toHaveBeenCalledTimes(1);
  });

  it("links the chosen canvas by its ids only", async () => {
    mockedList.mockResolvedValue({ ok: true, data: [choice({})] });
    const onLinked = jest.fn();
    render(<CanvasLinkSheet open link={{ linked: false }} onClose={jest.fn()} onLinked={onLinked} />);
    fireEvent.click(await screen.findByRole("button", { name: "เชื่อมแคนวาสนี้" }));
    await waitFor(() => expect(mockedLink).toHaveBeenCalledWith({ boardId: BOARD, frameId: "f1" }));
    await waitFor(() => expect(onLinked).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalled();
  });

  it("marks the linked canvas and lets the student unlink it", async () => {
    mockedList.mockResolvedValue({ ok: true, data: [choice({ linked: true })] });
    render(<CanvasLinkSheet open link={{ linked: true, linkedAt: "2026-11-11T01:00:00Z" }} onClose={jest.fn()} onLinked={jest.fn()} />);
    expect(await screen.findByText("เชื่อมอยู่")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "เชื่อมแคนวาสนี้" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "เลิกเชื่อม" }));
    await waitFor(() => expect(mockedUnlink).toHaveBeenCalled());
    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(2));
  });

  it("shows the refusal and reloads the list when linking is refused", async () => {
    mockedList.mockResolvedValue({ ok: true, data: [choice({})] });
    mockedLink.mockResolvedValue({ ok: false, code: "canvas_not_yours", error: "คุณยังไม่ได้อยู่ในทีมของแคนวาสนี้" });
    const onLinked = jest.fn();
    render(<CanvasLinkSheet open link={{ linked: false }} onClose={jest.fn()} onLinked={onLinked} />);
    fireEvent.click(await screen.findByRole("button", { name: "เชื่อมแคนวาสนี้" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("คุณยังไม่ได้อยู่ในทีมของแคนวาสนี้"));
    expect(onLinked).not.toHaveBeenCalled();
    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(2));
  });

  it("shows the empty state with a way to the whiteboard", async () => {
    mockedList.mockResolvedValue({ ok: true, data: [] });
    render(<CanvasLinkSheet open link={{ linked: false }} onClose={jest.fn()} onLinked={jest.fn()} />);
    expect(
      await screen.findByText("ยังไม่มีแคนวาสที่คุณเป็นเจ้าของหรืออยู่ในทีม สร้างแคนวาสโปรเจกต์บนไวท์บอร์ดก่อน")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "เปิดไวท์บอร์ด" })).toHaveAttribute("href", "/whiteboard");
  });

  it("offers unlinking when the linked canvas is no longer in the list", async () => {
    mockedList.mockResolvedValue({ ok: true, data: [] });
    render(<CanvasLinkSheet open link={{ linked: true, linkedAt: "2026-11-11T01:00:00Z" }} onClose={jest.fn()} onLinked={jest.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "เลิกเชื่อม" }));
    await waitFor(() => expect(mockedUnlink).toHaveBeenCalled());
  });

  it("shows one quiet line on failure, with a retry", async () => {
    mockedList.mockResolvedValueOnce({ ok: false, code: "canvas_unavailable", error: "x" }).mockResolvedValueOnce({ ok: true, data: [] });
    render(<CanvasLinkSheet open link={{ linked: false }} onClose={jest.fn()} onLinked={jest.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("โหลดรายการแคนวาสไม่ได้ตอนนี้");
    fireEvent.click(screen.getByRole("button", { name: "ลองอีกครั้ง" }));
    await waitFor(() => expect(mockedList).toHaveBeenCalledTimes(2));
  });
});
