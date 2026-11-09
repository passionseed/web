import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";

import { TalentVerifyToggle } from "@/components/admin/TalentVerifyToggle";
import { setTalentVerified } from "@/app/admin/talent/actions";
import { refreshAdminCounts } from "@/components/admin/console/live-counts";

jest.mock("@/app/admin/talent/actions", () => ({ setTalentVerified: jest.fn() }));
jest.mock("@/components/admin/console/live-counts", () => ({ refreshAdminCounts: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const ID = "0b7c6f5e-1d2a-4c3b-9e8f-7a6b5c4d3e2f";

test("publishes, confirms with a toast, and refreshes queue counts", async () => {
  jest.mocked(setTalentVerified).mockResolvedValue({ ok: true, error: null });
  render(<TalentVerifyToggle id={ID} verified={false} name="Ploy" />);

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Publish Ploy" }));
  });

  expect(setTalentVerified).toHaveBeenCalledWith(ID, true);
  await waitFor(() => expect(screen.getByText("Live")).toBeInTheDocument());
  expect(toast.success).toHaveBeenCalled();
  expect(refreshAdminCounts).toHaveBeenCalled();
});

test("reverts and shows an error toast when the save returns ok: false", async () => {
  jest.mocked(setTalentVerified).mockResolvedValue({ ok: false, error: "Update failed" });
  render(<TalentVerifyToggle id={ID} verified={false} name="Ploy" />);

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Publish Ploy" }));
  });

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Could not publish Ploy")));
  expect(screen.getByText("Hidden")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Publish Ploy" })).toBeEnabled();
  expect(refreshAdminCounts).not.toHaveBeenCalled();
});

test("reverts when the action throws", async () => {
  jest.mocked(setTalentVerified).mockRejectedValue(new Error("network"));
  render(<TalentVerifyToggle id={ID} verified name="Ploy" />);

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Unpublish Ploy" }));
  });

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Could not hide Ploy")));
  expect(screen.getByText("Live")).toBeInTheDocument();
});
