import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ShiftGlobeScene, ShiftJourneyLink } from "./ShiftGlobeScene";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => "/shift",
  useRouter: () => ({ push }),
}));
jest.mock("./ShiftGlobe", () => ({ __esModule: true, default: () => null }));

beforeEach(() => {
  push.mockReset();
  window.history.replaceState({}, "", "/shift?utm_source=camphub");
  // Reduced motion: navigate without waiting for the flight animation.
  window.matchMedia = ((query: string) => ({
    matches: true, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  // Without storage, the URL is the only place the visitor's channel survives.
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
  jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
});

afterEach(() => jest.restoreAllMocks());

test("the next-round link keeps the visitor's channel when opened in a new tab", () => {
  render(<ShiftJourneyLink>รอบถัดไป</ShiftJourneyLink>);

  expect(screen.getByRole("link", { name: "รอบถัดไป" })).toHaveAttribute("href", "/shift/next?utm_source=camphub");
});

test("the globe flight to the next round keeps the visitor's channel", async () => {
  render(
    <ShiftGlobeScene>
      <ShiftJourneyLink>รอบถัดไป</ShiftJourneyLink>
    </ShiftGlobeScene>,
  );

  fireEvent.click(screen.getByRole("link", { name: "รอบถัดไป" }));

  await waitFor(() => expect(push).toHaveBeenCalledWith("/shift/next?utm_source=camphub"));
});
