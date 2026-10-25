"use client";

import { useState } from "react";
import { ArrowRight, CalendarDays, Check, FlaskConical, Target, Users } from "lucide-react";

import {
  COMMUNITY_PLANNED_PRICE,
  COMMUNITY_TEST_PRICE,
  type CommunitySignup,
} from "@/lib/shift/feedback";

import styles from "./feedback.module.css";
import space from "../next/shiftNext.module.css";

/**
 * Step 2 of /shift/feedback, shown once the answers are saved: what the
 * project community is, in four cards rather than a paragraph, then the two
 * ways in for this test batch. The choice is written onto the saved row.
 */

const WAYS_IN: { value: CommunitySignup; price: string; unit: string; line: string; note: string }[] = [
  {
    value: "free_video",
    price: "ฟรี",
    unit: "แลกกับคลิปสั้นๆ",
    line: "อัดคลิปที่เราเล่าให้ผู้ปกครองฟังว่าได้อะไรจาก SHIFT",
    note: "พี่ใช้เป็นรีวิวเมื่อผู้ปกครองโอเคแล้วเท่านั้น",
  },
  {
    value: "pay_250",
    price: `฿${COMMUNITY_TEST_PRICE}`,
    unit: "ต่อเดือน",
    line: "จ่ายรายเดือน ไม่ต้องอัดคลิป",
    note: "ยังไม่ต้องจ่ายตอนนี้ พี่จะส่งวิธีจ่ายในกลุ่ม",
  },
];

const NOT_YET: { value: CommunitySignup; label: string }[] = [
  { value: "ask_parents", label: "ขอคุยกับผู้ปกครองก่อน" },
  { value: "not_now", label: "ยังไม่ตอนนี้" },
];

function whatsInside(sessionWhen: string) {
  return [
    { icon: CalendarDays, title: "เจอกันทุกสัปดาห์", line: `${sessionWhen} ออนไลน์ใน Discord` },
    { icon: Target, title: "การ์ดเป้าหมาย", line: "ตั้งเป้าเดือนนี้ สัปดาห์นี้ และก้าวแรกที่ทำได้ใน 10 นาที" },
    { icon: Users, title: "ทีมกับพี่ mentor", line: "อัปเดตกันสั้นๆ ติดตรงไหนกดขอให้ช่วย พี่ mentor เห็นทุกทีม" },
    { icon: FlaskConical, title: "เทสกับคนใช้จริง", line: "จดผลเทส แล้วโชว์ความคืบหน้าในฟีดให้เพื่อนเห็น" },
  ];
}

export function FeedbackCommunityStep({
  feedbackId,
  sessionWhen,
  onDone,
}: {
  feedbackId: string;
  sessionWhen: string;
  /** Called with the saved choice, or null when the student skips. */
  onDone: (choice: CommunitySignup | null) => void;
}) {
  const [choice, setChoice] = useState<CommunitySignup | null>(null);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function confirm() {
    if (!choice) return;
    setSending(true);
    setFailed(false);
    try {
      const res = await fetch("/api/shift/feedback/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: feedbackId, communitySignup: choice }),
      });
      if (res.ok) {
        onDone(choice);
        return;
      }
      setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className={styles.community} aria-labelledby="community-title">
      <p className={styles.saved} role="status">
        <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
        บันทึกคำตอบแล้ว ขอบคุณนะ
      </p>

      <p className={styles.part}>
        <span className={styles.partIndex}>อีกนิด</span>
        <span className={styles.partTitle}>ต่อจากนี้</span>
      </p>
      <h2 id="community-title" className={styles.communityTitle}>
        SHIFT High: ทำโปรเจกต์ต่อด้วยกัน
      </h2>
      <p className={styles.communityLede}>จบ 7 วันแล้ว ไม่ต้องสร้างต่อคนเดียว</p>

      <ul className={styles.inside}>
        {whatsInside(sessionWhen).map(({ icon: Icon, title, line }) => (
          <li key={title} className={styles.insideCard}>
            <span className={styles.insideIcon} aria-hidden="true">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span>
              <span className={styles.insideTitle}>{title}</span>
              <span className={styles.insideLine}>{line}</span>
            </span>
          </li>
        ))}
      </ul>
      <a href="/shift/alumni" target="_blank" rel="noopener noreferrer" className={styles.peek}>
        ดูว่า SHIFT High ทำอะไรกัน และโปรเจกต์ที่รุ่นพี่สร้าง
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>

      <h3 className={styles.waysTitle}>เข้าได้ 2 แบบ</h3>
      <p className={styles.waysAnchor}>
        ราคาที่วางไว้คือเดือนละ ฿{COMMUNITY_PLANNED_PRICE.toLocaleString("en-US")} รุ่นนี้เป็นรุ่นทดลอง เลยเลือกได้แบบนี้
      </p>

      <div className={styles.ways} role="radiogroup" aria-label="เข้า SHIFT High แบบไหน">
        {WAYS_IN.map((way) => (
          <button
            key={way.value}
            type="button"
            role="radio"
            aria-checked={choice === way.value}
            onClick={() => setChoice(way.value)}
            className={styles.way}
          >
            <span className={styles.wayPrice}>{way.price}</span>
            <span className={styles.wayUnit}>{way.unit}</span>
            <span className={styles.wayLine}>{way.line}</span>
            <span className={styles.wayNote}>{way.note}</span>
          </button>
        ))}
      </div>

      <div className={styles.notYet} role="radiogroup" aria-label="ยังไม่สมัคร">
        {NOT_YET.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={choice === option.value}
            onClick={() => setChoice(option.value)}
            className={styles.notYetChip}
          >
            {option.label}
          </button>
        ))}
      </div>

      {failed && (
        <p className={styles.retry} role="alert">
          บันทึกตัวเลือกไม่สำเร็จ ลองกดอีกครั้งนะ คำตอบ feedback บันทึกไว้แล้ว
        </p>
      )}
      <button type="button" onClick={() => void confirm()} disabled={!choice || sending} className={`${space.cta} ${styles.submit}`}>
        <span>{sending ? "กำลังบันทึก..." : "ยืนยัน"}</span>
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" onClick={() => onDone(null)} className={styles.skip}>
        ข้ามไปก่อน
      </button>
    </section>
  );
}
