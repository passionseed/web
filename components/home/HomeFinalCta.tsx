import { ELEMENTAL, thaiDateShort } from "@/components/hackathon/poster/elemental/facts";
import { RisoHeading, RisoSunrise, paper } from "@/components/shift/ShiftRiso";
import { HOME_HACKATHON, HOME_SHIFT_NEXT } from "@/lib/content/home";
import { leadCta, type HomeLead } from "@/lib/content/home-lead";
import { formatThaiDate, formatThaiDateRange } from "@/lib/content/shift-cohort";
import { MIN_BUILDERS, NEXT_ROUND_NAME } from "@/lib/content/shift-next";
import { LeadButton } from "./LeadButton";

interface FinalCopy {
  eyebrow: string;
  heading: readonly [string, string];
  body: string;
}

/** The last ask, for whatever leads right now. Facts come from their own data. */
function finalCopy(lead: HomeLead): FinalCopy {
  switch (lead.kind) {
    case "shift": {
      const c = lead.cohort;
      return {
        eyebrow: `${c.name} · ${formatThaiDateRange(c.startDate, c.endDate)}`,
        heading: ["มีไอเดียดิบอยู่ในหัว?", "7 วันนี้ทำให้มันเป็นของจริง"],
        body: `รับ ${c.seats} คน สมัคร 2 นาที โอนผ่านพร้อมเพย์แล้วส่งสลิปทาง LINE ปิดรับสมัคร ${formatThaiDate(c.applyDeadline)}`,
      };
    }
    case "hackathon":
      return {
        eyebrow: `${ELEMENTAL.edition} Hackathon · ${thaiDateShort()}`,
        heading: [HOME_HACKATHON.finalHeading[0], HOME_HACKATHON.finalHeading[1]],
        body: `${ELEMENTAL.gradesTh} ทั่วประเทศ มากับเพื่อน ฿${ELEMENTAL.groupPriceBaht} ต่อคน สมัครคนเดียว ฿${ELEMENTAL.priceBaht} ปิดรับสมัคร ${formatThaiDate(ELEMENTAL.registrationClosesOn)}`,
      };
    case "shift-next":
      return {
        eyebrow: NEXT_ROUND_NAME,
        heading: [HOME_SHIFT_NEXT.finalHeading[0], HOME_SHIFT_NEXT.finalHeading[1]],
        body: `${HOME_SHIFT_NEXT.status} ${HOME_SHIFT_NEXT.free}แล้ว${HOME_SHIFT_NEXT.howItOpens.replace("{min}", String(MIN_BUILDERS))}`,
      };
  }
}

export function HomeFinalCta({ lead, src = "home" }: { lead: HomeLead; src?: string }) {
  const copy = finalCopy(lead);
  return (
    <section className="relative overflow-hidden pb-64 pt-20 text-center sm:pb-72 sm:pt-28">
      <RisoSunrise />
      <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
        <RisoHeading eyebrow={copy.eyebrow} align="center">
          {copy.heading[0]}
          <br />
          {copy.heading[1]}
        </RisoHeading>
        <p className="mx-auto mt-6 max-w-xl" style={{ color: paper("b3") }}>
          {copy.body}
        </p>
        <div className="mt-10">
          <LeadButton cta={leadCta(lead, src)} location={`${src}_final_cta`} />
        </div>
      </div>
    </section>
  );
}
