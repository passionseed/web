import { fireEvent, render, screen } from "@testing-library/react";

import { submitShiftParentDecision, withdrawShiftParentDecision } from "@/app/shift/parent/actions";
import { ShiftParentForm, type ShiftParentDecision } from "./ShiftParentForm";

jest.mock("@/app/shift/parent/actions", () => ({
  submitShiftParentDecision: jest.fn(),
  withdrawShiftParentDecision: jest.fn(),
}));

function form(decision: ShiftParentDecision | null) {
  return <ShiftParentForm token="test-parent-token" decision={decision} nickname="ผู้สมัคร" fullName="ชื่อผู้สมัคร" cohortName="SHIFT"
    nextStep={<section aria-label="payment">Payment QR</section>}>
    <p>Consent details</p>
  </ShiftParentForm>;
}

it("shows the payment step immediately after successful consent", async () => {
  jest.mocked(submitShiftParentDecision).mockResolvedValueOnce({ ok: true });
  render(form(null));
  expect(screen.queryByRole("region", { name: "payment" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "ชื่อผู้ปกครอง" } });
  fireEvent.click(screen.getByRole("button", { name: "แม่" }));
  fireEvent.click(screen.getAllByRole("checkbox")[0]);
  fireEvent.click(screen.getByRole("button", { name: /^ยินยอม$/ }));
  expect(await screen.findByRole("region", { name: "payment" })).toBeVisible();
  expect(screen.getByText("Consent details")).not.toBeVisible();
});

it.each(["declined", "withdrawn"] as const)("does not offer payment when consent is %s", (decision) => {
  render(form(decision));
  expect(screen.queryByRole("region", { name: "payment" })).not.toBeInTheDocument();
});

it("removes the payment step after consent is withdrawn", async () => {
  jest.mocked(withdrawShiftParentDecision).mockResolvedValueOnce({ ok: true });
  render(form("agreed"));
  expect(screen.getByRole("region", { name: "payment" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "ถอนความยินยอม" }));
  await screen.findByText("ถอนความยินยอมแล้วค่ะ ทีมงานจะติดต่อกลับเรื่องที่นั่งและการคืนเงิน");
  expect(screen.queryByRole("region", { name: "payment" })).not.toBeInTheDocument();
});
