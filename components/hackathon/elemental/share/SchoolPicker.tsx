"use client";

import { useEffect, useRef, useState } from "react";

import { EL } from "@/components/hackathon/poster/elemental/brand";

import { btnSmall, line, outline, schoolLabel } from "./ui";

/**
 * Search the 11,246-school open-data list, or type the name when the school
 * isn't on it. Controlled: the parent holds the choice and decides what
 * "confirm" means (the student page saves it, the teacher form sends it with
 * the rest).
 */

export type SchoolChoice =
  | { key: string; name: string; province: string; seatTaken: boolean }
  | { custom: true; name: string; province: string };

type Found = { key: string; name: string; province: string; seatTaken: boolean };

// copy: placeholder — Angpao rewrites
const COPY = {
  search: "พิมพ์ชื่อโรงเรียน",
  label: "ชื่อโรงเรียน",
  none: "ไม่เจอในรายชื่อ ลองพิมพ์สั้นลง หรือพิมพ์ชื่อเองด้านล่าง",
  seatTaken: "ที่นั่งฟรีมีคนได้แล้ว",
  missing: "ไม่มีโรงเรียนของฉันในรายชื่อ",
  customName: "ชื่อโรงเรียน",
  customProvince: "จังหวัด",
  useName: "ใช้ชื่อนี้",
  backToSearch: "กลับไปค้นหา",
  customNote: "ทีมงานจะเช็กชื่อโรงเรียนก่อนให้ที่นั่งฟรี",
  change: "เปลี่ยน",
};

export function SchoolPicker({
  startQuery,
  value,
  onChange,
}: {
  startQuery: string;
  value: SchoolChoice | null;
  onChange: (choice: SchoolChoice | null) => void;
}) {
  const [query, setQuery] = useState(startQuery);
  const [schools, setSchools] = useState<Found[] | null>(null);
  const [custom, setCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customProvince, setCustomProvince] = useState("");
  const seq = useRef(0);

  useEffect(() => {
    if (custom || value) return;
    const q = query.trim();
    const n = ++seq.current;
    if (q.length < 2) {
      const clear = setTimeout(() => n === seq.current && setSchools(null), 0);
      return () => clearTimeout(clear);
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/hackathon/elemental/share/schools?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { schools: Found[] };
        if (n === seq.current) setSchools(data.schools);
      } catch {
        if (n === seq.current) setSchools([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, custom, value]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3" style={{ borderColor: EL.flame }}>
        <span className="min-w-0">
          {schoolLabel(value.name)}
          {value.province && (
            <span className="block text-sm" style={{ color: EL.inkSoft }}>
              {value.province}
            </span>
          )}
        </span>
        <button type="button" onClick={() => onChange(null)} className="shrink-0 text-sm underline underline-offset-4" style={{ color: EL.inkSoft }}>
          {COPY.change}
        </button>
      </div>
    );
  }

  if (custom) {
    return (
      <div className="space-y-3">
        <input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder={COPY.customName}
          aria-label={COPY.customName}
          maxLength={120}
          className="w-full rounded-xl border bg-white px-4 py-3.5 text-lg outline-none"
          style={{ borderColor: line, color: EL.ink }}
        />
        <input
          value={customProvince}
          onChange={(e) => setCustomProvince(e.target.value)}
          placeholder={COPY.customProvince}
          aria-label={COPY.customProvince}
          maxLength={60}
          className="w-full rounded-xl border bg-white px-4 py-3.5 text-lg outline-none"
          style={{ borderColor: line, color: EL.ink }}
        />
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={customName.trim().length < 2}
            onClick={() => onChange({ custom: true, name: customName.trim().replace(/^(โรงเรียน|รร\.?)\s*/, ""), province: customProvince.trim() })}
            className={btnSmall}
            style={outline}
          >
            {COPY.useName}
          </button>
          <button type="button" onClick={() => setCustom(false)} className="text-sm underline underline-offset-4" style={{ color: EL.inkSoft }}>
            {COPY.backToSearch}
          </button>
        </div>
        <p className="text-sm" style={{ color: EL.inkSoft }}>
          {COPY.customNote}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={COPY.search}
        aria-label={COPY.label}
        className="w-full rounded-xl border bg-white px-4 py-3.5 text-lg outline-none"
        style={{ borderColor: line, color: EL.ink }}
      />
      {schools && schools.length === 0 && <p style={{ color: EL.inkSoft }}>{COPY.none}</p>}
      {schools && schools.length > 0 && (
        <ul className="space-y-2" aria-label="โรงเรียน">
          {schools.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => onChange(s)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 text-left"
                style={{ borderColor: line, color: EL.ink }}
              >
                <span className="min-w-0">
                  โรงเรียน{s.name}
                  <span className="block text-sm" style={{ color: EL.inkSoft }}>
                    {s.province}
                  </span>
                </span>
                {s.seatTaken && (
                  <span className="shrink-0 text-xs" style={{ color: EL.inkSoft }}>
                    {COPY.seatTaken}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={() => setCustom(true)} className="text-sm underline underline-offset-4" style={{ color: EL.inkSoft }}>
        {COPY.missing}
      </button>
    </div>
  );
}
