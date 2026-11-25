import type { ReactNode } from "react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL, prizeTotal } from "@/components/hackathon/poster/elemental/facts";

import { PixelArrow, PixelIcon, type IconName } from "../sponsor/DeckArt";
import { PrintButton } from "../sponsor/PrintButton";
import { Body, DARK, H2, LINE_DARK, LINE_LIGHT, PRINT_CSS, Row, Section, SKY, Stat, Tag, trirong } from "../sponsor/SponsorDeck";

/**
 * Elemental Hackathon × CSII: the co-host proposal for CSII (Chulalongkorn
 * School of Integrated Innovation), as a deck in the sponsor deck's look. One
 * scrollable page that also prints as an A4 landscape PDF, one section per page.
 * In English: the CSII contact reads English (Big, 2026-11-22).
 *
 * Source: passionseed/company-brain on main, hackathon-csii-proposal.md,
 * content confirmed by Big on 2026-11-22, and the decisions behind it in
 * decisions/log.md (PassionSeed pays CSII's extra staff charge for opening
 * BAScii on 5–7 December and provides the food; M.4 to M.6; onsite and online).
 * PassionSeed's past work: the same sources as the sponsor deck. Where the
 * proposal says "to agree with CSII", so does this deck: nothing is filled in
 * that nobody has told us.
 */

const CREAM_SOFT = EL.creamSoft;
const TINT = "rgba(243,239,230,0.07)";

/** The full text of the proposal, on the company brain. */
const BRAIN_URL = "https://brain.passionseed.org/hackathon-csii-proposal?read";

/** Each element is a kind of harm (sponsor deck, translated). */
const ELEMENTS: { key: "water" | "earth" | "air" | "fire" | "aether"; name: string; kind: string }[] = [
  { key: "earth", name: "Earth", kind: "Waste, soil and toxins" },
  { key: "water", name: "Water", kind: "Harm to rivers and the water people drink" },
  { key: "air", name: "Air", kind: "Dust, smoke and the air we breathe" },
  { key: "fire", name: "Fire", kind: "Fire hazards and heat" },
  { key: "aether", name: "The unseen", kind: "Harm from AI, social media and tech" },
];

const WHY: [IconName, string, string][] = [
  ["person", "Future applicants, on campus", "Upper secondary students who like building things, many deciding what to study next. BAScii is where the work happens for three days, not an ad."],
  ["magnifier", "The same way of working", "Teams interview real people, build, test with them and pitch. They're judged on evidence from real people: the human-centred innovation CSII teaches."],
  ["board", "Real experience for CSII students", "Mentoring and judging lets BAScii students coach younger teams on what they practise in class."],
  ["check", "No clash with teaching", "5–7 December is a long weekend with no classes. The hackathon fills rooms that would sit empty."],
  ["rocket", "A partnership, not a one-off", "The best projects continue in Request for Winners, so CSII stays with the strongest students for another month."],
  ["sprout", "Little load, little risk", "PassionSeed covers the staff charge and the food, and runs sign-ups, workshops, judging and prizes. If the room doesn't work out, the event still runs online."],
];

/** Prizes (Big, 2026-11-22, in the proposal). Cash and Claude credit, in baht. */
const PRIZES: [string, number, number][] = [
  ["1st", 7000, 4000],
  ["2nd", 3000, 3000],
  ["3rd", 0, 3000],
];
const PRIZE_TOP = Math.max(...PRIZES.map(([, c, k]) => c + k));
const baht = (n: number) => `฿${n.toLocaleString("en-US")}`;

type Slot = "open" | "workshop" | "deadline";
const SLOT_COLOR: Record<Slot, string> = { open: EL.aetherGrey, workshop: EL.toxicCyan, deadline: EL.flame };
const DAYS: { day: string; onsite: boolean; events: [string, string, Slot][] }[] = [
  { day: "Fri 4 Dec", onsite: false, events: [["19:00", "Opening and orientation (onsite or online, to agree with CSII)", "open"]] },
  {
    day: "Sat 5 Dec",
    onsite: true,
    events: [
      ["10:00–11:00", "Workshop: interviewing and finding target customers", "workshop"],
      ["19:00–20:00", "Workshop: building the product", "workshop"],
    ],
  },
  { day: "Sun 6 Dec", onsite: true, events: [["19:00–20:00", "Workshop: pitching", "workshop"]] },
  { day: "Mon 7 Dec", onsite: true, events: [["23:00", "Every team hands in its video", "deadline"]] },
];

/** Who does what: [task, PassionSeed, CSII]. true = a tick, a string = a note. */
const ROLES: [string, boolean | string, boolean | string][] = [
  ["Sign-ups, fees and parents' consent", true, false],
  ["Workshops, self-study resources and the Discord server", true, false],
  ["Judging, prizes and certificates", true, "Mentors or judges, if CSII wants"],
  ["Room and building access, 5–7 December", false, true],
  ["Projector, microphones and guest Wi-Fi", false, true],
  ["Extra staff charge for the holiday weekend", "Pays it, at CSII's rate", "Staff on duty"],
  ["Staff on site, looking after participants", true, false],
  ["Promotion", true, "Shares with high schools, its students and channels"],
  ["The BAScii interest box at sign-up, with consent", true, "Receives the list"],
  ["Food", true, false],
  ["Setting up and cleaning up; safety and insurance", "To agree together", "To agree together"],
];

const ASKS: [string, string][] = [
  ["Venue", "Space at BAScii for 5–7 December. If three days is too much, we come onsite for fewer days and run the rest online."],
  ["Help with the staff charge", "Can the event be booked as a CSII student activity, run with BAScii students, so the charge is waived or lower?"],
  ["Promotion to high schools", "Share the hackathon with the schools CSII admissions works with, and with CSII's students and channels."],
  ["The Chula name", "Permission to say the hackathon is held at Chulalongkorn University. A university campus helps parents say yes."],
  ["A CSII judge", "Judging is on the videos after the event, so it can be done online in the week after the holidays."],
  ["Mentors", "BAScii students who coach teams, onsite or on Discord. How many, and which days, is up to CSII."],
  ["Equipment and Wi-Fi", "A projector, microphones, and guest Wi-Fi for participants without Chula accounts."],
  ["Request for Winners", "Demo day at BAScii, and CSII mentors for the teams."],
];

const GETS: [string, string][] = [
  ["Co-host credit", "“Co-hosted with CSII” and the CSII logo on passionseed.org/hackathon and every event post, from the day CSII agrees."],
  ["Logo at the event", "On the backdrop, the event slides and participants' certificates, with thanks at the opening."],
  ["A slot to introduce BAScii", "A few minutes at the opening, live onsite and streamed to the online teams."],
  ["A BAScii session", "Run by BAScii students or a lecturer, live or recorded before the holidays."],
  ["A CSII award", "A special prize chosen by the CSII judge. CSII decides what it is."],
  ["Students interested in BAScii", "An opt-in box at sign-up, with a parent's consent for under-20s. The list goes only to CSII."],
  ["Photos and short clips", "To post, only of participants who agreed to it."],
  ["Request for Winners partner", "Named on the program page and at demo day."],
  ["Certificates", "For CSII mentors and judges."],
  ["A report", "Sign-ups, teams, projects, onsite turnout and post reach. Totals only, no personal data."],
];

/** PassionSeed's work so far: the sponsor deck's list, in English. */
const HISTORY: [string, string, string, string | null, boolean][] = [
  ["2025", "TechSeed camps", "4 project camps (TechSeed #2–#5)", null, false],
  ["Sep 2025", "COE PSU Open House", "With Prince of Songkla University, an online workshop for 300", "/hackathon/elemental/sponsor/past-coe-psu.webp", false],
  ["2025", "BizSeed", "With CSII", "/hackathon/elemental/sponsor/past-bizseed.webp", true],
  ["Feb–Jun 2026", "The Next Decade, 1st edition", "A health hackathon with 872 sign-ups", "/hackathon/elemental/sponsor/past-next-decade.webp", false],
  ["Sep 2026", "SHIFT camp", "7 days building projects real people use", "/hackathon/elemental/sponsor/past-shift.webp", false],
  ["Dec 2026", "Elemental Hackathon", "The Next Decade, 2nd edition", "/hackathon/poster/elemental/sheets/elemental-key.webp", false],
];

/** A small label, like [THE ASK]. */
function Kicker({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p className="m-0 text-[13px]" style={{ fontFamily: EL_FONT.mono, color: light ? EL.inkSoft : CREAM_SOFT, letterSpacing: "0.08em" }}>
      {children}
    </p>
  );
}

function Mark({ value, light }: { value: boolean | string; light: boolean }) {
  if (value === true) return <PixelIcon name="check" color={light ? EL.ink : EL.toxicGreen} size={22} />;
  if (!value) return <span className="sr-only">No</span>;
  return (
    <span className="text-[14px] leading-[1.4]" style={{ color: light ? EL.inkSoft : CREAM_SOFT }}>
      {value}
    </span>
  );
}

export function CsiiDeck() {
  return (
    <main className={`${trirong.variable} elemental-deck`}>
      <style>{PRINT_CSS}</style>

      {/* Cover */}
      <section id="cover" className="deck-page deck-cover grid min-h-[100svh] grid-cols-1 lg:grid-cols-[1.05fr_1fr]" style={{ backgroundColor: SKY, color: EL.ink }}>
        <div className="flex flex-col justify-between gap-10 px-4 py-10 sm:px-12 sm:py-12 lg:px-16">
          <div>
            <div className="flex flex-wrap items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hackathon/HackLogo.png" alt={ELEMENTAL.series} width={110} height={44} style={{ filter: "brightness(0)", opacity: 0.85 }} />
              <span style={{ fontFamily: EL_FONT.mono, fontSize: 18, color: EL.inkSoft }}>×</span>
              <span className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/passion-seed-logo.png" alt="" width={40} height={40} />
                <span style={{ fontFamily: EL_FONT.display, fontSize: 24 }}>PassionSeed</span>
              </span>
              <span style={{ fontFamily: EL_FONT.mono, fontSize: 18, color: EL.inkSoft }}>×</span>
              <span style={{ fontFamily: EL_FONT.display, fontSize: 24 }}>CSII</span>
            </div>
            <p className="m-0 mt-8 text-[15px] sm:text-[17px]" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft, letterSpacing: "0.08em" }}>
              [CO-HOST PROPOSAL]
            </p>
            <h1 className="m-0 mt-2" style={{ fontFamily: EL_FONT.display, lineHeight: 1.02, letterSpacing: "-0.01em" }}>
              <span className="block text-[60px] sm:text-[104px]" style={{ fontWeight: 200 }}>
                {ELEMENTAL.edition}
              </span>
              <span className="block text-[60px] italic sm:text-[104px]" style={{ fontWeight: 300 }}>
                Hackathon
              </span>
            </h1>
            <p className="m-0 mt-3 max-w-[560px] text-[22px] leading-[1.4] sm:text-[28px]" style={{ fontFamily: EL_FONT.display, fontWeight: 300 }}>
              An invitation to CSII to co-host, at BAScii, and to partner on what comes after.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-5 border-t pt-5 sm:grid-cols-4" style={{ borderColor: "rgba(29,33,31,0.3)", fontFamily: EL_FONT.display }}>
            {(
              [
                ["When", "5–7 Dec 2026", "Long weekend"],
                ["Where", "BAScii", "+ online on Discord"],
                ["Who", `350+ students`, "M.4 to M.6"],
                ["Cost to CSII", "฿0", "We pay staff and food"],
              ] as const
            ).map(([label, big, small]) => (
              <div key={label}>
                <div className="text-[15px]" style={{ color: EL.inkSoft }}>
                  {label}
                </div>
                <div className="text-[24px] font-light sm:text-[28px]">{big}</div>
                <div className="text-[15px]" style={{ color: EL.inkSoft }}>
                  {small}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative min-h-[55svh] overflow-hidden lg:min-h-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hackathon/elemental/sponsor/cover.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-[70%_68%]" />
        </div>
      </section>

      {/* 01 At a glance */}
      <Section id="glance" tone="paper">
        <Tag n="01 AT A GLANCE" light />
        <H2>A room, a name, a few mentors. Nothing to pay.</H2>
        <div className="mt-10 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-[1fr_auto_0.8fr_auto_1fr]" style={{ fontFamily: EL_FONT.display }}>
          <div className="border-t-2 pt-4" style={{ borderColor: EL.ink }}>
            <Kicker light>WE ASK CSII FOR</Kicker>
            <ul className="m-0 mt-3 list-none space-y-2 p-0 text-[18px] font-light leading-[1.5]">
              <li>A room at BAScii, 5–7 December</li>
              <li>Promotion to high schools and CSII students</li>
              <li>Use of the Chula name</li>
              <li>Mentors or judges, online if easier</li>
            </ul>
          </div>
          <div className="hidden items-center lg:flex">
            <PixelArrow color={EL.inkSoft} />
          </div>
          <div className="flex flex-col justify-center rounded-[3px] p-6 text-center" style={{ background: DARK, color: EL.cream }}>
            <Kicker>COST TO CSII</Kicker>
            <div className="mt-2 text-[72px] leading-none sm:text-[96px]" style={{ fontWeight: 200 }}>
              ฿0
            </div>
            <p className="m-0 mt-3 text-[15px] leading-[1.55]" style={{ color: CREAM_SOFT }}>
              PassionSeed pays the extra staff charge for opening over the holiday, and provides the food.
            </p>
          </div>
          <div className="hidden items-center lg:flex">
            <PixelArrow color={EL.inkSoft} />
          </div>
          <div className="border-t-2 pt-4" style={{ borderColor: EL.flame }}>
            <Kicker light>CSII GETS</Kicker>
            <ul className="m-0 mt-3 list-none space-y-2 p-0 text-[18px] font-light leading-[1.5]">
              <li>Co-host credit, on everything</li>
              <li>Three days with students choosing what to study</li>
              <li>An opt-in list of those interested in BAScii</li>
              <li>A partnership into Request for Winners, and a report</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* 02 Why CSII */}
      <Section id="why">
        <Tag n="02 WHY CSII" />
        <H2>Why this fits CSII</H2>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" style={{ fontFamily: EL_FONT.display }}>
          {WHY.map(([icon, title, text]) => (
            <div key={title} className="rounded-[3px] p-5" style={{ background: TINT }}>
              <PixelIcon name={icon} color={EL.toxicCyan} size={34} />
              <h3 className="m-0 mt-4 text-[20px] leading-[1.35]" style={{ fontWeight: 400 }}>
                {title}
              </h3>
              <p className="m-0 mt-2 text-[15px] leading-[1.65]" style={{ fontWeight: 300, color: CREAM_SOFT }}>
                {text}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* 03 The challenge */}
      <Section id="tracks" tone="paper">
        <Tag n="03 THE CHALLENGE" light />
        <H2>Real environmental problems, five elements</H2>
        <Body light>
          Teams take on businesses that neglect or harm the environment, and build something that helps a real person, tested with real people. The event names no company or case: participants solve
          problems, they don&apos;t blame anyone. Beginners welcome: four topics are taught live.
        </Body>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {ELEMENTS.map(({ key, name, kind }) => (
            <div key={key}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/hackathon/elemental/sponsor/el-${key}.webp`} alt="" className="aspect-square w-full object-cover" style={{ imageRendering: "pixelated" }} />
              <p className="m-0 mt-3 text-[22px]" style={{ fontFamily: EL_FONT.display, fontWeight: 400 }}>
                {name}
              </p>
              <p className="m-0 mt-1 text-[15px] leading-[1.45]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: EL.inkSoft }}>
                {kind}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* 04 Scale and outcome */}
      <Section id="scale">
        <Tag n="04 SCALE" />
        <H2>Expected outcome</H2>
        <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            <Stat big="350+" label="participants (target)" />
            <Stat big="872" label="signed up for the 1st edition of The Next Decade (2026)" />
            <Stat big={`${ELEMENTAL.teamMin}–${ELEMENTAL.teamMax}`} label="people per team, M.4 to M.6, from across Thailand" />
            <Stat big={baht(ELEMENTAL.prizeTotalBaht)} label="in prizes, cash and Claude credit" />
          </div>
          <div style={{ fontFamily: EL_FONT.display }}>
            <Kicker>PRIZES</Kicker>
            <div className="mt-4 space-y-4">
              {PRIZES.map(([place, cash, credit]) => (
                <div key={place} className="grid grid-cols-[48px_1fr_90px] items-center gap-3">
                  <span className="text-[20px]" style={{ fontWeight: 400 }}>
                    {place}
                  </span>
                  <div className="flex h-9 overflow-hidden rounded-[2px]" style={{ background: TINT }}>
                    {cash > 0 ? <div style={{ width: `${(cash / PRIZE_TOP) * 100}%`, background: EL.flame }} title={`Cash ${baht(cash)}`} /> : null}
                    <div style={{ width: `${(credit / PRIZE_TOP) * 100}%`, background: EL.toxicCyan }} title={`Claude credit ${baht(credit)}`} />
                  </div>
                  <span className="text-right text-[18px] font-light">{baht(cash + credit)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-5 text-[14px]" style={{ color: CREAM_SOFT }}>
              <span className="flex items-center gap-2">
                <span className="block h-3 w-3" style={{ background: EL.flame }} />
                Cash
              </span>
              <span className="flex items-center gap-2">
                <span className="block h-3 w-3" style={{ background: EL.toxicCyan }} />
                Claude credit
              </span>
              <span>Total {prizeTotal()} baht</span>
            </div>
            <p className="m-0 mt-8 text-[16px] leading-[1.65]" style={{ fontWeight: 300, color: CREAM_SOFT }}>
              Every team hands in a video by Monday 7 December, 23:00, judged on four things: does it work, evidence from real people, understanding of the problem, and the pitch.
            </p>
          </div>
        </div>
      </Section>

      {/* 05 Program */}
      <Section id="program" tone="paper">
        <Tag n="05 PROGRAM" light />
        <H2>Three days at BAScii, and online at the same time</H2>
        <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-4" style={{ fontFamily: EL_FONT.display }}>
          {DAYS.map(({ day, events }) => (
            <div key={day} className="flex flex-col gap-2 border-t-2 pt-3" style={{ borderColor: EL.ink }}>
              <p className="m-0 text-[18px]" style={{ fontWeight: 400 }}>
                {day}
              </p>
              {events.map(([time, what, kind]) => (
                <div key={what} className="rounded-[3px] p-3" style={{ background: "rgba(29,33,31,0.06)", borderLeft: `4px solid ${SLOT_COLOR[kind]}` }}>
                  <p className="m-0 text-[14px]" style={{ color: EL.inkSoft }}>
                    {time}
                  </p>
                  <p className="m-0 mt-1 text-[15px] leading-[1.5]" style={{ fontWeight: 300 }}>
                    {what}
                  </p>
                </div>
              ))}
            </div>
          ))}
          <div className="flex items-center gap-3 rounded-[3px] px-4 py-3 md:col-span-3 md:col-start-2" style={{ background: DARK, color: EL.cream }}>
            <PixelIcon name="person" color={EL.flame} size={22} />
            <span className="text-[15px]" style={{ fontWeight: 300 }}>
              Onsite at BAScii, Sat to Mon. Online teams on Discord throughout. Room, hours and capacity to agree with CSII.
            </span>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-5 text-[14px]" style={{ fontFamily: EL_FONT.display, color: EL.inkSoft }}>
          {(
            [
              ["workshop", "Live workshop"],
              ["deadline", "Hand-in"],
              ["open", "Opening"],
            ] as const
          ).map(([k, label]) => (
            <span key={k} className="flex items-center gap-2">
              <span className="block h-3 w-3" style={{ background: SLOT_COLOR[k] }} />
              {label}
            </span>
          ))}
          <span>Sign-up closes Thu 3 Dec · Request for Winners opens Fri 11 Dec</span>
        </div>
      </Section>

      {/* 06 Who does what */}
      <Section id="roles">
        <Tag n="06 WHO DOES WHAT" />
        <H2>PassionSeed runs the event. CSII opens the door.</H2>
        <div className="relative mt-6 overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left" style={{ fontFamily: EL_FONT.display }}>
            <thead>
              <tr>
                <th className="py-3 pr-4 text-[15px] font-normal" style={{ color: CREAM_SOFT }} />
                {(
                  [
                    ["PassionSeed", EL.flame],
                    ["CSII", EL.toxicCyan],
                  ] as const
                ).map(([who, color]) => (
                  <th key={who} className="w-[190px] px-3 py-3 text-center text-[20px] font-light sm:w-[230px]" style={{ borderTop: `6px solid ${color}`, background: TINT }}>
                    {who}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLES.map(([task, ps, csii]) => (
                <tr key={task} style={{ borderTop: `1px solid ${LINE_DARK}` }}>
                  <td className="py-2 pr-4 text-[16px] leading-[1.45]" style={{ fontWeight: 300 }}>
                    {task}
                  </td>
                  {[ps, csii].map((v, k) => (
                    <td key={k} className="px-3 py-2 text-center" style={{ background: TINT }}>
                      <span className="inline-flex justify-center align-middle">
                        <Mark value={v} light={false} />
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* 07 Request for Winners */}
      <Section id="rfw" tone="paper">
        <Tag n="07 BEYOND THE HACKATHON" light />
        <H2>Request for Winners: from contest project to real business</H2>
        <div className="mt-10 grid grid-cols-1 items-stretch gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]" style={{ fontFamily: EL_FONT.display }}>
          {(
            [
              ["5–7 Dec", "The hackathon", "350+ students build and test with real people", EL.aetherGrey],
              ["Fri 11 Dec", "Request for Winners opens", "The best teams, plus students who have won other contests", EL.toxicCyan],
              ["4 weeks", "Build a real business", "On the PassionSeed whiteboard, with weekly check-ins, partly funded by sponsors", EL.toxicGreen],
              ["Demo day", "At BAScii", "On a working day that suits CSII, so lecturers and students can attend", EL.flame],
            ] as const
          ).flatMap(([when, title, text, color], i) => [
            i > 0 ? (
              <div key={`a${i}`} className="hidden items-center md:flex">
                <PixelArrow color={EL.inkSoft} />
              </div>
            ) : null,
            <div key={title} className="rounded-[3px] border-t-[6px] p-4" style={{ borderColor: color, background: "rgba(29,33,31,0.05)" }}>
              <p className="m-0 text-[14px]" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
                {when}
              </p>
              <h3 className="m-0 mt-2 text-[20px] leading-[1.3]" style={{ fontWeight: 400 }}>
                {title}
              </h3>
              <p className="m-0 mt-2 text-[15px] leading-[1.55]" style={{ fontWeight: 300, color: EL.inkSoft }}>
                {text}
              </p>
            </div>,
          ])}
        </div>
        <div className="mt-8 border-b" style={{ borderColor: LINE_LIGHT }}>
          <Row light label="CSII as partner">
            Named on the program page and at demo day.
          </Row>
          <Row light label="Mentors">
            CSII lecturers or BAScii students coach a team, online, at times that suit them.
          </Row>
          <Row light label="What CSII gets">
            An early look at strong high school builders from across Thailand, a month after they first met BAScii, and a demo day of their projects on its own campus.
          </Row>
        </div>
      </Section>

      {/* 08 What we ask */}
      <Section id="asks">
        <Tag n="08 THE ASK" />
        <H2>What we ask of CSII</H2>
        <p className="m-0 mt-3 max-w-[900px] text-[16px] leading-[1.65]" style={{ fontFamily: EL_FONT.display, fontWeight: 300, color: CREAM_SOFT }}>
          5–7 December is a holiday weekend, so nothing here needs CSII lecturers on campus on those days.
        </p>
        <ol className="m-0 mt-6 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4" style={{ fontFamily: EL_FONT.display }}>
          {ASKS.map(([title, text], i) => (
            <li key={title} className="rounded-[3px] p-4" style={{ background: TINT }}>
              <span className="text-[30px] leading-none" style={{ fontWeight: 200, color: EL.flame }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="m-0 mt-3 text-[18px] leading-[1.35]" style={{ fontWeight: 400 }}>
                {title}
              </h3>
              <p className="m-0 mt-2 text-[14px] leading-[1.6]" style={{ fontWeight: 300, color: CREAM_SOFT }}>
                {text}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 09 What CSII gets */}
      <Section id="gets" tone="paper">
        <Tag n="09 WHAT CSII GETS" light />
        <H2>What CSII gets as co-host</H2>
        <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-1 border-b sm:grid-cols-2" style={{ borderColor: LINE_LIGHT, fontFamily: EL_FONT.display }}>
          {GETS.map(([title, text]) => (
            <div key={title} className="flex gap-4 border-t py-3" style={{ borderColor: LINE_LIGHT }}>
              <span className="pt-1">
                <PixelIcon name="check" color={EL.flame} size={20} />
              </span>
              <div>
                <p className="m-0 text-[17px]" style={{ fontWeight: 400 }}>
                  {title}
                </p>
                <p className="m-0 mt-1 text-[15px] leading-[1.55]" style={{ fontWeight: 300, color: EL.inkSoft }}>
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 10 About PassionSeed */}
      <Section id="about">
        <Tag n="10 ABOUT US" />
        <H2>PassionSeed, and our work with CSII</H2>
        <Body>
          PassionSeed runs short programs where high school students build real projects and put them in front of real people. We&apos;ve worked with CSII before, on BizSeed.
        </Body>
        <ol className="relative m-0 mt-8 grid list-none grid-cols-2 gap-x-4 gap-y-6 p-0 md:grid-cols-6" style={{ fontFamily: EL_FONT.display }}>
          {HISTORY.map(([when, what, detail, img, csii]) => (
            <li key={what} className="relative">
              <div className="deck-history-pic mb-3 aspect-[4/5] w-full max-w-[96px] lg:max-w-[112px]">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={what} className="h-full w-full rounded-[3px] object-contain object-left-bottom" />
                ) : null}
              </div>
              <span className="relative block h-3 w-3" style={{ background: csii ? EL.flame : EL.cream }} />
              <p className="m-0 mt-3 text-[13px]" style={{ color: CREAM_SOFT }}>
                {when}
              </p>
              <p className="m-0 mt-1 text-[17px] leading-[1.35]" style={{ fontWeight: 400, color: csii ? EL.flame : undefined }}>
                {what}
              </p>
              <p className="m-0 mt-1 text-[14px] leading-[1.5]" style={{ fontWeight: 300, color: CREAM_SOFT }}>
                {detail}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 11 Next steps */}
      <Section id="next" tone="paper">
        <Tag n="11 NEXT STEPS" light />
        <H2>Next steps</H2>
        <ol className="m-0 mt-8 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-4" style={{ fontFamily: EL_FONT.display }}>
          {[
            "CSII says yes or no, and which room, as soon as it can.",
            "We walk through the room together on a day that suits CSII.",
            "PassionSeed updates the website and sign-up page to show BAScii as the venue and CSII as co-host.",
            "After the event, PassionSeed sends the report.",
          ].map((step, i) => (
            <li key={step} className="border-t-2 pt-3" style={{ borderColor: i === 0 ? EL.flame : EL.ink }}>
              <span className="text-[30px] leading-none" style={{ fontWeight: 200 }}>
                {i + 1}
              </span>
              <p className="m-0 mt-2 text-[16px] leading-[1.55]" style={{ fontWeight: 300 }}>
                {step}
              </p>
            </li>
          ))}
        </ol>
        <p className="m-0 mt-6 text-[15px]" style={{ fontFamily: EL_FONT.display, color: EL.inkSoft }}>
          If the room doesn&apos;t work out, the hackathon runs online only, as it does today.
        </p>
        <div className="mt-8 border-b" style={{ borderColor: LINE_LIGHT }}>
          <Row light label="Contact">
            Big, PassionSeed
          </Row>
          <Row light label="Full proposal">
            <a href={BRAIN_URL} className="underline underline-offset-4">
              brain.passionseed.org/hackathon-csii-proposal
            </a>
          </Row>
        </div>
        <div className="deck-no-print mt-10">
          <PrintButton light label="[DOWNLOAD PDF]" />
        </div>
      </Section>
    </main>
  );
}
