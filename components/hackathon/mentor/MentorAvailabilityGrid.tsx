"use client";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Slot = { day_of_week: number; hour: number };

type Props = {
  slots: Slot[];
  onChange: (slots: Slot[]) => void;
};

function isActive(slots: Slot[], day: number, hour: number): boolean {
  return slots.some((s) => s.day_of_week === day && s.hour === hour);
}

function toggle(slots: Slot[], day: number, hour: number): Slot[] {
  if (isActive(slots, day, hour)) {
    return slots.filter((s) => !(s.day_of_week === day && s.hour === hour));
  }
  return [...slots, { day_of_week: day, hour }];
}

export default function MentorAvailabilityGrid({ slots, onChange }: Props) {
  const setWeekdays9to17 = () => {
    const newSlots: Slot[] = [];
    for (let day = 0; day <= 4; day++) {
      for (let hour = 9; hour <= 17; hour++) {
        newSlots.push({ day_of_week: day, hour });
      }
    }
    onChange(newSlots);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p
          className="text-xs font-[family-name:var(--font-mitr)]"
          style={{ color: "#5a7a94" }}
        >
          Tap slots to toggle availability
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs px-3 py-1 rounded-lg transition-colors font-[family-name:var(--font-mitr)]"
            style={{
              background: "rgba(74,107,130,0.2)",
              color: "#5a7a94",
              border: "1px solid rgba(74,107,130,0.3)",
            }}
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={setWeekdays9to17}
            className="text-xs px-3 py-1 rounded-lg transition-colors font-[family-name:var(--font-mitr)]"
            style={{
              background: "rgba(145,196,227,0.12)",
              color: "#91C4E3",
              border: "1px solid rgba(145,196,227,0.25)",
            }}
          >
            Weekdays 9–17
          </button>
        </div>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: "480px" }}>
        {/* Header row */}
        <div
          className="grid gap-px mb-1"
          style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}
        >
          <div />
          {DAYS.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-[family-name:var(--font-mitr)] pb-1"
              style={{ color: "#5a7a94" }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Hour rows */}
        <div className="space-y-px">
          {Array.from({ length: 24 }, (_, hour) => (
            <div
              key={hour}
              className="grid gap-px"
              style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}
            >
              <div
                className="text-right pr-2 text-[10px] flex items-center justify-end font-[family-name:var(--font-space-mono)]"
                style={{ color: "#3a5a74" }}
              >
                {String(hour).padStart(2, "0")}:00
              </div>
              {DAYS.map((_, day) => {
                const active = isActive(slots, day, hour);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => onChange(toggle(slots, day, hour))}
                    className="h-6 rounded-sm transition-all duration-100"
                    style={{
                      background: active
                        ? "rgba(145,196,227,0.22)"
                        : "rgba(13,18,25,0.8)",
                      border: active
                        ? "1px solid rgba(145,196,227,0.45)"
                        : "1px solid rgba(74,107,130,0.15)",
                      boxShadow: active ? "0 0 8px rgba(145,196,227,0.2)" : "none",
                    }}
                    aria-label={`${DAYS[day]} ${hour}:00 ${active ? "remove" : "add"}`}
                  >
                    {active && (
                      <div
                        className="w-1.5 h-1.5 rounded-full mx-auto"
                        style={{ background: "#91C4E3" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
