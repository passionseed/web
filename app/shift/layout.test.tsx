import { render } from "@testing-library/react";

import { SHIFT_SOURCE_CAPTURE_SCRIPT } from "@/lib/shift/attribution";

import ShiftLayout from "./layout";

jest.mock("next/navigation", () => ({
  usePathname: () => "/shift/3",
  useRouter: () => ({ push: jest.fn() }),
}));

test("every SHIFT page saves the visitor's channel as soon as its HTML loads", () => {
  const { container } = render(<ShiftLayout><p>page</p></ShiftLayout>);

  const scripts = Array.from(container.querySelectorAll("script"));
  expect(scripts.map((script) => script.innerHTML)).toContain(SHIFT_SOURCE_CAPTURE_SCRIPT);
});
