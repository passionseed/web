"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { formatThaiDateRange } from "@/lib/content/shift-cohort";
import {
  MAX_RANGES,
  SHIFT_WINDOW_DAYS,
  addDays,
  mergeRanges,
  rangeLength,
  type DateRange,
} from "@/lib/shift/interest";

import styles from "./shiftNext.module.css";

/**
 * Tap a first day, then a last day, to add a free range. Tap inside a range
 * to drop it. Several ranges are fine; at least one must run 7 days.
 */

const THAI_MONTHS_LONG = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];
/** Weeks start on Monday: SHIFT rounds are planned around the school week. */
const WEEKDAYS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"];

interface Month {
  year: number;
  /** 0-based. */
  month: number;
}

const monthOf = (iso: string): Month => {
  const [year, month] = iso.split("-").map(Number);
  return { year, month: month - 1 };
};
const monthKey = ({ year, month }: Month) => year * 12 + month;
const fromKey = (key: number): Month => ({
  year: Math.floor(key / 12),
  month: key % 12,
});
const isoOf = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;

/** Cells for one month, Monday first; null pads the first week. */
function monthCells({ year, month }: Month): (string | null)[] {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const pad = (first + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return [
    ...Array<null>(pad).fill(null),
    ...Array.from({ length: days }, (_, i) => isoOf(year, month, i + 1)),
  ];
}

function rangeAt(
  ranges: readonly DateRange[],
  iso: string
): DateRange | undefined {
  return ranges.find((r) => r.start <= iso && r.end >= iso);
}

function MonthGrid({
  month,
  bounds,
  ranges,
  pending,
  preview,
  onPick,
  onHover,
}: {
  month: Month;
  bounds: DateRange;
  ranges: readonly DateRange[];
  pending: string | null;
  preview: DateRange | null;
  onPick: (iso: string) => void;
  onHover: (iso: string | null) => void;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className={styles.monthName}>
        {THAI_MONTHS_LONG[month.month]} {month.year + 543}
      </p>
      <div className="grid grid-cols-7 gap-y-1 text-center" role="grid">
        {WEEKDAYS.map((day) => (
          <span key={day} className={styles.weekday}>
            {day}
          </span>
        ))}
        {monthCells(month).map((iso, i) => {
          if (!iso) return <span key={`pad-${i}`} />;
          const disabled = iso < bounds.start || iso > bounds.end;
          const range = rangeAt(ranges, iso);
          const inPreview = Boolean(
            !range && preview && iso >= preview.start && iso <= preview.end
          );
          const isEdgeStart = range?.start === iso || preview?.start === iso;
          const isEdgeEnd = range?.end === iso || preview?.end === iso;
          const weekday = i % 7;
          const isPending = pending === iso;
          const day = Number(iso.slice(8));

          return (
            <div
              key={iso}
              className={styles.cell}
              data-in-range={Boolean(range)}
              data-preview={inPreview}
              data-round-left={isEdgeStart || weekday === 0}
              data-round-right={isEdgeEnd || weekday === 6}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(iso)}
                onPointerEnter={(e) =>
                  e.pointerType === "mouse" && onHover(iso)
                }
                aria-pressed={Boolean(range) || isPending}
                aria-label={`${day} ${THAI_MONTHS_LONG[month.month]}`}
                className={`${styles.dayButton} ${
                  isPending ? "shift-next-pending" : ""
                }`}
                data-edge={
                  Boolean(range) && (range?.start === iso || range?.end === iso)
                }
                data-pending={isPending}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ShiftRangePicker({
  value,
  onChange,
  bounds,
}: {
  value: DateRange[];
  onChange: (ranges: DateRange[]) => void;
  bounds: DateRange;
}) {
  const firstKey = monthKey(monthOf(bounds.start));
  const lastKey = monthKey(monthOf(bounds.end));
  const [cursor, setCursor] = useState(firstKey);
  const [pending, setPending] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const preview = useMemo<DateRange | null>(() => {
    if (!pending || !hover) return null;
    return pending <= hover
      ? { start: pending, end: hover }
      : { start: hover, end: pending };
  }, [pending, hover]);

  const full = value.length >= MAX_RANGES;
  const hasWindow = value.some((r) => rangeLength(r) >= SHIFT_WINDOW_DAYS);

  function pick(iso: string) {
    if (!pending) {
      const existing = rangeAt(value, iso);
      if (existing) {
        onChange(value.filter((r) => r !== existing));
        return;
      }
      if (full) return;
      setPending(iso);
      return;
    }
    const range =
      pending <= iso
        ? { start: pending, end: iso }
        : { start: iso, end: pending };
    onChange(mergeRanges([...value, range]));
    setPending(null);
    setHover(null);
  }

  /** Quick add: the 7 days from the picked start, for people who just want one week. */
  function addWeek() {
    if (!pending) return;
    const end = addDays(pending, SHIFT_WINDOW_DAYS - 1);
    onChange(
      mergeRanges([
        ...value,
        { start: pending, end: end > bounds.end ? bounds.end : end },
      ])
    );
    setPending(null);
  }

  const months = [cursor, cursor + 1].filter((k) => k <= lastKey).map(fromKey);

  return (
    <div>
      <div className={styles.pickerTop}>
        <p
          className={styles.pickerStatus}
          data-pending={Boolean(pending)}
          aria-live="polite"
        >
          {pending
            ? "แตะวันสุดท้ายที่ว่าง"
            : full
            ? `เลือกครบ ${MAX_RANGES} ช่วงแล้ว แตะช่วงเดิมเพื่อเอาออก`
            : "แตะวันแรกที่ว่าง แล้วแตะวันสุดท้าย"}
        </p>
        <div className={styles.monthNav}>
          <button
            type="button"
            onClick={() => setCursor((k) => Math.max(firstKey, k - 1))}
            disabled={cursor <= firstKey}
            aria-label="เดือนก่อน"
            className={styles.navButton}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor((k) => Math.min(lastKey, k + 1))}
            disabled={cursor >= lastKey}
            aria-label="เดือนถัดไป"
            className={styles.navButton}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className={styles.months} onPointerLeave={() => setHover(null)}>
        {months.map((month, i) => (
          <div
            key={monthKey(month)}
            className={
              i === 1 ? "hidden min-w-0 flex-1 md:block" : "min-w-0 flex-1"
            }
          >
            <MonthGrid
              month={month}
              bounds={bounds}
              ranges={value}
              pending={pending}
              preview={preview}
              onPick={pick}
              onHover={setHover}
            />
          </div>
        ))}
      </div>

      {pending && (
        <div className={styles.pendingActions}>
          <button type="button" onClick={addWeek} className={styles.softButton}>
            ว่างแค่ 7 วันนี้
          </button>
          <button
            type="button"
            onClick={() => setPending(null)}
            className={styles.softButton}
            data-quiet
          >
            ยกเลิก
          </button>
        </div>
      )}

      {value.length > 0 && (
        <ul className={styles.rangeList} aria-label="ช่วงที่เลือก">
          {value.map((range) => (
            <li key={range.start} className={styles.rangeChip}>
              {formatThaiDateRange(range.start, range.end)}
              <small>{rangeLength(range)} วัน</small>
              <button
                type="button"
                onClick={() => onChange(value.filter((r) => r !== range))}
                aria-label={`เอาช่วง ${formatThaiDateRange(
                  range.start,
                  range.end
                )} ออก`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className={styles.windowStatus} data-ok={hasWindow}>
        {hasWindow
          ? "✓ มีช่วงที่ว่างติดกัน 7 วันแล้ว"
          : value.length > 0
          ? "ยังขาดอีกนิด ต้องมีสักช่วงที่ยาว 7 วันขึ้นไป"
          : `เลือกได้ตั้งแต่ ${formatThaiDateRange(bounds.start, bounds.end)}`}
      </p>
    </div>
  );
}
