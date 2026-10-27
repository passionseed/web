import { act, fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";

import * as actions from "@/app/admin/shift/alumni/board/actions";
import { StartRoundButton } from "../AlumniBoardMentor";

jest.mock("@/app/admin/shift/alumni/board/actions", () => ({
  createTeamAction: jest.fn(),
  setMemberTeamAction: jest.fn(),
  startRoundAction: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
const refresh = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const m = actions as jest.Mocked<typeof actions>;

async function choose(label: "Start new round" | "Cancel") {
  fireEvent.click(screen.getByRole("button", { name: "Start new round" }));
  const dialog = await screen.findByRole("alertdialog");
  expect(dialog).toHaveTextContent("Start a new round?");
  await act(async () => {
    // The dialog's confirm button shares the trigger's label, so pick it inside the dialog.
    const buttons = screen.getAllByRole("button", { name: label });
    fireEvent.click(buttons[buttons.length - 1]);
  });
}

test("asks in a dialog instead of window.confirm, and cancel does nothing", async () => {
  const nativeConfirm = jest.spyOn(window, "confirm");
  render(<StartRoundButton />);
  await choose("Cancel");
  expect(nativeConfirm).not.toHaveBeenCalled();
  expect(m.startRoundAction).not.toHaveBeenCalled();
});

test("confirming starts the round and toasts", async () => {
  m.startRoundAction.mockResolvedValue({ ok: true });
  render(<StartRoundButton />);
  await choose("Start new round");
  expect(m.startRoundAction).toHaveBeenCalledTimes(1);
  expect(toast.success).toHaveBeenCalledWith("New round started");
});
