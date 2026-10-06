"use client";

import { useEffect, useState } from "react";
import { cohortPath, formatThaiDateRange, priceLabel, type ShiftCohort } from "@/lib/content/shift-cohort";
import { getShiftSource, withShiftSource } from "@/lib/shift/attribution";
import { trackMetaCustom } from "@/components/shift/MetaPixel";

export function ShiftParentShare({ cohort }: { cohort: ShiftCohort }) {
  const [source, setSource] = useState<string | null>(null);
  useEffect(() => { setSource(getShiftSource()); }, []);
  const page = new URL(withShiftSource(cohortPath(cohort), source ?? "parent_share"), "https://passionseed.org");
  page.searchParams.set("utm_medium", "line_share");
  const share = new URL("https://social-plugins.line.me/lineit/share");
  share.searchParams.set("url", page.toString());
  share.searchParams.set("text", `${cohort.name}: ${formatThaiDateRange(cohort.startDate, cohort.endDate)} เวลา ${cohort.sessionTime} น. ออนไลน์ ราคา ${priceLabel(cohort)} สร้างโปรเจกต์จริง พร้อม Pivot Log และพอร์ต TCAS 1 หน้า`);

  return (
    <a href={share.toString()} target="_blank" rel="noopener noreferrer"
      onClick={() => trackMetaCustom("ShiftParentShare", { round: cohort.round })}
      className="inline-flex min-h-12 items-center text-sm font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2">
      ส่งรายละเอียดให้ผู้ปกครองทาง LINE
    </a>
  );
}
