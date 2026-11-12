import { fireEvent, render, screen } from "@testing-library/react";

import { AdminAccountMenu, accountInitial } from "../AdminAccountMenu";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), refresh: jest.fn() }),
}));
jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: jest.fn(async () => ({ error: null })) } }),
}));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

describe("AdminAccountMenu", () => {
  it("links to the member pages admins still use", async () => {
    render(<AdminAccountMenu name="Pim" email="pim@example.com" />);
    fireEvent.keyDown(
      screen.getByRole("button", { name: "Account menu for Pim" }),
      { key: "Enter" },
    );

    const href = (name: string) =>
      screen.getByRole("menuitem", { name }).getAttribute("href");
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(href("My profile")).toBe("/profile");
    expect(href("Dashboard")).toBe("/me");
    expect(href("Whiteboards")).toBe("/whiteboard");
    expect(href("Settings")).toBe("/settings");
    expect(href("Open website")).toBe("/");
  });

  it("keeps a Thai first letter whole", () => {
    expect(accountInitial("ปิ่น", null)).toBe("ป");
    expect(accountInitial(null, "pim@example.com")).toBe("P");
  });
});
