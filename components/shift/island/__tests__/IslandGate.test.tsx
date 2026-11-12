import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { GATE } from "../copy";
import { islandCallbackUrl } from "../IslandDiscordButton";
import { IslandGate, type GateViewer } from "../IslandGate";

const refresh = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const signInWithOAuth = jest.fn();
const signOut = jest.fn();
jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({ auth: { signInWithOAuth, signOut } }) }));

beforeEach(() => {
  signInWithOAuth.mockResolvedValue({ error: null });
  signOut.mockResolvedValue({ error: null });
});

const me = { name: "Mint", avatarUrl: null, staff: false };

describe("IslandGate", () => {
  it("signed out: one card and Discord sign-in that comes back to the island", async () => {
    render(<IslandGate viewer={{ state: "signed_out" }} />);
    expect(screen.getByRole("heading", { name: "เกาะ SHIFT" })).toBeInTheDocument();
    expect(screen.getByText(GATE.signedOut.body)).toBeInTheDocument();
    expect(screen.getByText(GATE.signedOut.fine)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบด้วย Discord" }));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
    const request = signInWithOAuth.mock.calls[0][0];
    expect(request.provider).toBe("discord");
    expect(request.options.scopes).toBe("identify email");
    expect(request.options.queryParams).toBeUndefined();
    const callback = new URL(request.options.redirectTo);
    expect(callback.origin).toBe(window.location.origin);
    expect(callback.pathname).toBe("/auth/callback");
    expect(callback.searchParams.get("next")).toBe("/shift/island");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("shows a sign-in failure it can recover from", async () => {
    const log = jest.spyOn(console, "error").mockImplementation(() => {});
    signInWithOAuth.mockResolvedValueOnce({ error: new Error("Unavailable") });
    render(<IslandGate viewer={{ state: "signed_out" }} />);
    fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบด้วย Discord" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(GATE.signInFailed);
    expect(screen.getByRole("button", { name: "เข้าสู่ระบบด้วย Discord" })).toBeEnabled();
    log.mockRestore();
  });

  it.each([
    ["discord_identity_exists", GATE.authError.body.discord_identity_exists],
    ["discord_email", GATE.authError.body.discord_email],
    ["discord_auth", "ลองอีกครั้งได้เลย"],
  ] as const)("auth_error=%s explains what went wrong", (code, body) => {
    render(<IslandGate viewer={{ state: "signed_out" }} authError={code} />);
    expect(screen.getByRole("heading", { name: "เข้าสู่ระบบไม่สำเร็จ" })).toBeInTheDocument();
    expect(screen.getByText(body)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "เข้าสู่ระบบด้วย Discord" })).toBeInTheDocument();
  });

  it("a non-Discord account is asked to switch, signing this browser out first", async () => {
    render(<IslandGate viewer={{ state: "no_discord", accountLabel: "mint@example.com" }} />);
    expect(screen.getByRole("heading", { name: "ใช้ Discord ที่อยู่ใน SHIFT" })).toBeInTheDocument();
    expect(screen.getByText("ตอนนี้คุณเข้าสู่ระบบด้วย mint@example.com ซึ่งยังไม่ได้ผูก Discord")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "เข้าด้วย Discord ที่ใช้ใน SHIFT" }));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(signOut.mock.invocationCallOrder[0]).toBeLessThan(signInWithOAuth.mock.invocationCallOrder[0]);
    expect(signInWithOAuth.mock.calls[0][0].options.queryParams).toEqual({ prompt: "consent" });
  });

  it.each([
    ["no_role", "ยังเข้าเกาะไม่ได้", GATE.notEligible.no_role.body, "สลับบัญชี Discord"],
    ["not_in_guild", "ยังเข้าเกาะไม่ได้", GATE.notEligible.not_in_guild.body, "สลับบัญชี Discord"],
    ["discord_unavailable", "เช็กสิทธิ์ไม่ได้ตอนนี้", GATE.notEligible.discord_unavailable.body, "ลองอีกครั้ง"],
  ] as const)("not eligible (%s) has one way forward", (reason, heading, body, action) => {
    render(<IslandGate viewer={{ state: "not_eligible", reason, me }} />);
    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByText(body)).toBeInTheDocument();
    expect(screen.getByText("เข้าสู่ระบบเป็น Mint")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: action })).toBeInTheDocument();
  });

  const urls = { server: "https://discord.com/channels/123456789012345678", invite: "https://discord.gg/shift" };

  it("not in the server: a link to join it first, with the account switch kept quiet", () => {
    render(<IslandGate viewer={{ state: "not_eligible", reason: "not_in_guild", me }} discordUrls={urls} />);
    const link = screen.getByRole("link", { name: "เข้าเซิร์ฟเวอร์ SHIFT" });
    expect(link).toHaveAttribute("href", urls.invite);
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("button", { name: "สลับบัญชี Discord" })).not.toHaveClass("ei-button-dawn");
  });

  it("not in the server and no invite: the server link instead", () => {
    render(
      <IslandGate viewer={{ state: "not_eligible", reason: "not_in_guild", me }} discordUrls={{ ...urls, invite: null }} />,
    );
    expect(screen.getByRole("link", { name: "เข้าเซิร์ฟเวอร์ SHIFT" })).toHaveAttribute("href", urls.server);
  });

  it("no role: a link to the server, where the team can be asked", () => {
    render(<IslandGate viewer={{ state: "not_eligible", reason: "no_role", me }} discordUrls={urls} />);
    expect(screen.getByRole("link", { name: "ไปที่เซิร์ฟเวอร์ SHIFT" })).toHaveAttribute("href", urls.server);
  });

  it("no link when the server is not configured", () => {
    render(<IslandGate viewer={{ state: "not_eligible", reason: "no_role", me }} discordUrls={{ server: null, invite: null }} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("button", { name: "สลับบัญชี Discord" })).toHaveClass("ei-button-dawn");
  });

  it("a closed pilot has no button", () => {
    render(<IslandGate viewer={{ state: "not_eligible", reason: "pilot_closed", me }} />);
    expect(screen.getByRole("heading", { name: "เกาะยังไม่เปิด" })).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("retries a Discord outage by re-rendering the page on the server", () => {
    render(<IslandGate viewer={{ state: "not_eligible", reason: "discord_unavailable", me }} />);
    fireEvent.click(screen.getByRole("button", { name: "ลองอีกครั้ง" }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("unavailable says the work is safe and uses the given retry", () => {
    const onRetry = jest.fn();
    render(<IslandGate viewer={{ state: "unavailable", reason: "db_error" }} onRetry={onRetry} authError="discord_auth" />);
    expect(screen.getByRole("heading", { name: "เกาะปิดปรับปรุงชั่วคราว" })).toBeInTheDocument();
    expect(screen.getByText("งานและต้นไม้ของคุณยังอยู่ครบ ลองใหม่อีกครั้งในอีกสักครู่")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ลองอีกครั้ง" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("never renders a Discord id it was not given", () => {
    const viewer: GateViewer = { state: "not_eligible", reason: "no_role", me };
    const { container } = render(<IslandGate viewer={viewer} />);
    expect(container.textContent ?? "").not.toMatch(/\d{17,20}/);
  });
});

describe("islandCallbackUrl", () => {
  it("returns to the island on the same origin", () => {
    const url = new URL(islandCallbackUrl("https://www.passionseed.org"));
    expect(url.toString()).toBe("https://www.passionseed.org/auth/callback?next=%2Fshift%2Fisland");
  });

  it("moves 0.0.0.0 to localhost, where the PKCE cookie lives", () => {
    expect(new URL(islandCallbackUrl("http://0.0.0.0:3000")).host).toBe("localhost:3000");
  });
});
