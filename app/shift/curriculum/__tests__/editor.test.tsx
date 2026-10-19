import { act, fireEvent, render, screen, within } from "@testing-library/react";

import { CurriculumEditor } from "@/components/shift/CurriculumEditor";
import { SHIFT2_DEFAULT_DOC, type CurriculumDoc } from "@/lib/content/shift2-curriculum";
import { prepareCurriculumCopy } from "@/lib/shift-round/admin/curriculum";

const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockSave = jest.fn();

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush, refresh: mockRefresh }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/app/shift/curriculum/actions", () => ({ saveCurriculum: (...args: unknown[]) => mockSave(...args) }));

const round3 = { number: 3, curriculum_key: "3", starts_at: "2026-10-20T17:00:00Z", duration_days: 7, session_days: [1, 3, 5] };
const fromDefault = prepareCurriculumCopy(SHIFT2_DEFAULT_DOC, round3);
const fromTwo: CurriculumDoc = prepareCurriculumCopy({ ...SHIFT2_DEFAULT_DOC, rules: ["กติกา SHIFT[2]"] }, round3);
const options = [
  { key: "3", label: "SHIFT[3]", hasRow: false, rounds: [3] },
  { key: "2", label: "SHIFT[2]", hasRow: true, rounds: [2] },
  { key: "default", label: "แม่แบบ (default)", hasRow: true, rounds: [] },
];
const base = {
  options,
  updatedAt: null,
  defaultDoc: fromDefault,
  copySources: [{ key: "2", label: "SHIFT[2]", doc: fromTwo }],
  refundSteps: ["ขั้น 1"],
  refundHow: "",
};

beforeEach(() => {
  mockSave.mockResolvedValue({ ok: true, updatedAt: "2026-10-14T12:00:00Z" });
});

test("the picker lists every key, marks the ones without a curriculum, and switches ?round", () => {
  render(<CurriculumEditor {...base} round="2" label="SHIFT[2]" initial={SHIFT2_DEFAULT_DOC} canEdit />);
  const picker = screen.getByLabelText("เลือกรอบ");
  expect(picker).toHaveValue("2");
  expect(within(picker).getAllByRole("option").map((o) => o.textContent)).toEqual([
    "SHIFT[3] (ยังไม่มี)",
    "SHIFT[2]",
    "แม่แบบ (default)",
  ]);
  fireEvent.change(picker, { target: { value: "3" } });
  expect(mockPush).toHaveBeenCalledWith("/shift/curriculum?round=3");
});

test("a round without a curriculum: start from default, then save under that round's key", async () => {
  render(<CurriculumEditor {...base} round="3" label="SHIFT[3]" initial={null} canEdit />);
  expect(screen.getByRole("heading", { name: "ยังไม่มีหลักสูตรของ SHIFT[3]" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "เริ่มจากแม่แบบ" }));
  expect(screen.getByText("ยังไม่ได้บันทึก")).toBeInTheDocument();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "บันทึก" }));
  });
  expect(mockSave).toHaveBeenCalledWith("3", fromDefault);
  expect(mockRefresh).toHaveBeenCalled();
  expect(screen.queryByText("ยังไม่ได้บันทึก")).not.toBeInTheDocument();
});

test("or copy another round's curriculum", async () => {
  render(<CurriculumEditor {...base} round="3" label="SHIFT[3]" initial={null} canEdit />);
  fireEvent.change(screen.getByLabelText("หรือคัดลอกจาก"), { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "คัดลอก" }));
  expect(screen.getByText("กติกา SHIFT[2]")).toBeInTheDocument();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "บันทึก" }));
  });
  expect(mockSave).toHaveBeenCalledWith("3", fromTwo);
});

test("cancel on a fresh start goes back to the choice", () => {
  jest.spyOn(window, "confirm").mockReturnValue(true);
  render(<CurriculumEditor {...base} round="3" label="SHIFT[3]" initial={null} canEdit />);
  fireEvent.click(screen.getByRole("button", { name: "เริ่มจากแม่แบบ" }));
  fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));
  expect(screen.getByRole("button", { name: "เริ่มจากแม่แบบ" })).toBeInTheDocument();
});

test("non-admins see that the round has no curriculum yet, without start buttons", () => {
  render(<CurriculumEditor {...base} round="3" label="SHIFT[3]" initial={null} canEdit={false} />);
  expect(screen.getByText("แอดมินล็อกอินเพื่อสร้างหลักสูตรของรอบนี้")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "เริ่มจากแม่แบบ" })).not.toBeInTheDocument();
});

test("switching rounds with unsaved edits asks first", () => {
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
  render(<CurriculumEditor {...base} round="3" label="SHIFT[3]" initial={null} canEdit />);
  fireEvent.click(screen.getByRole("button", { name: "เริ่มจากแม่แบบ" }));
  fireEvent.change(screen.getByLabelText("เลือกรอบ"), { target: { value: "2" } });
  expect(confirm).toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
});
