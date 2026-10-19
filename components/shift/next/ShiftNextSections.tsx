import type { ReactNode } from "react";
import {
  ArrowUpRight,
  BarChart3,
  FileText,
  Hammer,
  MessagesSquare,
  Quote,
  Scissors,
  Send,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { COSMOS } from "@/components/shift/next/cosmos";
import { ShiftNextForm } from "@/components/shift/next/ShiftNextForm";
import {
  CertVsPrototype,
  QuorumMeter,
} from "@/components/shift/next/ShiftNextVisuals";
import styles from "@/components/shift/next/shiftNext.module.css";
import { NOTES } from "@/lib/content/pathlab-page";
import { SHIFT_COHORT, SHIFT_COHORTS } from "@/lib/content/shift-cohort";
import {
  HOW_IT_WORKS,
  MIN_BUILDERS,
  NEXT_FAQS,
  NEXT_ROUND_NAME,
  NOT_FOR_YOU,
  WE_GIVE,
  WHY_ROWS,
  YOU_BRING,
  YOU_GET,
  type DealColumn,
} from "@/lib/content/shift-next";
import { SHIFT_VOICES } from "@/lib/content/shift-voices";

/**
 * The /shift/next sections, in the order a visitor's doubts arrive:
 * why bother, is it real, what do I get, what does it cost me, how to join.
 */

/** One icon per day of SHIFT_COHORT.schedule, in order. */
const DAY_ICONS: LucideIcon[] = [
  Scissors,
  MessagesSquare,
  Hammer,
  Send,
  Wrench,
  BarChart3,
  FileText,
];
const OUTCOME_INKS = [
  COSMOS.aurora,
  COSMOS.nebula,
  COSMOS.sol,
  COSMOS.aurora,
  COSMOS.star,
];

/** Projects past rounds actually shipped, newest round first. */
const PROOF = SHIFT_COHORTS.flatMap((cohort) =>
  (cohort.showcase ?? [])
    .filter((p) => p.featured)
    .map((p) => ({ ...p, round: cohort.name }))
).slice(0, 3);

const VOICES = [SHIFT_VOICES.kkGrandpa, SHIFT_VOICES.potterIntrovert];

/** Chapter label: an index in aurora, then the name. */
function Eyebrow({ index, children }: { index: number; children: ReactNode }) {
  return (
    <p className={styles.eyebrow}>
      <span className={styles.eyebrowIndex}>
        {String(index).padStart(2, "0")}
      </span>
      {children}
    </p>
  );
}

/** Data attributes that make an element a lit, revealing glass pane. */
const GLASS = { "data-glass": true, "data-shift-reveal": true } as const;

function Note({ children }: { children: string }) {
  return (
    <p className={styles.note}>
      <span className="pathlab-note">{children}</span>
    </p>
  );
}

function SectionHead({
  index,
  eyebrow,
  id,
  title,
  lede,
}: {
  index: number;
  eyebrow: string;
  id: string;
  title: ReactNode;
  lede?: string;
}) {
  return (
    <div data-shift-reveal>
      <Eyebrow index={index}>{eyebrow}</Eyebrow>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
      {lede && <p className={styles.sectionLede}>{lede}</p>}
    </div>
  );
}

function Section({
  id,
  labelledBy,
  className,
  children,
}: {
  id?: string;
  labelledBy: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`${styles.container} ${styles.section} ${className ?? ""}`}
      aria-labelledby={labelledBy}
    >
      {children}
    </section>
  );
}

export function WhySection() {
  return (
    <Section id="why" labelledBy="why-title">
      <SectionHead
        index={1}
        eyebrow="Why SHIFT"
        id="why-title"
        title={
          <>
            ใบเซอร์บอกว่าคุณไปอยู่ตรงนั้น
            <br />
            ไม่ได้บอกว่าคุณทำอะไรเป็น
          </>
        }
        lede="คนที่สมัครคณะเดียวกับคุณก็มีใบเซอร์ค่ายแบบเดียวกัน สิ่งที่ลอกกันไม่ได้คือของที่คุณเลือกโจทย์เอง สร้างเอง แล้วเอาไปให้คนจริงลอง SHIFT มีไว้ให้คุณได้ทำแบบนั้นจบ 1 รอบ ใน 7 เย็น"
      />
      <div className={styles.whyGrid}>
        <CertVsPrototype />
        <div className={`${styles.glass} ${styles.compare}`} {...GLASS}>
          <div className={styles.compareHead} aria-hidden="true">
            <span />
            <span>ค่ายนั่งฟัง</span>
            <span>SHIFT</span>
          </div>
          <dl>
            {WHY_ROWS.map((row) => (
              <div key={row.label} className={styles.compareRow}>
                <dt>
                  <row.icon className={styles.compareIcon} aria-hidden="true" />
                  {row.label}
                </dt>
                <dd className={styles.compareCamp}>
                  <span className="sr-only">ค่ายนั่งฟัง: </span>
                  {row.camp}
                </dd>
                <dd className={styles.compareShift}>
                  <span className="sr-only">SHIFT: </span>
                  {row.shift}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <Note>{NOTES.shiftNextWhy}</Note>
    </Section>
  );
}

export function ProofSection() {
  return (
    <Section labelledBy="proof">
      <SectionHead
        index={2}
        eyebrow="Earlier rounds"
        id="proof"
        title="เริ่มจากปัญหาเล็กๆ ที่เห็นเอง"
        lede="ไม่มีใครเริ่มจากไอเดียระดับโลก รุ่นก่อนเริ่มจากสิ่งที่เจอใกล้ตัว แล้วทำให้มีคนใช้ได้จริง"
      />
      <div className={styles.voices}>
        {VOICES.map((voice) => (
          <figure key={voice.quote} className={styles.voice} data-shift-reveal>
            <Quote className={styles.voiceMark} aria-hidden="true" />
            <blockquote>“{voice.quote}”</blockquote>
            <figcaption>
              {voice.name} · {voice.meta}
            </figcaption>
          </figure>
        ))}
      </div>
      {PROOF.length > 0 && (
        <div className={styles.proof}>
          {PROOF.map((project) => (
            <a
              key={project.url}
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.glass} ${styles.proofCard}`}
              {...GLASS}
            >
              <p className={styles.proofRound}>{project.round}</p>
              <h3>
                {project.title}
                <span className={styles.proofArrow}>
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </h3>
              {project.pitch && <p>{project.pitch}</p>}
              {project.proof && <em>{project.proof}</em>}
            </a>
          ))}
        </div>
      )}
    </Section>
  );
}

export function OutcomeSection() {
  return (
    <Section labelledBy="outcome">
      <SectionHead
        index={3}
        eyebrow="You leave with"
        id="outcome"
        title="7 เย็นต่อมา คุณมีของพวกนี้ติดมือ"
      />
      <ol className={styles.outcomes}>
        {YOU_GET.items.map((item, i) => (
          <li
            key={item.title}
            className={`${styles.glass} ${styles.outcome}`}
            style={{ ["--out-ink" as string]: OUTCOME_INKS[i] }}
            {...GLASS}
          >
            <div className={styles.outcomeTop}>
              <span className={styles.outcomeIcon}>
                <item.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className={styles.outcomeNum}>0{i + 1}</span>
            </div>
            <h3>{item.title}</h3>
            <p>{item.detail}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

export function FlightPlanSection() {
  return (
    <Section labelledBy="days">
      <SectionHead
        index={4}
        eyebrow="Flight plan"
        id="days"
        title="7 เย็น จากโจทย์ดิบ ถึงของที่คนนอกใช้ได้"
        lede="ลำดับเดียวกับรอบที่ผ่านมา วันจริงล็อกเมื่อรอบเปิด"
      />
      <ol className={styles.days} data-shift-reveal>
        {SHIFT_COHORT.schedule.map((day, i) => {
          const Icon = DAY_ICONS[i] ?? FileText;
          return (
            <li
              key={day.day}
              className={styles.day}
              style={{ ["--i" as string]: i }}
            >
              <span className={styles.dayStar} aria-hidden="true" />
              <Icon className={styles.dayIcon} aria-hidden="true" />
              <p className={styles.dayNum}>
                DAY {day.day}
                <span>{day.label}</span>
              </p>
              <h3>{day.title}</h3>
              <p>{day.detail}</p>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

function Deal({ column, ink }: { column: DealColumn; ink: string }) {
  return (
    <section
      className={`${styles.glass} ${styles.dealColumn}`}
      style={{ ["--col-ink" as string]: ink }}
      {...GLASS}
    >
      <span className={styles.dealGlow} aria-hidden="true" />
      <p className={styles.dealEyebrow}>{column.eyebrow}</p>
      <h3>{column.title}</h3>
      <ul className={styles.dealList}>
        {column.items.map((item) => (
          <li key={item.title}>
            <span className={styles.dealIcon}>
              <item.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DealSection() {
  return (
    <Section id="deal" labelledBy="deal-title">
      <SectionHead
        index={5}
        eyebrow="The deal"
        id="deal-title"
        title="ของจริง แลกด้วยแรงจริง"
        lede="ของที่ได้กลับไปเป็นจริงได้ เพราะคุณลงแรงเอง นี่คือส่วนที่ต้องลง กับส่วนที่เราดูแล อ่านก่อนลงชื่อ"
      />
      <div className={styles.deal}>
        <Deal column={YOU_BRING} ink={COSMOS.sol} />
        <Deal column={WE_GIVE} ink={COSMOS.aurora} />
      </div>
      <div className={`${styles.glass} ${styles.notFor}`} {...GLASS}>
        <p>รอบนี้อาจยังไม่ใช่ ถ้า...</p>
        <ul>
          {NOT_FOR_YOU.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <Note>{NOTES.shiftNextDeal}</Note>
    </Section>
  );
}

export function ReserveSection({ today }: { today: string }) {
  return (
    <Section id="reserve" labelledBy="reserve-title" className={styles.reserve}>
      <div className={styles.reserveGrid}>
        <div className={styles.reserveIntro} data-shift-reveal>
          <Eyebrow index={6}>Reserve your window</Eyebrow>
          <h2 id="reserve-title" className={styles.sectionTitle}>
            ลงชื่อ {NEXT_ROUND_NAME}
          </h2>
          <p className={styles.sectionLede}>
            ลงชื่อฟรี ยังไม่ต้องจ่าย ใช้ไม่ถึง 2 นาที ไม่ต้องล็อกอิน
          </p>
          <ol className={styles.reserveSteps}>
            {HOW_IT_WORKS.map((step, i) => (
              <li key={step.title}>
                <span className={styles.reserveStepNum}>
                  <step.icon className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">{i + 1}</span>
                </span>
                <div>
                  <strong>{step.title}</strong>
                  <span>{step.detail}</span>
                </div>
              </li>
            ))}
          </ol>
          <QuorumMeter seats={MIN_BUILDERS} />
          <Note>{NOTES.shiftNextForm}</Note>
        </div>
        <div className={`${styles.glass} ${styles.formPanel}`} data-glass>
          <div className={styles.formHead} aria-hidden="true">
            <span>
              <span className={styles.liveDot} />
              Pre-order · {NEXT_ROUND_NAME}
            </span>
            <span>~2 min</span>
          </div>
          <ShiftNextForm today={today} />
        </div>
      </div>
    </Section>
  );
}

export function FaqSection() {
  return (
    <Section labelledBy="faq">
      <div data-shift-reveal>
        <Eyebrow index={7}>FAQ</Eyebrow>
        <h2 id="faq" className={styles.sectionTitle}>
          คำถามที่น่าจะสงสัย
        </h2>
      </div>
      <div className={styles.faq}>
        {NEXT_FAQS.map((faq) => (
          <details key={faq.q}>
            <summary>{faq.q}</summary>
            <p>{faq.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
