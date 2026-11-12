import { fireEvent, render, screen } from "@testing-library/react";
import type { GuideTracker } from "@/lib/radar-guide/types";
import { GuideIntentButton, GuideOutro, GuideProgramLine } from "../GuideOutro";
import { MidShareCard } from "../MidShareCard";

function makeTracker(): GuideTracker & { track: jest.Mock } {
  return { visitId: null, track: jest.fn(), submitCareerRequest: jest.fn(async () => "ok" as const) };
}

describe("GuideOutro", () => {
  test("renders the asks in the spec order", () => {
    const tracker = makeTracker();
    const { container } = render(
      <GuideOutro
        fieldSlug="cybersecurity"
        fieldNameTh="นักความปลอดภัยไซเบอร์"
        tracker={tracker}
        uaApp="instagram"
        utmSource="ig-comment-dm"
        firstStep={<a href="https://tryhackme.com">TryHackMe</a>}
        intentSlot={<GuideIntentButton tracker={tracker} onIntent={jest.fn()} />}
        programSlot={
          <GuideProgramLine tracker={tracker} lineTh="SHIFT รอบใหม่เปิดรับแล้ว" linkLabelTh="ดู SHIFT" href="/shift" />
        }
        resourcesSlot={<a href="https://example.com/r">Resource</a>}
      />
    );
    const text = container.textContent ?? "";
    const order = [
      "ลองอันนี้ก่อน",
      "สนใจสายนี้",
      "อยากให้ทำอาชีพไหนต่อ?",
      "ส่งใน LINE",
      "ติดตาม @passion_seed.th",
      "SHIFT รอบใหม่เปิดรับแล้ว",
      "Resource",
      "ดูอาชีพอื่น",
    ].map((needle) => text.indexOf(needle));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(screen.getByRole("link", { name: /ดูอาชีพอื่น/ })).toHaveAttribute("href", "/radar");
  });

  test("never offers a 1:1 chat or the LINE QR", () => {
    const tracker = makeTracker();
    const { container } = render(
      <GuideOutro fieldSlug="data-science" fieldNameTh={null} tracker={tracker} uaApp={null} utmSource={null} />
    );
    expect(container.textContent).not.toMatch(/นัดคุย|ทักมาคุย|QR/);
  });

  test("a click inside the first-step tile sends cta_click first-step once", () => {
    const tracker = makeTracker();
    render(
      <GuideOutro
        fieldSlug="cybersecurity"
        fieldNameTh={null}
        tracker={tracker}
        uaApp={null}
        utmSource={null}
        firstStep={
          <div>
            <p>tile text</p>
            <button type="button">เปิดดู</button>
          </div>
        }
      />
    );
    fireEvent.click(screen.getByText("tile text"));
    expect(tracker.track).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "เปิดดู" }));
    fireEvent.click(screen.getByRole("button", { name: "เปิดดู" }));
    expect(tracker.track.mock.calls).toEqual([
      [{ type: "cta_click", target: "first-step" }],
    ]);
  });

  test("GuideIntentButton records once and shows บันทึกแล้ว", async () => {
    const tracker = makeTracker();
    const onIntent = jest.fn();
    render(<GuideIntentButton tracker={tracker} onIntent={onIntent} />);
    fireEvent.click(screen.getByRole("button", { name: /สนใจสายนี้/ }));
    await Promise.resolve();
    expect(onIntent).toHaveBeenCalledTimes(1);
    expect(tracker.track).toHaveBeenCalledWith({ type: "cta_click", target: "intent" });
    expect(screen.getByRole("button", { name: /บันทึกแล้ว/ })).toBeDisabled();
  });

  test("GuideProgramLine sends cta_click program", () => {
    const tracker = makeTracker();
    render(<GuideProgramLine tracker={tracker} lineTh="line" linkLabelTh="ดู SHIFT" href="/shift" />);
    fireEvent.click(screen.getByRole("link", { name: /ดู SHIFT/ }));
    expect(tracker.track).toHaveBeenCalledWith({ type: "cta_click", target: "program" });
  });
});

test("MidShareCard has one line, the two share buttons and one follow line", () => {
  render(
    <MidShareCard fieldSlug="cybersecurity" fieldNameTh={null} uaApp="instagram" utmSource={null} tracker={makeTracker()} />
  );
  expect(screen.getByText("ข้อมูลแบบนี้ มีเพื่อนที่ควรเห็นไหม")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "ส่งใน LINE" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /คัดลอกลิงก์/ })).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: /ติดตาม/ })).toHaveLength(1);
});
