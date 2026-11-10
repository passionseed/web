import { act, fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";

import * as actions from "../actions";
import { CopilotTokenList } from "../CopilotTokenList";

jest.mock("../actions", () => ({
  createCopilotTokenAction: jest.fn(),
  revokeCopilotTokenAction: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const m = actions as jest.Mocked<typeof actions>;

const TOKEN = {
  id: "tok-1",
  user_id: "admin-1",
  name: "boon macbook",
  last_used_at: null,
  expires_at: "2099-01-01T00:00:00.000Z",
  revoked_at: null,
  created_at: "2026-10-26T00:00:00.000Z",
};

async function clickRevokeThen(choice: "Revoke" | "Cancel") {
  fireEvent.click(screen.getByRole("button", { name: "revoke" }));
  const dialog = await screen.findByRole("alertdialog");
  expect(dialog).toHaveTextContent('Revoke "boon macbook"?');
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: choice }));
  });
}

test("revoke asks first and does nothing on cancel", async () => {
  render(<CopilotTokenList initialTokens={[TOKEN]} />);
  await clickRevokeThen("Cancel");
  expect(m.revokeCopilotTokenAction).not.toHaveBeenCalled();
  expect(screen.getByText("active")).toBeInTheDocument();
});

test("confirmed revoke marks the token revoked and toasts", async () => {
  m.revokeCopilotTokenAction.mockResolvedValue({ ok: true, data: undefined });
  render(<CopilotTokenList initialTokens={[TOKEN]} />);
  await clickRevokeThen("Revoke");
  expect(m.revokeCopilotTokenAction).toHaveBeenCalledWith("tok-1");
  expect(toast.success).toHaveBeenCalled();
  expect(screen.getByText("revoked")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "revoke" })).not.toBeInTheDocument();
});

test("a failed revoke toasts the error and keeps the token active", async () => {
  m.revokeCopilotTokenAction.mockResolvedValue({ ok: false, error: "revoke token ไม่สำเร็จ ลองอีกครั้ง" });
  render(<CopilotTokenList initialTokens={[TOKEN]} />);
  await clickRevokeThen("Revoke");
  expect(toast.error).toHaveBeenCalledWith("revoke token ไม่สำเร็จ ลองอีกครั้ง");
  expect(screen.getByText("active")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "revoke" })).toBeEnabled();
});

test("a thrown revoke (network) still toasts and re-enables the button", async () => {
  m.revokeCopilotTokenAction.mockRejectedValue(new Error("offline"));
  render(<CopilotTokenList initialTokens={[TOKEN]} />);
  await clickRevokeThen("Revoke");
  expect(toast.error).toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "revoke" })).toBeEnabled();
});

test("mint errors returned by the action show inline", async () => {
  m.createCopilotTokenAction.mockResolvedValue({ ok: false, error: "สร้าง token ไม่สำเร็จ ลองอีกครั้ง" });
  render(<CopilotTokenList initialTokens={[]} />);
  fireEvent.change(screen.getByLabelText("Token name"), { target: { value: "laptop" } });
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "สร้าง token" }));
  });
  expect(await screen.findByRole("alert")).toHaveTextContent("สร้าง token ไม่สำเร็จ");
});
