import { fireEvent, render, screen } from "@testing-library/react";

import { AdminPagination } from "./AdminPagination";

const base = {
  page: 2,
  totalPages: 5,
  total: 1234,
  pageSize: 20,
  noun: ["user", "users"] as const,
};

test("renders nothing for an empty list", () => {
  const { container } = render(
    <AdminPagination {...base} total={0} onPageChange={jest.fn()} />,
  );
  expect(container).toBeEmptyDOMElement();
});

test("shows the range, the page and a named landmark", () => {
  render(<AdminPagination {...base} label="Users pages" onPageChange={jest.fn()} />);
  expect(screen.getByRole("navigation", { name: "Users pages" })).toBeInTheDocument();
  expect(screen.getByText("21 to 40 of 1,234 users")).toBeInTheDocument();
  expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();
});

test("uses the singular noun for one row and hides buttons on a single page", () => {
  render(
    <AdminPagination
      {...base}
      page={1}
      totalPages={1}
      total={1}
      onPageChange={jest.fn()}
    />,
  );
  expect(screen.getByText("1 to 1 of 1 user")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("moves one page either way and stops at the ends", () => {
  const onPageChange = jest.fn();
  const { rerender } = render(
    <AdminPagination {...base} onPageChange={onPageChange} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
  fireEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(onPageChange.mock.calls).toEqual([[1], [3]]);

  rerender(<AdminPagination {...base} page={1} onPageChange={onPageChange} />);
  expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();

  rerender(<AdminPagination {...base} page={5} onPageChange={onPageChange} />);
  expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  expect(screen.getByText("81 to 100 of 1,234 users")).toBeInTheDocument();
});

test("keeps both buttons at the 44px touch height", () => {
  render(<AdminPagination {...base} onPageChange={jest.fn()} />);
  for (const button of screen.getAllByRole("button")) {
    expect(button).toHaveClass("min-h-11");
  }
});
