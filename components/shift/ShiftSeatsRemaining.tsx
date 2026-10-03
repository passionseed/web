"use client";

import { useEffect, useState } from "react";

export function ShiftSeatsRemaining({ round, capacity }: { round: number; capacity: number }) {
  const [availability, setAvailability] = useState<{ remaining: number; open: boolean } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch(`/api/shift/seats?round=${round}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Unavailable");
        const data = await response.json();
        if (!controller.signal.aborted) setAvailability(data);
      } catch {
        if (!controller.signal.aborted) setAvailability(null);
      }
    }
    void refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [round]);

  return (
    <p className="text-sm font-semibold" role="status">
      {availability === null
        ? `รับ ${capacity} คน · ยืนยันที่นั่งเมื่อชำระเงินแล้ว`
        : !availability.open ? "ปิดรับสมัครแล้ว"
        : availability.remaining === 0 ? "ที่นั่งเต็มแล้ว"
        : `เหลือ ${availability.remaining} จาก ${capacity} ที่นั่ง`}
    </p>
  );
}
