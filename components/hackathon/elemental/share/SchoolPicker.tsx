"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { EL } from "@/components/hackathon/poster/elemental/brand";

import { btnSmall, hairline, inlineTap, line, outline, schoolLabel } from "./ui";

/**
 * Search the 11,246-school open-data list, or type the name when the school
 * isn't on it. Controlled: the parent holds the choice and decides what
 * "confirm" means (the student page saves it, the teacher form sends it with
 * the rest).
 */

export type SchoolChoice =
  | { key: string; name: string; province: string }
  | { custom: true; name: string; province: string };

type Found = { key: string; name: string; province: string };

// copy: placeholder — Angpao rewrites
const COPY = {
  search: "พิมพ์ชื่อโรงเรียน",
  label: "ชื่อโรงเรียน",
  none: "ไม่เจอในรายชื่อ ลองพิมพ์สั้นลง หรือพิมพ์ชื่อเองด้านล่าง",
  missing: "ไม่มีโรงเรียนของฉันในรายชื่อ",
  customName: "ชื่อโรงเรียน",
  customProvince: "จังหวัด",
  useName: "ใช้ชื่อนี้",
  backToSearch: "กลับไปค้นหา",
  customNote: "ทีมงานจะเช็กชื่อโรงเรียนก่อนให้ที่นั่งฟรี",
  change: "เปลี่ยน",
  clear: "ล้างคำค้น",
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
        <button type="button" onClick={() => onChange(null)} className={`${inlineTap} shrink-0 px-2`} style={{ color: EL.inkSoft }}>
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
          <button type="button" onClick={() => setCustom(false)} className={inlineTap} style={{ color: EL.inkSoft }}>
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
      {/* Stays on screen while the results scroll under it. */}
      <div className="sticky top-0 z-10 -mx-1 px-1 py-1" style={{ backgroundColor: EL.cream }}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2" style={{ color: EL.inkSoft }} aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={COPY.search}
            aria-label={COPY.label}
            type="search"
            enterKeyHint="search"
            className="w-full rounded-xl bg-white py-3.5 pl-12 pr-12 text-lg outline-none [&::-webkit-search-cancel-button]:hidden"
            style={{ boxShadow: `inset 0 0 0 1.5px ${EL.ink}`, color: EL.ink }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={COPY.clear}
              className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full"
              style={{ color: EL.inkSoft }}
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      {schools && schools.length === 0 && <p style={{ color: EL.inkSoft }}>{COPY.none}</p>}
      {schools && schools.length > 0 && (
        <ul className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: line }} aria-label="โรงเรียน">
          {schools.map((s, i) => (
            <li key={s.key} style={i > 0 ? { borderTop: `1px solid ${hairline}` } : undefined}>
              <button
                type="button"
                onClick={() => onChange(s)}
                className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left"
                style={{ color: EL.ink }}
              >
                <span className="min-w-0">
                  โรงเรียน{s.name}
                  <span className="block text-sm" style={{ color: EL.inkSoft }}>
                    {s.province}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={() => setCustom(true)} className={inlineTap} style={{ color: EL.inkSoft }}>
        {COPY.missing}
      </button>
    </div>
  );
}
