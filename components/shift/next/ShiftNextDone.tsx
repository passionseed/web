"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { formatThaiDateRange } from "@/lib/content/shift-cohort";
import { MIN_BUILDERS, NEXT_ROUND_NAME } from "@/lib/content/shift-next";
import type { DateRange } from "@/lib/shift/interest";

import styles from "./shiftNext.module.css";

/**
 * After a pre-order: what happens next, and the one thing that speeds it
 * up, which is a friend free the same week.
 */

const SHARE_URL = "https://passionseed.org/shift/next?utm_source=friend";

export function ShiftNextDone({
  ranges,
  igHandle,
}: {
  ranges: DateRange[];
  igHandle: string;
}) {
  const [copied, setCopied] = useState(false);
  const handle = igHandle.trim().replace(/^@/, "");

  async function copy() {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={styles.done} role="status">
      <span className={styles.doneMark} aria-hidden="true">
        <Check className="h-6 w-6" strokeWidth={2.5} />
      </span>
      <h3>ลงชื่อ {NEXT_ROUND_NAME} แล้ว</h3>
      <p>
        ช่วงไหนมีคนว่างตรงกันครบ {MIN_BUILDERS} คน เราจะทักไปที่ IG @{handle}{" "}
        พร้อมวันและราคา แล้วค่อยตัดสินใจตอนนั้น ยังไม่ต้องจ่ายอะไร
      </p>

      <ul className={styles.rangeList}>
        {ranges.map((range) => (
          <li
            key={range.start}
            className={styles.rangeChip}
            style={{ paddingRight: "1rem" }}
          >
            {formatThaiDateRange(range.start, range.end)}
          </li>
        ))}
      </ul>

      <div className={styles.share}>
        <p>อยากให้เปิดเร็วขึ้น?</p>
        <p>
          ส่งลิงก์ให้เพื่อนที่อยากสร้างอะไรสักอย่าง ถ้าว่างช่วงเดียวกัน
          รอบนั้นก็ใกล้ครบขึ้นอีกคน
        </p>
        <button type="button" onClick={copy} className={styles.cta}>
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
        </button>
      </div>
    </div>
  );
}
