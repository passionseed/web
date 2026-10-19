import { INK } from "@/components/shift/poster/riso";
import { SHIFT_PAYMENT } from "@/lib/content/shift-cohort";
import { FEEDBACK_RETENTION_YEARS } from "@/lib/shift/feedback";

/**
 * PDPA notice and consent for the feedback form, in plain words a student
 * can read in 20 seconds. Changing the substance means bumping
 * FEEDBACK_NOTICE_VERSION in lib/shift/feedback.ts.
 */

const paper = (alpha: string) => `${INK.paper}${alpha}`;

const NOTICE = [
  ["เก็บอะไร", "ชื่อเล่นกับคำตอบในฟอร์มนี้"],
  ["ใช้ทำอะไร", "ปรับ SHIFT รอบหน้า นัด session ศิษย์เก่า และยกคำพูดไปใช้ตามที่เราเลือกในข้อสุดท้ายเท่านั้น"],
  ["ใครเห็น", "ทีม PassionSeed เท่านั้น ไม่ขาย ไม่ส่งต่อให้ใคร"],
  ["เก็บนานแค่ไหน", `${FEEDBACK_RETENTION_YEARS} ปี แล้วลบทิ้ง`],
  [
    "เปลี่ยนใจได้",
    `อยากดู แก้ ลบคำตอบ หรือถอนการยกคำพูด ทัก LINE ${SHIFT_PAYMENT.lineId} ได้ทุกเมื่อ`,
  ],
] as const;

export function FeedbackConsent({
  checked,
  onChange,
  error,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}) {
  return (
    <fieldset>
      <legend className="font-kodchasan text-base font-semibold">ข้อมูลของเรา (PDPA)</legend>
      <dl
        className="mt-3 divide-y divide-[rgba(242,234,217,0.12)] rounded-xl px-4 py-1 text-sm"
        style={{ backgroundColor: paper("0a"), boxShadow: `inset 0 0 0 1px ${paper("1f")}` }}
      >
        {NOTICE.map(([label, value]) => (
          <div key={label} className="flex gap-3 py-2.5">
            <dt className="w-24 shrink-0" style={{ color: paper("80") }}>
              {label}
            </dt>
            <dd className="min-w-0 flex-1 leading-relaxed" style={{ color: paper("cc") }}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs" style={{ color: paper("80") }}>
        รายละเอียดเต็มอยู่ใน{" "}
        <a href="/privacy" className="underline underline-offset-4">
          นโยบายความเป็นส่วนตัว
        </a>
      </p>

      <label
        className="mt-5 flex cursor-pointer items-start gap-3 text-sm leading-relaxed"
        style={{ color: paper("b3") }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#ff6c2f]"
        />
        อ่านแล้ว และยินยอมให้ PassionSeed เก็บและใช้คำตอบนี้ตามที่เขียนไว้ด้านบน
      </label>
      {error && (
        <p className="mt-2 text-sm font-semibold" style={{ color: INK.pink }} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
