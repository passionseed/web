import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { toast } from "sonner";

import { createProject, respondInvite } from "@/app/shift/island/actions";
import { NoProject } from "../NoProject";

jest.mock("@/app/shift/island/actions", () => ({ createProject: jest.fn(), respondInvite: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockedCreate = createProject as jest.MockedFunction<typeof createProject>;
const mockedRespond = respondInvite as jest.MockedFunction<typeof respondInvite>;

const invite = { projectId: "77777777-7777-4777-8777-000000000001", name: "สวนผักดาดฟ้า", route: "service" as const, inviter: "Ploy" };

beforeEach(() => {
  mockedCreate.mockResolvedValue({ ok: true, data: { projectId: "p" } });
  mockedRespond.mockResolvedValue({ ok: true, data: null });
});

describe("NoProject", () => {
  it("is the claim form only: the island stays behind the sheet", () => {
    render(<NoProject invites={[]} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByRole("button", { name: /แปลง/ })).toBeNull();
    expect(screen.getByRole("region", { name: "จับจองที่ดินบนเกาะ" })).toHaveAttribute("id", "island-claim");
    expect(screen.getByLabelText("ชื่อโปรเจกต์")).toHaveAttribute("maxLength", "80");
    expect(screen.getByLabelText("อยากให้มันไปถึงไหน (ไม่บังคับ)")).toHaveAttribute("maxLength", "500");
    expect(screen.getAllByRole("radio")).toHaveLength(4);
  });

  it("hands its name field to the sheet, so the sheet can focus it", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<NoProject invites={[]} nameInput={ref} />);
    expect(ref.current).toBe(screen.getByLabelText("ชื่อโปรเจกต์"));
  });

  it("creates a project with a name, a route and an optional ambition", async () => {
    render(<NoProject invites={[]} />);
    fireEvent.change(screen.getByLabelText("ชื่อโปรเจกต์"), { target: { value: "  แอปจองห้องสมุด  " } });
    fireEvent.click(screen.getByRole("radio", { name: "ซอฟต์แวร์" }));
    fireEvent.click(screen.getByRole("button", { name: "จับจองที่ดิน" }));
    await waitFor(() => expect(mockedCreate).toHaveBeenCalledWith({ name: "แอปจองห้องสมุด", route: "software", ambition: null }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("จับจองที่ดินแล้ว ต้นไม้ของคุณเริ่มจากเมล็ด"));
  });

  it("sends the ambition when there is one", async () => {
    render(<NoProject invites={[]} />);
    fireEvent.change(screen.getByLabelText("ชื่อโปรเจกต์"), { target: { value: "เพลงประจำโรงเรียน" } });
    fireEvent.click(screen.getByRole("radio", { name: "งานสร้างสรรค์" }));
    fireEvent.change(screen.getByLabelText("อยากให้มันไปถึงไหน (ไม่บังคับ)"), { target: { value: "เปิดในงานกีฬาสี" } });
    fireEvent.click(screen.getByRole("button", { name: "จับจองที่ดิน" }));
    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith({ name: "เพลงประจำโรงเรียน", route: "creative", ambition: "เปิดในงานกีฬาสี" }),
    );
  });

  it("asks for a name and a route before calling the server", async () => {
    render(<NoProject invites={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "จับจองที่ดิน" }));
    expect(await screen.findByText("ตั้งชื่อโปรเจกต์ก่อน")).toBeInTheDocument();
    expect(screen.getByText("เลือกเส้นทางหนึ่งอย่าง")).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("shows the server's Thai error", async () => {
    mockedCreate.mockResolvedValueOnce({ ok: false, code: "island_full", error: "เกาะเต็มแล้วตอนนี้" });
    render(<NoProject invites={[]} />);
    fireEvent.change(screen.getByLabelText("ชื่อโปรเจกต์"), { target: { value: "แอปจองห้องสมุด" } });
    fireEvent.click(screen.getByRole("radio", { name: "อื่นๆ" }));
    fireEvent.click(screen.getByRole("button", { name: "จับจองที่ดิน" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("เกาะเต็มแล้วตอนนี้"));
  });

  it("puts pending invites first and answers them by project id", async () => {
    render(<NoProject invites={[invite]} />);
    const invites = screen.getByRole("region", { name: "คำชวนเข้าทีม" });
    expect(within(invites).getByText("สวนผักดาดฟ้า ชวนคุณเข้าทีม")).toBeInTheDocument();
    expect(within(invites).getByText("บริการ · ชวนโดย Ploy")).toBeInTheDocument();

    fireEvent.click(within(invites).getByRole("button", { name: "เข้าร่วม" }));
    await waitFor(() => expect(mockedRespond).toHaveBeenCalledWith({ projectId: invite.projectId, accept: true }));
    await waitFor(() => expect(within(invites).getByRole("button", { name: "ไม่ใช่ตอนนี้" })).toBeEnabled());

    fireEvent.click(within(invites).getByRole("button", { name: "ไม่ใช่ตอนนี้" }));
    await waitFor(() => expect(mockedRespond).toHaveBeenLastCalledWith({ projectId: invite.projectId, accept: false }));
  });
});
