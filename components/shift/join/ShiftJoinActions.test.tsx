import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConnectDiscordButton } from "./ShiftJoinActions";

const linkIdentity = jest.fn();
const signInWithOAuth = jest.fn();
jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({ auth: { linkIdentity, signInWithOAuth } }),
}));

beforeEach(() => {
  linkIdentity.mockReset();
  signInWithOAuth.mockReset().mockResolvedValue({ error: null });
});

const token = "abcdefghijklmnopqrstuvwx";

it("uses Discord sign-in to reuse its existing account, with fresh consent on the browser origin", async () => {
  render(<ConnectDiscordButton token={token} />);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
  const request = signInWithOAuth.mock.calls[0][0];
  expect(request.provider).toBe("discord");
  expect(request.options.scopes).toBe("identify,email,guilds.join");
  expect(request.options.queryParams).toEqual({ prompt: "consent" });
  const callback = new URL(request.options.redirectTo);
  expect(callback.origin).toBe(window.location.origin);
  expect(callback.searchParams.get("next")).toBe(`/shift/join/${token}`);
  expect(linkIdentity).not.toHaveBeenCalled();
});

it("allows retry after the OAuth request fails without losing the personal link", async () => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    signInWithOAuth.mockResolvedValueOnce({ error: { message: "Unavailable" } });
    render(<ConnectDiscordButton token={token} />);
    fireEvent.click(screen.getByRole("button"));
    await screen.findByText("เชื่อม Discord ไม่สำเร็จ ลองใหม่อีกครั้ง หรือทักพี่ใน LINE");
    expect(screen.getByRole("button")).toBeEnabled();
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(2));
    expect(new URL(signInWithOAuth.mock.calls[1][0].options.redirectTo).searchParams.get("next")).toBe(`/shift/join/${token}`);
  } finally {
    log.mockRestore();
  }
});
