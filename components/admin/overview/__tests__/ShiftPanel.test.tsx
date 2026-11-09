import { render, screen, within } from "@testing-library/react";

import { makeShift } from "../__fixtures__/overview";
import {
  applicationsHref,
  shiftCountdown,
  shiftFunnel,
  shiftHeadline,
} from "../shift";
import { ShiftPanel } from "../ShiftPanel";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const TODAY = "2026-10-26";
const base = makeShift();
const cohortWith = (patch: Partial<typeof base.cohort>) => ({ ...base.cohort, ...patch });

describe("shift model", () => {
  it("builds filtered application links with the cohort encoded", () => {
    expect(applicationsHref("SHIFT[3]")).toBe("/admin/shift/applications?cohort=SHIFT%5B3%5D");
    expect(applicationsHref("SHIFT[3]", { status: "accepted" })).toBe(
      "/admin/shift/applications?cohort=SHIFT%5B3%5D&status=accepted",
    );
    expect(applicationsHref("SHIFT[3]", { paid: "paid" })).toBe(
      "/admin/shift/applications?cohort=SHIFT%5B3%5D&paid=paid",
    );
  });

  it("counts down to whatever comes next", () => {
    expect(shiftCountdown(base.cohort, TODAY)).toEqual({
      value: "12 days",
      caption: "until applications close, Sat 7 Nov",
    });
    expect(shiftCountdown(cohortWith({ daysToDeadline: 0 }), TODAY)?.value).toBe("Today");
    expect(shiftCountdown(cohortWith({ status: "closed", daysToDeadline: null }), "2026-11-07")).toEqual({
      value: "1 day",
      caption: "until the round starts, Sun 8 Nov",
    });
    expect(shiftCountdown(cohortWith({ status: "running", daysToDeadline: null }), "2026-11-10")).toEqual({
      value: "Day 3",
      caption: "of 7, ends Sat 14 Nov",
    });
  });

  it("writes the header line without em dashes", () => {
    expect(shiftHeadline(base, TODAY)).toBe("SHIFT[3] applications close in 12 days.");
    expect(shiftHeadline(makeShift({ cohort: cohortWith({ daysToDeadline: 1 }) }), TODAY)).toBe(
      "SHIFT[3] applications close tomorrow.",
    );
    expect(
      shiftHeadline(makeShift({ cohort: cohortWith({ status: "closed", daysToDeadline: null }) }), "2026-11-05"),
    ).toBe("SHIFT[3] starts in 3 days.");
    expect(shiftHeadline(makeShift({ cohort: cohortWith({ status: "done" }) }), TODAY)).toBeNull();
    expect(shiftHeadline(null, TODAY)).toBeNull();
  });

  it("measures each funnel step against everyone who applied", () => {
    const model = shiftFunnel(base);
    expect(model?.steps.map((s) => [s.label, s.count, s.share])).toEqual([
      ["Applied", 40, 100],
      ["Accepted", 20, 50],
      ["Paid", 12, 30],
      ["In Discord", 9, 22.5],
    ]);
    expect(model?.secondary.map((s) => s.label)).toEqual(["New", "Waitlist"]);
    expect(shiftFunnel(makeShift({ funnel: null }))).toBeNull();
  });
});

describe("<ShiftPanel />", () => {
  it("shows the cohort, seats, funnel links and the live round", () => {
    render(<ShiftPanel snapshot={base} today={TODAY} />);
    expect(screen.getByRole("heading", { name: "SHIFT[3]" })).toBeInTheDocument();
    expect(screen.getByText("Applications open")).toBeInTheDocument();
    expect(screen.getByText("12 days")).toBeInTheDocument();
    expect(screen.getByText("12/30")).toBeInTheDocument();
    expect(screen.getByText("18 left")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /^Accepted/ })).toHaveAttribute(
      "href",
      "/admin/shift/applications?cohort=SHIFT%5B3%5D&status=accepted",
    );
    expect(screen.getByRole("link", { name: /^Paid/ })).toHaveAttribute(
      "href",
      "/admin/shift/applications?cohort=SHIFT%5B3%5D&paid=paid",
    );
    expect(screen.getByRole("link", { name: /^Waitlist/ })).toHaveAttribute(
      "href",
      "/admin/shift/applications?cohort=SHIFT%5B3%5D&status=waitlist",
    );

    const round = screen.getByRole("link", { name: /Live round/ });
    expect(round).toHaveAttribute("href", "/admin/shift/rounds/round-2");
    expect(within(round).getByText("To review").nextSibling).toHaveTextContent("5");
  });

  it("degrades gracefully when parts are missing", () => {
    render(<ShiftPanel snapshot={makeShift({ funnel: null, liveRound: null })} today={TODAY} />);
    expect(screen.getByText("Applications could not load.")).toBeInTheDocument();
    expect(screen.getByText("No round is running right now.")).toBeInTheDocument();
    expect(screen.queryByText(/seats paid/)).not.toBeInTheDocument();
  });

  it("still links to applications when nothing loaded", () => {
    render(<ShiftPanel snapshot={null} today={TODAY} />);
    expect(screen.getByText("SHIFT numbers could not load right now.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open applications/ })).toHaveAttribute(
      "href",
      "/admin/shift/applications",
    );
  });
});
