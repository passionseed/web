import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";

import { askForHelp } from "@/app/shift/island/actions";

import { clearAllDrafts } from "../drafts";
import { StuckSheet } from "../StuckSheet";

jest.mock("@/app/shift/island/actions", () => ({ askForHelp: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../IslandSheet", () => {
  const { createElement } = jest.requireActual<typeof import("react")>("react");
  return {
    IslandSheet: ({ open, title, description, children }: { open: boolean; title: string; description?: string; children: unknown }) =>
      open
        ? createElement("div", { role: "dialog", "aria-label": title }, createElement("p", null, description), children as never)
        : null,
  };
});

const mockedAsk = askForHelp as jest.MockedFunction<typeof askForHelp>;
const instanceId = "11111111-1111-4111-8111-000000000002";

beforeEach(() => {
  clearAllDrafts();
  mockedAsk.mockResolvedValue({ ok: true, data: { helpId: "h" } });
});

describe("StuckSheet", () => {
  it("offers only group spaces and says there is no private chat", () => {
    render(<StuckSheet open target={{ instanceId, title: "ลงมือสร้างชิ้นแรก" }} onClose={jest.fn()} />);
    expect(screen.getByRole("dialog", { name: "ติดตรงไหน" })).toBeInTheDocument();
    expect(screen.getByText("เรื่อง: ลงมือสร้างชิ้นแรก")).toBeInTheDocument();
    const choices = screen.getAllByRole("radio");
    expect(choices).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "ถามเพื่อนในห้องช่วยเหลือ" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "ถามทีมพี่เลี้ยง" })).not.toBeChecked();
    expect(screen.getByText("เพื่อนทุกคนในห้องช่วยเหลือจะเห็นข้อความนี้ ไม่มีแชตส่วนตัว")).toBeInTheDocument();
    expect(screen.getByLabelText("เล่าสั้นๆ ว่าติดอะไร และลองอะไรไปแล้ว")).toHaveAttribute("maxLength", "1000");
  });

  it("sends the summary, the group and this quest's instance", async () => {
    const onClose = jest.fn();
    render(<StuckSheet open target={{ instanceId, title: "ลงมือสร้างชิ้นแรก" }} onClose={onClose} />);
    fireEvent.change(screen.getByLabelText("เล่าสั้นๆ ว่าติดอะไร และลองอะไรไปแล้ว"), { target: { value: "deploy ไม่ขึ้น ลองล้าง cache แล้ว" } });
    fireEvent.click(screen.getByRole("radio", { name: "ถามทีมพี่เลี้ยง" }));
    expect(screen.getByText("ทีมพี่เลี้ยงจะเห็นในห้องของทีมงาน ไม่มีแชตส่วนตัว")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ส่งคำขอ" }));
    await waitFor(() =>
      expect(mockedAsk).toHaveBeenCalledWith({ summary: "deploy ไม่ขึ้น ลองล้าง cache แล้ว", visibility: "mentors", instanceId }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ส่งแล้ว ทีมพี่เลี้ยงจะตอบกลับในกล่องข้อความของบอท"));
    expect(onClose).toHaveBeenCalled();
  });

  it("can ask without a quest attached", async () => {
    render(<StuckSheet open target={{ instanceId: null, title: null }} onClose={jest.fn()} />);
    fireEvent.change(screen.getByLabelText("เล่าสั้นๆ ว่าติดอะไร และลองอะไรไปแล้ว"), { target: { value: "ไม่รู้จะเริ่มตรงไหน" } });
    fireEvent.click(screen.getByRole("button", { name: "ส่งคำขอ" }));
    await waitFor(() => expect(mockedAsk).toHaveBeenCalledWith({ summary: "ไม่รู้จะเริ่มตรงไหน", visibility: "community", instanceId: null }));
  });

  it("asks for a summary first", async () => {
    render(<StuckSheet open target={{ instanceId: null, title: null }} onClose={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "ส่งคำขอ" }));
    expect(await screen.findByText("เล่าสั้นๆ ก่อนส่ง")).toBeInTheDocument();
    expect(mockedAsk).not.toHaveBeenCalled();
  });

  it("keeps the unsent text when the sheet closes by accident, and drops it once sent", async () => {
    const target = { instanceId: null, title: null };
    const { rerender } = render(<StuckSheet open target={target} onClose={jest.fn()} />);
    const label = "เล่าสั้นๆ ว่าติดอะไร และลองอะไรไปแล้ว";
    fireEvent.change(screen.getByLabelText(label), { target: { value: "ข้อความยาวที่พิมพ์ไว้" } });
    rerender(<StuckSheet open={false} target={target} onClose={jest.fn()} />);
    rerender(<StuckSheet open target={target} onClose={jest.fn()} />);
    expect(screen.getByLabelText(label)).toHaveValue("ข้อความยาวที่พิมพ์ไว้");
    fireEvent.click(screen.getByRole("button", { name: "ส่งคำขอ" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("ส่งแล้ว เพื่อนๆ จะตอบในห้องช่วยเหลือ"));
    rerender(<StuckSheet open={false} target={target} onClose={jest.fn()} />);
    rerender(<StuckSheet open target={target} onClose={jest.fn()} />);
    expect(screen.getByLabelText(label)).toHaveValue("");
  });
});
