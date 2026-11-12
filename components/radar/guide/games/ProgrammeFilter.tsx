"use client";

/**
 * ProgrammeFilter (tcas): grade gate, round/track filters, GPAX (device only),
 * fit order, programme cards with countdowns for ม.6 only.
 * demo parts: `grade-m4|m5|m6`, `round-portfolio|all`, `track-all|thai|intl`,
 * `gpax`, `save-<id>`, `open-<id>`, `more`.
 * Milestones: `grade` (value 4/5/6), `save` (value = shortlist size).
 * Done (first grade pick) value: 4/5/6. Card links fire cta_click `program`.
 * Saves `grade`, `shortlist`, local.gpax (never sent).
 *
 * The committed mytcas snapshot (data.snapshot === "tcas.json") is resolved on
 * the server into `snapshotProgrammes` (cross-unit request to U0/U1: an
 * optional field on ProgrammeFilterData); they render behind "ดูอีก N หลักสูตร".
 */
import { useEffect, useState } from "react";
import {
  FACT_BADGE_TH,
  type EngineProps,
  type GradeKey,
  type ProgrammeCard,
  type ProgrammeFilterData,
} from "@/lib/radar-guide/guide-types";
import {
  clampGpax,
  countdownLabel,
  filterProgrammes,
  fitOrderFor,
  gpaxGreyed,
  gradeValue,
  orderProgrammes,
  showsCountdown,
  type RoundFilter,
  type TrackFilter,
} from "@/lib/radar-guide/games/programme";
import { useEngineStore } from "./engine-context";
import { EngineFrame, demoId, useGameOutcome } from "./engine-shell";

/** Kept as an alias: snapshotProgrammes is now part of ProgrammeFilterData. */
export type ProgrammeFilterRuntimeData = ProgrammeFilterData;

const GRADES: readonly { id: GradeKey; labelTh: string }[] = [
  { id: "m4", labelTh: "ม.4" },
  { id: "m5", labelTh: "ม.5" },
  { id: "m6", labelTh: "ม.6" },
];

const TRACK_TH: Record<ProgrammeCard["track"], string> = {
  thai: "ภาษาไทย",
  intl: "นานาชาติ",
  special: "ภาษาไทย โครงการพิเศษ",
};

const ROUND_TH: Record<ProgrammeCard["rounds"][number], string> = {
  portfolio: "รอบ 1 Portfolio",
  quota: "รอบ 2 Quota",
  admission: "รอบ 3 Admission",
  direct: "รอบ 4 Direct",
};

function Toggle<T extends string>({
  value,
  options,
  onChange,
  label,
  blockId,
  prefix,
}: {
  value: T;
  options: readonly { id: T; labelTh: string }[];
  onChange(v: T): void;
  label: string;
  blockId: string;
  prefix: string;
}) {
  return (
    <div className="rg-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className="rg-seg__btn"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          data-demo={demoId(blockId, `${prefix}-${o.id}`)}
        >
          {o.labelTh}
        </button>
      ))}
    </div>
  );
}

export default function ProgrammeFilter(props: EngineProps<"ProgrammeFilter">) {
  const { blockId, pageKey, tracker, reducedMotion, skipped } = props;
  const data = props.data as ProgrammeFilterRuntimeData;
  const outcome = useGameOutcome(props);
  const store = useEngineStore();
  const { state } = store;
  const grade = state.grade;
  const [round, setRound] = useState<RoundFilter>("all");
  const [track, setTrack] = useState<TrackFilter>("all");
  const [showMore, setShowMore] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const storedGpax = typeof state.local?.gpax === "number" ? state.local.gpax : undefined;

  useEffect(() => {
    if (!showsCountdown(grade)) return;
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [grade]);

  const pickGrade = (g: GradeKey) => {
    store.dispatch({ type: "grade", grade: g });
    outcome.milestone("grade", gradeValue(g));
    outcome.finish({ done: true, ms: outcome.elapsed() }, gradeValue(g));
  };

  const shortlist = state.shortlist ?? [];
  const toggleSave = (id: string) => {
    const next = shortlist.includes(id) ? shortlist.filter((s) => s !== id) : [...shortlist, id];
    store.dispatch({ type: "shortlist", ids: next });
    if (next.length > shortlist.length) outcome.milestone("save", next.length);
  };

  const setGpax = (value: number | undefined) =>
    store.dispatch({ type: "local", patch: { gpax: value === undefined ? undefined : clampGpax(value) } });

  const order = fitOrderFor(state.fit, data.fitOrder);
  const featured = orderProgrammes(filterProgrammes(data.programmes, { round, track }), order);
  const more = filterProgrammes(data.snapshotProgrammes ?? [], { round, track });
  const countdown = showsCountdown(grade);
  const gated = Boolean(grade) || skipped;

  const card = (p: ProgrammeCard) => {
    const greyed = gpaxGreyed(p, storedGpax);
    const saved = shortlist.includes(p.id);
    return (
      <li key={p.id} className="rg-prog" data-greyed={greyed ? "" : undefined}>
        <div className="rg-prog__head">
          <span className="rg-prog__uni">{p.uniTh}</span>
          <button
            type="button"
            className="rg-prog__star"
            aria-pressed={saved}
            aria-label={saved ? "เอาออกจากที่เก็บไว้" : "เก็บไว้ดูทีหลัง"}
            onClick={() => toggleSave(p.id)}
            data-demo={demoId(blockId, `save-${p.id}`)}
          >
            {saved ? "★" : "☆"}
          </button>
        </div>
        <p className="rg-prog__degree">{p.degreeTh}</p>
        <p className="rg-prog__meta">
          <span>{TRACK_TH[p.track]}</span>
          {p.rounds.map((r) => (
            <span key={r}>{ROUND_TH[r]}</span>
          ))}
          <span>{p.seats !== undefined ? `รับ ${p.seats} คน` : "จำนวนรับ ดูใน mytcas"}</span>
          {p.minGpax !== undefined ? <span>GPAX {p.minGpax.toFixed(2)} ขึ้นไป</span> : null}
        </p>
        {p.deadline ? (
          <p className="rg-prog__deadline">
            {p.deadline.labelTh}
            {countdown ? <span className="rg-prog__count"> · {countdownLabel(p.deadline.at, now)}</span> : null}
          </p>
        ) : (
          <p className="rg-prog__deadline">วันปิดรับ ดูใน mytcas</p>
        )}
        {greyed ? <p className="rg-prog__grey">GPAX ที่ใส่ไว้ยังต่ำกว่าเกณฑ์ที่รู้ ลองดูเงื่อนไขเต็มใน mytcas</p> : null}
        {p.noteTh ? <p className="rg-prog__note">{p.noteTh}</p> : null}
        <p className="rg-prog__foot">
          <span className="rg-game__badge">{FACT_BADGE_TH[p.badge]}</span>
          <a
            className="rg-prog__link"
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => tracker.track({ type: "cta_click", pageKey, target: "program" })}
            data-demo={demoId(blockId, `open-${p.id}`)}
          >
            ดูใน mytcas
          </a>
        </p>
      </li>
    );
  };

  const broad = data.broadRoutes.length ? (
    <div className="rg-prog__broad">
      <p className="rg-game__prompt">ประตูกว้าง</p>
      <ul>
        {data.broadRoutes.map((r) => (
          <li key={r.href}>
            <a href={r.href} className="rg-prog__link">
              {r.labelTh}
            </a>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

  return (
    <EngineFrame
      engine="ProgrammeFilter"
      blockId={blockId}
      tagTh="วางแผนรอบสมัคร"
      status={grade ? "clear" : skipped ? "solved" : "play"}
      reducedMotion={reducedMotion}
    >
      <p className="rg-game__prompt">{data.gradeQuestionTh}</p>
      <div className="rg-seg rg-seg--big" role="group" aria-label={data.gradeQuestionTh}>
        {GRADES.map((g) => (
          <button
            key={g.id}
            type="button"
            className="rg-seg__btn"
            aria-pressed={grade === g.id}
            onClick={() => pickGrade(g.id)}
            data-demo={demoId(blockId, `grade-${g.id}`)}
          >
            {g.labelTh}
          </button>
        ))}
      </div>

      {grade ? <p className="rg-prog__banner">{data.gradeBannersTh[grade]}</p> : null}
      {grade && data.extraChecklistTh?.[grade]?.length ? (
        <ul className="rg-prog__checklist">
          {data.extraChecklistTh[grade]!.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}

      {gated ? (
        <>
          <div className="rg-prog__filters">
            <Toggle<RoundFilter>
              value={round}
              onChange={setRound}
              label="รอบ"
              blockId={blockId}
              prefix="round"
              options={[
                { id: "portfolio", labelTh: "รอบ 1 Portfolio" },
                { id: "all", labelTh: "ทุกรอบ" },
              ]}
            />
            <Toggle<TrackFilter>
              value={track}
              onChange={setTrack}
              label="ภาษา"
              blockId={blockId}
              prefix="track"
              options={[
                { id: "all", labelTh: "ทั้งหมด" },
                { id: "thai", labelTh: "ภาษาไทย" },
                { id: "intl", labelTh: "นานาชาติ" },
              ]}
            />
            <label className="rg-prog__gpax">
              <span>
                GPAX ของเธอ {storedGpax !== undefined ? storedGpax.toFixed(2) : "(ไม่ใส่ก็ได้)"}
              </span>
              <input
                type="range"
                min={0}
                max={4}
                step={0.05}
                value={storedGpax ?? 3}
                onChange={(e) => setGpax(Number(e.target.value))}
                data-demo={demoId(blockId, "gpax")}
              />
              <span className="rg-game__fine">เก็บไว้ในเครื่องนี้เท่านั้น ไม่ส่งไปที่ไหน</span>
            </label>
            {storedGpax !== undefined ? (
              <button type="button" className="rg-game__textbtn" onClick={() => setGpax(undefined)}>
                ล้าง GPAX
              </button>
            ) : null}
          </div>

          {featured.broadFirst ? broad : null}
          <ul className="rg-prog__list">{featured.programmes.map(card)}</ul>
          {featured.programmes.length === 0 ? <p className="rg-game__hint">ไม่มีหลักสูตรตรงตัวกรองนี้ ลองเปลี่ยนตัวกรองดู</p> : null}
          {more.length ? (
            showMore ? (
              <ul className="rg-prog__list">{more.map(card)}</ul>
            ) : (
              <button
                type="button"
                className="rg-px-btn rg-px-btn--wide"
                onClick={() => setShowMore(true)}
                data-demo={demoId(blockId, "more")}
              >
                ดูอีก {more.length} หลักสูตร
              </button>
            )
          ) : null}
          {!featured.broadFirst ? broad : null}
        </>
      ) : null}
    </EngineFrame>
  );
}
