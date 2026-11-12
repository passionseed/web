import { fireEvent, render, screen } from "@testing-library/react";

import { TeamPanel } from "./TeamPanel";

const OWNER = "11111111-1111-4111-8111-111111111111";
const MATE = "22222222-2222-4222-8222-222222222222";
const WATCHER = "33333333-3333-4333-8333-333333333333";
const names: Record<string, string> = { [OWNER]: "Mint", [MATE]: "Ploy", [WATCHER]: "Ton" };

function panel(props: Partial<Parameters<typeof TeamPanel>[0]> = {}) {
  const handlers = { onChange: jest.fn(), onTransfer: jest.fn(), onClose: jest.fn(), onInvite: jest.fn() };
  render(
    <TeamPanel
      access={{ owner: OWNER, editors: [] }}
      at={{ x: 400, y: 100 }}
      canManage
      people={[{ userId: OWNER, name: "Mint", role: "owner" }]}
      nameOf={(id) => names[id] ?? "Someone"}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe("TeamPanel", () => {
  it("offers the board's owner a way to invite people when nobody can join the team yet", () => {
    const { onInvite } = panel();
    fireEvent.click(screen.getByRole("button", { name: /ชวนเพื่อนเข้าบอร์ด/ }));
    expect(onInvite).toHaveBeenCalledTimes(1);
  });

  it("tells a canvas owner who cannot invite whom to ask", () => {
    panel({ onInvite: undefined });
    expect(screen.queryByRole("button", { name: /ชวนเพื่อนเข้าบอร์ด/ })).toBeNull();
    expect(screen.getByText(/เจ้าของบอร์ด/)).toBeInTheDocument();
  });

  it("adds a board editor to the team", () => {
    const { onChange } = panel({
      people: [
        { userId: OWNER, name: "Mint", role: "owner" },
        { userId: MATE, name: "Ploy", role: "editor" },
      ],
    });
    fireEvent.click(screen.getByRole("checkbox", { name: /Ploy/ }));
    expect(onChange).toHaveBeenCalledWith([MATE]);
  });

  it("shows why someone who can only view the board cannot join", () => {
    const { onChange } = panel({
      people: [
        { userId: OWNER, name: "Mint", role: "owner" },
        { userId: WATCHER, name: "Ton", role: "viewer" },
      ],
    });
    const box = screen.getByRole("checkbox", { name: /Ton/ });
    expect(box).toBeDisabled();
    fireEvent.click(box);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/เปลี่ยนเป็น Editor/)).toBeInTheDocument();
  });
});
