"use client";

import { useState, type KeyboardEvent } from "react";

import { Fine, PixelIcon, TextInput, v } from "../share/ui";
import { useSchoolSearch, type FoundSchool } from "../share/useSchoolSearch";
import styles from "./join.module.css";

/**
 * The school box on the sign-up form: type anything, and matching schools from
 * the open-data list show under it to tap (the same search as the share page's
 * SchoolPicker). A typed name is always accepted, so a school that isn't on the
 * list never blocks anyone. School was the field people got wrong most (14
 * people left it empty, 24 to 28 Nov 2026).
 */

/** What the form stores for a picked school: "โรงเรียน<name> <province>", so the share page's search finds it again. */
export const schoolText = (s: FoundSchool) => `โรงเรียน${s.name}${s.province ? ` ${s.province}` : ""}`;

const LIST_ID = "el-join-school-list";

export function SchoolField({
  value,
  onChange,
  onBlur,
  error,
}: {
  value: string;
  onChange: (school: string) => void;
  onBlur: () => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const found = useSchoolSearch(value, open, 5);
  // Hide the list once the box holds a school picked from it.
  const shown = open && found && found.length > 0 && !found.some((s) => schoolText(s) === value) ? found : null;

  const pick = (s: FoundSchool) => {
    onChange(schoolText(s));
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!shown) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (e.key === "ArrowDown" ? Math.min(i + 1, shown.length - 1) : Math.max(i - 1, -1)));
    } else if (e.key === "Enter" && active >= 0 && shown[active]) {
      // Enter picks the highlighted school instead of moving the form on.
      e.preventDefault();
      pick(shown[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div>
      <TextInput
        id="el-join-school"
        label="โรงเรียนหรือสถาบัน"
        // PLACEHOLDER copy (Angpao)
        hint="พิมพ์แล้วเลือกจากรายชื่อ หรือพิมพ์ชื่อเองก็ได้"
        error={error}
        value={value}
        maxLength={160}
        // PLACEHOLDER copy (Angpao): reused from SchoolPicker
        placeholder="พิมพ์ชื่อโรงเรียน"
        autoComplete="off"
        enterKeyHint="next"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={Boolean(shown)}
        aria-controls={LIST_ID}
        aria-activedescendant={shown && active >= 0 ? `${LIST_ID}-${active}` : undefined}
        leading={<PixelIcon name="search" />}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          onBlur();
        }}
        onKeyDown={onKeyDown}
      />
      {shown && (
        <ul id={LIST_ID} role="listbox" aria-label="โรงเรียนที่ตรงกับคำค้น" className="mt-1 border-b" style={{ borderColor: v.rule }}>
          {shown.map((s, i) => (
            <li
              key={s.key}
              id={`${LIST_ID}-${i}`}
              role="option"
              aria-selected={i === active}
              // Pick before the box loses focus, so the tap isn't lost to the blur.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
              className={`${styles.schoolOption} flex min-h-12 cursor-pointer items-center justify-between gap-3 border-t px-1 py-2`}
              style={{ borderColor: v.rule }}
            >
              <span className="min-w-0">
                <span className="block" style={{ fontSize: 16, lineHeight: "24px" }}>
                  โรงเรียน{s.name}
                </span>
                {s.province && <Fine as="span">{s.province}</Fine>}
              </span>
              <span aria-hidden="true" style={{ color: v.secondary }}>
                <PixelIcon name="arrow" />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
