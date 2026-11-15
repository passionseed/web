import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { findProjectFriends, inviteFriend } from "@/app/shift/island/actions";
import { InviteFriends } from "../InviteFriends";

jest.mock("@/app/shift/island/actions", () => ({ findProjectFriends: jest.fn(), inviteFriend: jest.fn() }));
const search = jest.mocked(findProjectFriends);
const invite = jest.mocked(inviteFriend);

beforeEach(() => {
  search.mockReset().mockResolvedValue({ ok: true, data: [{ id: "friend", name: "Mint" }] });
  invite.mockReset().mockResolvedValue({ ok: true, data: null });
});

it("searches on demand, sends an invitation and explains acceptance", async () => {
  render(<InviteFriends projectId="plot" />);
  expect(search).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "ชวนเพื่อน" }));
  fireEvent.change(screen.getByLabelText("ชื่อเพื่อนบนเกาะ"), { target: { value: "Mint" } });
  fireEvent.click(screen.getByRole("button", { name: "ค้นหา" }));
  fireEvent.click(await screen.findByRole("button", { name: "ส่งคำชวน: Mint" }));
  await waitFor(() => expect(invite).toHaveBeenCalledWith({ projectId: "plot", friendId: "friend" }));
  expect(await screen.findByRole("status")).toHaveTextContent("ให้เพื่อนเปิดหน้าเกาะแล้วกดเข้าร่วม");
  expect(screen.queryByRole("button", { name: "ส่งคำชวน: Mint" })).toBeNull();
});

it("shows errors and lets the student retry", async () => {
  invite.mockResolvedValueOnce({ ok: false, code: "busy", error: "ลองอีกครั้ง" });
  render(<InviteFriends projectId="plot" />);
  fireEvent.click(screen.getByRole("button", { name: "ชวนเพื่อน" }));
  fireEvent.change(screen.getByLabelText("ชื่อเพื่อนบนเกาะ"), { target: { value: "Mint" } });
  fireEvent.click(screen.getByRole("button", { name: "ค้นหา" }));
  fireEvent.click(await screen.findByRole("button", { name: "ส่งคำชวน: Mint" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("ลองอีกครั้ง");
  expect(screen.getByRole("button", { name: "ส่งคำชวน: Mint" })).toBeEnabled();
});

it("guides an empty search and clears stale results when the name changes", async () => {
  search.mockResolvedValueOnce({ ok: true, data: [] });
  render(<InviteFriends projectId="plot" />);
  fireEvent.click(screen.getByRole("button", { name: "ชวนเพื่อน" }));
  fireEvent.change(screen.getByLabelText("ชื่อเพื่อนบนเกาะ"), { target: { value: "Nobody" } });
  fireEvent.click(screen.getByRole("button", { name: "ค้นหา" }));
  expect(await screen.findByText(/ยังไม่พบเพื่อน/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("ชื่อเพื่อนบนเกาะ"), { target: { value: "Mint" } });
  expect(screen.queryByText(/ยังไม่พบเพื่อน/)).toBeNull();
});
