import { render } from "@testing-library/react";

import { ScrollToHash } from "./ScrollToHash";

const scrollIntoView = jest.fn();

beforeAll(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

function Page() {
  return (
    <>
      <section id="attention">Needs attention</section>
      <ScrollToHash id="attention" />
    </>
  );
}

describe("ScrollToHash", () => {
  it("scrolls to the target when the URL carries its hash", () => {
    window.history.replaceState(null, "", "/admin#attention");
    const { container } = render(<Page />);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(
      container.querySelector("#attention"),
    );
  });

  it("does nothing without the hash", () => {
    window.history.replaceState(null, "", "/admin");
    render(<Page />);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
