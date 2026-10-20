import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { LoginForm } from "@/components/login-form";

const signInWithOAuth = jest.fn();
jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithOAuth } }),
}));
jest.mock("@icons-pack/react-simple-icons", () => ({
  SiGoogle: () => null,
  SiDiscord: () => null,
}));

beforeEach(() => signInWithOAuth.mockReset());

it.each(["Google", "Discord"])("keeps the %s callback destination and prevents duplicate submissions", async (name) => {
  signInWithOAuth.mockReturnValue(new Promise(() => {}));
  render(<LoginForm next="/shift/next?source=login" />);
  fireEvent.click(screen.getByRole("button", { name: `เข้าสู่ระบบด้วย ${name}` }));
  await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
  const args = signInWithOAuth.mock.calls[0][0];
  expect(args.provider).toBe(name.toLowerCase());
  const callback = new URL(args.options.redirectTo);
  expect(callback.pathname).toBe("/auth/callback");
  expect(callback.searchParams.get("next")).toBe("/shift/next?source=login");
  for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
});

it("shows a retryable error when OAuth fails", async () => {
  signInWithOAuth.mockResolvedValue({ error: { message: "Unavailable" } });
  render(<LoginForm />);
  fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบด้วย Google" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("เข้าสู่ระบบไม่สำเร็จ");
  for (const button of screen.getAllByRole("button")) expect(button).toBeEnabled();
});

it("recovers from a network failure without losing the provider buttons", async () => {
  signInWithOAuth.mockRejectedValue(new Error("Offline"));
  render(<LoginForm />);
  fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบด้วย Discord" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("ลองอีกครั้ง");
  expect(screen.getByRole("button", { name: "เข้าสู่ระบบด้วย Discord" })).toBeEnabled();
});
