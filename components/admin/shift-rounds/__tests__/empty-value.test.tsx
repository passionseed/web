import { render } from "@testing-library/react";

import { EMPTY_VALUE, EmptyValue } from "../shared";

test("empty values use a muted en dash and read as none", () => {
  expect(EMPTY_VALUE).toBe("–");
  const { container } = render(<EmptyValue />);
  expect(container.textContent).toBe("–none");
  expect(container.querySelector("[aria-hidden='true']")).toHaveTextContent("–");
  expect(container.querySelector(".sr-only")).toHaveTextContent("none");
  expect(container.firstElementChild).toHaveClass("text-muted-foreground");
  expect(container.textContent).not.toContain("—");
});
