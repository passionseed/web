import { act, fireEvent, render, screen } from "@testing-library/react";

import * as actions from "@/app/admin/shift/rounds/actions";
import { RoundsList } from "../RoundsList";
import { makeRound } from "../__fixtures__/rounds";

jest.mock("@/app/admin/shift/rounds/actions", () => ({ listRoundsAction: jest.fn(), createRoundAction: jest.fn() }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("next/link", () => ({ __esModule: true, default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const m = actions as jest.Mocked<typeof actions>;

test("an admin without a SHIFT round role sees how to get access, not a generic error", async () => {
  m.listRoundsAction.mockResolvedValue({
    ok: false,
    error: { code: "forbidden", category: "forbidden", details: { rule: "no_shift_round_role" } },
  });
  render(<RoundsList />);
  expect(await screen.findByText("No SHIFT round access")).toBeInTheDocument();
  expect(screen.getByText("You need a SHIFT round role; ask a global staff member to grant it in Settings.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Try again/ })).not.toBeInTheDocument();
});

test("lists rounds with entrants and pending review, searchable", async () => {
  m.listRoundsAction.mockResolvedValue({ ok: true, data: [makeRound()] });
  render(<RoundsList />);
  expect(await screen.findByRole("link", { name: "Beta round" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "3" })).toHaveAttribute("href", expect.stringContaining("/review"));
});

test("a new round starts from the SHIFT template; curriculum key and cohort follow the number", async () => {
  m.listRoundsAction.mockResolvedValue({ ok: true, data: [makeRound({ number: 1 })] });
  m.createRoundAction.mockResolvedValue({ ok: true, data: { round_id: "22222222-2222-4222-8222-222222222222" } });
  render(<RoundsList />);
  await screen.findByRole("link", { name: "Beta round" });
  expect(screen.getByText("SHIFT[1]")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /New round/ }));
  expect(screen.getByLabelText("Duration (days)")).toHaveValue(7);
  expect(screen.getByLabelText("Join cutoff day")).toHaveValue(2);
  expect(screen.getByLabelText("Nudge time (ICT)")).toHaveValue("21:15");
  expect(screen.getAllByRole("checkbox", { name: /^วันที่ \d+$/ }).filter((c) => c.getAttribute("aria-checked") === "true").map((c) => c.getAttribute("aria-label"))).toEqual([
    "วันที่ 1",
    "วันที่ 2",
    "วันที่ 4",
    "วันที่ 6",
    "วันที่ 7",
  ]);
  expect(screen.getByLabelText("คีย์หลักสูตร")).toHaveValue("2");
  expect(screen.getByLabelText("รุ่นใบสมัคร")).toHaveValue("SHIFT[2]");

  fireEvent.change(screen.getByLabelText("Round number"), { target: { value: "5" } });
  expect(screen.getByLabelText("คีย์หลักสูตร")).toHaveValue("5");
  expect(screen.getByLabelText("รุ่นใบสมัคร")).toHaveValue("");

  for (const [label, value] of [
    ["Title (Thai)", "SHIFT[5]"],
    ["Title (English)", "SHIFT[5]"],
    ["Brief (Thai)", "โจทย์"],
    ["Brief (English)", "Brief"],
  ]) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Create draft round" }));
  });
  expect(m.createRoundAction).toHaveBeenCalledWith(
    expect.objectContaining({
      number: 5,
      duration_days: 7,
      join_cutoff_day: 2,
      nudge_local_time: "21:15",
      session_days: [1, 2, 4, 6, 7],
      session_start: "19:00",
      session_end: "21:00",
      curriculum_key: "5",
      application_cohort: null,
      join_mode: "invite",
      mentor_led: true,
    }),
  );
});
