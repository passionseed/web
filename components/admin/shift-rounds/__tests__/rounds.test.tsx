import { render, screen } from "@testing-library/react";

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
