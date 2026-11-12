import Link from "next/link";

import type { ShiftCohort } from "@/lib/content/shift-cohort";
import { cohortDays, parseSessionTime, type VoiceWindowMode } from "@/lib/shift/voiceWindow";
import { cn } from "@/lib/utils";

export interface VoiceSelection {
  cohort: ShiftCohort;
  day: string;
  mode: VoiceWindowMode;
}

export function voiceHref({ cohort, day, mode }: VoiceSelection): string {
  const params = new URLSearchParams({ round: String(cohort.round), day, window: mode });
  return `/admin/shift/voice?${params}`;
}

function dayLabel(iso: string, index: number): string {
  const date = new Date(`${iso}T12:00:00+07:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
  });
  return `Day ${index + 1} · ${date}`;
}

const CHIP =
  "inline-flex min-h-11 items-center rounded-md border px-3 text-sm transition-colors";
const CHIP_ON = "border-primary bg-primary/10 font-medium text-foreground";
const CHIP_OFF = "text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted";

function Chips({
  label,
  items,
}: {
  label: string;
  items: { href: string; text: string; active: boolean }[];
}) {
  return (
    <nav className="flex flex-wrap gap-1.5" aria-label={label}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(CHIP, item.active ? CHIP_ON : CHIP_OFF)}
        >
          {item.text}
        </Link>
      ))}
    </nav>
  );
}

/** Round, day and window pickers. Plain links: the page is a server component. */
export function ShiftVoiceFilters({
  cohorts,
  selected,
}: {
  cohorts: ShiftCohort[];
  selected: VoiceSelection;
}) {
  const { start, end } = parseSessionTime(selected.cohort.sessionTime);
  const modes: { mode: VoiceWindowMode; text: string }[] = [
    { mode: "session", text: `Session ${start}–${end}` },
    { mode: "day", text: "Whole day" },
    { mode: "round", text: "Whole round" },
  ];

  return (
    <div className="space-y-2">
      {cohorts.length > 1 && (
        <Chips
          label="Round"
          items={cohorts.map((cohort) => ({
            href: voiceHref({ cohort, day: cohortDays(cohort)[0], mode: selected.mode }),
            text: cohort.name,
            active: cohort.round === selected.cohort.round,
          }))}
        />
      )}
      <Chips
        label="Window"
        items={modes.map(({ mode, text }) => ({
          href: voiceHref({ ...selected, mode }),
          text,
          active: mode === selected.mode,
        }))}
      />
      {selected.mode !== "round" && (
        <Chips
          label="Day"
          items={cohortDays(selected.cohort).map((day, index) => ({
            href: voiceHref({ ...selected, day }),
            text: dayLabel(day, index),
            active: day === selected.day,
          }))}
        />
      )}
    </div>
  );
}
