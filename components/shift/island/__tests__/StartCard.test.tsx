import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";

import { startIsland } from "@/app/shift/island/actions";

import { START } from "../copy";
import { StartCard } from "../StartCard";
import { STORY_SEEN_KEY } from "../story/useStorySeen";

jest.mock("@/app/shift/island/actions", () => ({ startIsland: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithOAuth: jest.fn(), signOut: jest.fn() } }),
}));
jest.mock("@/components/shift/island/live/IslandCanvas", () => ({
  __esModule: true,
  default: function MockIslandCanvas() {
    return null;
  },
}));
jest.mock("next/dynamic", () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  default: () => require("@/components/shift/island/live/IslandCanvas").default,
}));

const mockedStart = startIsland as jest.MockedFunction<typeof startIsland>;
const me = { name: "Mint", avatarUrl: null, staff: false };

beforeEach(() => {
  window.localStorage.clear();
  mockedStart.mockResolvedValue({ ok: true, data: null });
});

describe("StartCard", () => {
  beforeEach(() => window.localStorage.setItem(STORY_SEEN_KEY, "seen"));

  it("shows the heading, the story's book, one line and the start button", () => {
    render(<StartCard me={me} />);
    expect(screen.getByRole("heading", { name: START.heading })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ดูเรื่องเล่าของเกาะอีกครั้ง" })).toBeInTheDocument();
    expect(screen.getByText("ต้นไม้ของคุณบนเกาะโตทุกครั้งที่พี่เลี้ยงยืนยันงานที่คุณทำได้จริง")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: START.action })).toBeInTheDocument();
    expect(screen.getByText("เข้าสู่ระบบเป็น Mint")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: START.switchAccount })).toBeInTheDocument();
  });

  it("keeps all four rules, folded under กติกาของเกาะ", () => {
    render(<StartCard me={me} />);
    const summary = screen.getByText("กติกาของเกาะ");
    const fold = summary.closest("details")!;
    expect(fold).not.toHaveAttribute("open");
    for (const rule of START.rules) expect(fold).toHaveTextContent(rule);
    fireEvent.click(summary);
    expect(fold).toHaveAttribute("open");
  });

  it("starts the island", async () => {
    render(<StartCard me={me} />);
    fireEvent.click(screen.getByRole("button", { name: START.action }));
    await waitFor(() => expect(mockedStart).toHaveBeenCalledTimes(1));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows the server's Thai error when starting fails", async () => {
    mockedStart.mockResolvedValueOnce({ ok: false, code: "unavailable", error: "เกาะปิดปรับปรุงชั่วคราว" });
    render(<StartCard me={me} />);
    fireEvent.click(screen.getByRole("button", { name: START.action }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("เกาะปิดปรับปรุงชั่วคราว"));
  });
});

describe("StartCard on a first visit", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("opens the story by itself, with the undated festival line, and its button lands on เริ่มเลย", () => {
    render(<StartCard me={me} />);
    expect(screen.getByRole("dialog", { name: "เรื่องเล่าของเกาะ" })).toBeInTheDocument();
    const stage = () => screen.getByRole("group", { name: /^ภาพ \d จาก 4$/ });
    fireEvent.click(stage());
    fireEvent.click(stage());
    fireEvent.click(stage());
    expect(screen.getByText("คืนเทศกาล Demo Day")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "ไปที่เกาะ" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => void jest.runOnlyPendingTimers());
    expect(screen.getByRole("button", { name: START.action })).toHaveFocus();
    expect(window.localStorage.getItem(STORY_SEEN_KEY)).toBe("seen");
    expect(mockedStart).not.toHaveBeenCalled();
  });
});
