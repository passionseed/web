/**
 * Cybersecurity bespoke pieces: the registry covers every id, the year pick is
 * never sent anywhere but a value-free tap, demo mode tracks nothing, and
 * reduced motion shows the final state at once.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import type { GuideTracker } from "@/lib/radar-guide/types";
import { BESPOKE } from "../index";
import BirthYearTimeline, { birthYearResult, yearPosition, type BirthYearTimelineProps } from "../BirthYearTimeline";
import BucketPipe, { pipeShare, type BucketPipeProps } from "../BucketPipe";
import { BESPOKE_SLUGS, loadBespoke } from "../../registry";

const BIRTH: BirthYearTimelineProps = {
  promptTh: "เธอเกิดปีไหน",
  years: [2550, 2551, 2552],
  skipTh: "ไม่บอก",
  bugYear: 2542,
  nowYear: 2569,
  bugLabelTh: "บั๊กเกิดราวปีนี้",
  youLabelTh: "เธอเกิด",
  nowLabelTh: "วันนี้",
  resultTh: "บั๊กนี้อยู่ในโค้ดมาก่อนเธอเกิดราว {n} ปี",
  resultNoYearTh: "บั๊กนี้อยู่ในโค้ดมาราว 27 ปี",
  privacyTh: "เราไม่เก็บปีเกิด และไม่ส่งไปไหน",
};

const BUCKET: BucketPipeProps = {
  titleTh: "เจอเร็ว แต่แก้ช้า",
  asOfTh: "ถึง 2 พ.ย. 2569",
  bucketLabelTh: "แจ้งแล้ว",
  bucket: 5087,
  pipeLabelTh: "แก้แล้วอย่างน้อย",
  pipe: 629,
  unitTh: "ตัว",
  ratioTh: "ราว 12%",
  ratioLabelTh: "เราคำนวณเอง",
  badgeTh: "ตัวเลขจากบริษัทเจ้าของเอง",
};

function tracker() {
  return { track: jest.fn() } as unknown as GuideTracker & { track: jest.Mock };
}

describe("cybersecurity bespoke registry", () => {
  it("loads the cybersecurity pieces and an empty registry for other slugs", async () => {
    expect(BESPOKE_SLUGS).toContain("cybersecurity");
    expect(Object.keys(await loadBespoke("cybersecurity")).sort()).toEqual(Object.keys(BESPOKE).sort());
    expect(await loadBespoke("software-engineer")).toEqual({});
    expect(await loadBespoke("__proto__")).toEqual({});
  });
});

describe("BirthYearTimeline", () => {
  it("computes the gap and timeline position", () => {
    expect(birthYearResult(BIRTH, 2552)).toBe("บั๊กนี้อยู่ในโค้ดมาก่อนเธอเกิดราว 10 ปี");
    expect(birthYearResult(BIRTH, "skip")).toBe(BIRTH.resultNoYearTh);
    expect(yearPosition(2542, 2542, 2569)).toBe(0);
    expect(yearPosition(2600, 2542, 2569)).toBe(100);
  });

  it("tracks one value-free tap and reports done once", () => {
    const t = tracker();
    const onResult = jest.fn();
    render(
      <BirthYearTimeline
        slug="cybersecurity"
        pageKey="mythos"
        blockId="birthyear"
        props={BIRTH}
        tracker={t}
        demo={false}
        reducedMotion
        onResult={onResult}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "2552" }));
    fireEvent.click(screen.getByRole("button", { name: "2551" }));
    expect(screen.getByText("บั๊กนี้อยู่ในโค้ดมาก่อนเธอเกิดราว 9 ปี")).toBeTruthy();
    expect(t.track).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(t.track.mock.calls[0][0])).not.toContain("255");
    expect(onResult).toHaveBeenCalledTimes(1);
  });

  it("tracks nothing in demo mode and exposes demo targets", () => {
    const t = tracker();
    const { container } = render(
      <BirthYearTimeline
        slug="cybersecurity"
        pageKey="mythos"
        blockId="birthyear"
        props={BIRTH}
        tracker={t}
        demo
        reducedMotion={false}
      />
    );
    expect(container.querySelector('[data-demo="birthyear.year-2552"]')).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "ไม่บอก" }));
    expect(t.track).not.toHaveBeenCalled();
  });
});

describe("BucketPipe", () => {
  it("keeps the pipe visible and proportional", () => {
    expect(pipeShare(629, 5087)).toBeCloseTo(12.36, 1);
    expect(pipeShare(1, 5087)).toBe(2);
    expect(pipeShare(5, 0)).toBe(0);
  });

  it("shows the final state at once with reduced motion", () => {
    const { container } = render(
      <BucketPipe
        slug="cybersecurity"
        pageKey="triage"
        blockId="bucket"
        props={BUCKET}
        tracker={tracker()}
        demo={false}
        reducedMotion
      />
    );
    expect(container.querySelector(".cy-bucket")?.hasAttribute("data-shown")).toBe(true);
    expect(screen.getByText("5,087")).toBeTruthy();
    expect(screen.getByText("629")).toBeTruthy();
  });
});
