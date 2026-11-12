import { fireEvent, render, screen } from "@testing-library/react";

import { CtaResourceLinks, RadarCardView, ctaPathSlug, ctaResources } from "../RadarCards";
import { radarProgramLine } from "@/lib/content/radar-cta";
import { findDashes } from "@/lib/radar-guide/thai-copy";

jest.mock("@/components/radar/OglTrendBackground", () => ({
  OglTrendBackground: () => null,
}));

jest.mock("@/lib/content/radar-cta", () => ({
  radarProgramLine: jest.fn(() => ({
    title: "อยากลองทำจริง ไม่ใช่แค่อ่าน?",
    body: "SHIFT[3] 7 วัน สร้างโปรเจกต์จริงที่คนนอกได้ใช้ แล้วเก็บเป็นพอร์ต TCAS 1",
    cta: "ดู SHIFT[3] รอบที่เปิดรับอยู่",
    href: "/shift/3?from=radar-cybersecurity",
  })),
}));

const mockedProgramLine = radarProgramLine as jest.MockedFunction<typeof radarProgramLine>;

test("cta card names SHIFT, not TechSeed, with no price, no em dash and no 1:1 session", () => {
  const { container } = render(
    <RadarCardView
      kind="cta"
      accent="#60a5fa"
      fieldSlug="cybersecurity"
      content={{ title: "Next Step" }}
    />
  );

  const text = container.textContent ?? "";
  expect(text).not.toMatch(/TechSeed/);
  expect(text).not.toMatch(/100 บาท/);
  expect(text).not.toMatch(/นัดคุยกับรุ่นพี่/);
  expect(text).not.toMatch(/คุยกับพวกเรา/);
  expect(findDashes(text)).toEqual([]);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  expect(mockedProgramLine).toHaveBeenCalledWith("cybersecurity");
  expect(screen.getByRole("link", { name: /SHIFT\[3\]/ })).toHaveAttribute(
    "href",
    "/shift/3?from=radar-cybersecurity"
  );
});

test("cta card hides the program line when no round is open", () => {
  mockedProgramLine.mockReturnValueOnce(null);
  render(<RadarCardView kind="cta" accent="#60a5fa" content={{ title: "Next Step" }} />);
  expect(screen.queryByRole("link", { name: /SHIFT/ })).not.toBeInTheDocument();
});

test("cta card renders resource chips as real external links", () => {
  render(
    <RadarCardView
      kind="cta"
      accent="#60a5fa"
      content={{
        title: "Next Step",
        resources: [
          { label: "TryHackMe", url: "https://tryhackme.com" },
          { label: "HackTheBox", url: "https://www.hackthebox.com" },
        ],
      }}
    />
  );

  expect(screen.getByRole("link", { name: /TryHackMe/ })).toHaveAttribute(
    "href",
    "https://tryhackme.com"
  );
  expect(screen.getByRole("link", { name: /HackTheBox/ })).toHaveAttribute(
    "href",
    "https://www.hackthebox.com"
  );
});

test("cta card shows the intent button and hides the resources block when empty", () => {
  render(
    <RadarCardView kind="cta" accent="#60a5fa" content={{ title: "Next Step" }} />
  );

  expect(screen.getByRole("button", { name: "สนใจสายนี้" })).toBeInTheDocument();
  expect(screen.queryByText(/ลองเล่นด้วยตัวเองก่อน/)).not.toBeInTheDocument();
});

test("cta clicks are reported as cta_click targets", () => {
  const onCtaClick = jest.fn();
  render(
    <RadarCardView
      kind="cta"
      accent="#60a5fa"
      content={{
        title: "Next Step",
        resources: [{ label: "TryHackMe", url: "https://tryhackme.com" }],
      }}
      onCtaClick={onCtaClick}
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "สนใจสายนี้" }));
  fireEvent.click(screen.getByRole("link", { name: /SHIFT\[3\]/ }));
  fireEvent.click(screen.getByRole("link", { name: /TryHackMe/ }));

  expect(onCtaClick.mock.calls.map(([target]) => target)).toEqual([
    "intent",
    "program",
    "resource:1",
  ]);
});

test("the resource links render on their own for the guide outro", () => {
  const onCtaClick = jest.fn();
  render(
    <CtaResourceLinks
      resources={ctaResources({
        resources: [
          { label: "TryHackMe", url: "https://tryhackme.com" },
          { label: "Bad", url: "javascript:alert(1)" },
        ],
      })}
      onCtaClick={onCtaClick}
    />
  );

  fireEvent.click(screen.getByRole("link", { name: /TryHackMe/ }));
  expect(screen.queryByRole("link", { name: /Bad/ })).not.toBeInTheDocument();
  expect(onCtaClick).toHaveBeenCalledWith("resource:1");
});

test("ctaPathSlug reads the squad URL's last segment", () => {
  expect(ctaPathSlug("https://passionseed.org/paths/cyber-squad")).toBe("cyber-squad");
  expect(ctaPathSlug(null)).toBe("interested");
  expect(ctaPathSlug("/")).toBe("interested");
});
