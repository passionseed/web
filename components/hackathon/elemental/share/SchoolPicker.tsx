"use client";

import { useEffect, useId, useRef, useState } from "react";

import { EL_FONT } from "@/components/hackathon/poster/elemental/brand";

import { Body, EditorialLink, Fine, PixelIcon, SecondaryButton, TextInput, v } from "./ui";

/**
 * Search the 11,246-school open-data list, or type the name when the school
 * isn't on it. Controlled: the parent holds the choice and decides what
 * "confirm" means (the student page saves it from its sticky bar, the
 * teacher form sends it with the rest). Colours come from the surface.
 */

export type SchoolChoice =
  | { key: string; name: string; province: string }
  | { custom: true; name: string; province: string };

type Found = { key: string; name: string; province: string };

// copy: placeholder — Angpao rewrites
const COPY = {
  search: "พิมพ์ชื่อโรงเรียน",
  label: "โรงเรียน",
  results: "โรงเรียนที่ตรงกับคำค้น",
  none: "ไม่เจอในรายชื่อ ลองพิมพ์สั้นลง หรือพิมพ์ชื่อเอง",
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
  label = COPY.label,
}: {
  startQuery: string;
  value: SchoolChoice | null;
  onChange: (choice: SchoolChoice | null) => void;
  label?: string;
}) {
  const id = useId();
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
      <div>
        <p className="mb-2" style={{ fontFamily: EL_FONT.body, fontSize: 16, lineHeight: "26px" }}>
          {label}
        </p>
        <div className="flex items-center justify-between gap-3 py-3 pl-4 pr-1" style={{ boxShadow: `inset 2px 0 0 ${v.action}`, backgroundColor: "var(--el-input)" }}>
          <span className="min-w-0">
            <Body as="span" className="block">
              โรงเรียน{value.name}
            </Body>
            {value.province && <Fine as="span">{value.province}</Fine>}
          </span>
          <EditorialLink size="sm" arrow={false} onClick={() => onChange(null)} className="shrink-0 px-3">
            {COPY.change}
          </EditorialLink>
        </div>
      </div>
    );
  }

  if (custom) {
    const name = customName.trim().replace(/^(โรงเรียน|รร\.?)\s*/, "");
    return (
      <div className="space-y-4">
        <TextInput id={`${id}-name`} label={COPY.customName} value={customName} onChange={(e) => setCustomName(e.target.value)} maxLength={120} autoComplete="off" />
        <TextInput id={`${id}-province`} label={COPY.customProvince} value={customProvince} onChange={(e) => setCustomProvince(e.target.value)} maxLength={60} autoComplete="off" />
        <Fine>{COPY.customNote}</Fine>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <SecondaryButton disabled={name.length < 2} onClick={() => onChange({ custom: true, name, province: customProvince.trim() })}>
            {COPY.useName}
          </SecondaryButton>
          <EditorialLink size="sm" arrow={false} onClick={() => setCustom(false)}>
            {COPY.backToSearch}
          </EditorialLink>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <TextInput
          id={`${id}-search`}
          label={label}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={COPY.search}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          leading={<PixelIcon name="search" />}
          className="[&_input::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={COPY.clear}
            className="absolute bottom-1 right-1 flex h-11 w-11 items-center justify-center"
            style={{ color: v.secondary, fontFamily: EL_FONT.mono, fontSize: 18 }}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
      </div>
      {schools && schools.length === 0 && <Body secondary>{COPY.none}</Body>}
      {schools && schools.length > 0 && (
        <ul aria-label={COPY.results} className="border-b" style={{ borderColor: v.rule }}>
          {schools.map((s) => (
            <li key={s.key} className="border-t" style={{ borderColor: v.rule }}>
              <button type="button" onClick={() => onChange(s)} className="flex min-h-14 w-full items-center justify-between gap-3 py-3 text-left active:opacity-70">
                <span className="min-w-0">
                  <Body as="span" className="block">
                    โรงเรียน{s.name}
                  </Body>
                  <Fine as="span">{s.province}</Fine>
                </span>
                <span aria-hidden="true" style={{ color: v.secondary }}>
                  <PixelIcon name="arrow" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <EditorialLink size="sm" arrow={false} onClick={() => setCustom(true)}>
        {COPY.missing}
      </EditorialLink>
    </div>
  );
}
