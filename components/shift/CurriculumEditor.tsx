"use client";

import { useEffect, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { saveCurriculum } from "@/app/shift/curriculum/actions";
import type {
  CurriculumDay,
  CurriculumDoc,
  CurriculumRow,
} from "@/lib/content/shift2-curriculum";
import type { CurriculumOption } from "@/lib/shift-round/admin/curriculum";

/**
 * The /shift/curriculum page. Everyone with the link can read it; admins get
 * an Edit button that turns every text into a field, and Save writes the whole
 * curriculum to the shift_curriculum table. One round at a time: the picker
 * switches ?round=<key>. A round without a saved curriculum starts from the
 * default or from a copy of another round (re-dated by the page).
 */

export interface CurriculumCopySource {
  key: string;
  label: string;
  doc: CurriculumDoc;
}

const curriculumHref = (key: string) => `/shift/curriculum?round=${encodeURIComponent(key)}`;

const dateLabel = (iso: string) =>
  new Date(`${iso}T00:00:00+07:00`).toLocaleDateString("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Bangkok",
  });

// Tailwind 3 has no field-sizing utility; this makes textareas grow with their text.
const AUTO_SIZE = { fieldSizing: "content" } as CSSProperties;
const FIELD =
  "w-full resize-none rounded border border-amber-300/40 bg-black/40 px-2 py-1 text-white outline-none focus:border-amber-300";

function Text({
  value,
  onChange,
  editing,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  editing: boolean;
  className?: string;
}) {
  if (!editing) return <span className={className}>{value}</span>;
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={1}
      style={AUTO_SIZE}
      className={`${FIELD} ${className ?? ""}`}
    />
  );
}

function List({
  items,
  onChange,
  editing,
  ordered,
  className,
}: {
  items: string[];
  onChange: (v: string[]) => void;
  editing: boolean;
  ordered?: boolean;
  className?: string;
}) {
  const Tag = ordered ? "ol" : "ul";
  if (!editing) {
    return (
      <Tag className={`${ordered ? "list-decimal" : "list-disc"} space-y-1 pl-5 ${className ?? ""}`}>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </Tag>
    );
  }
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-1.5">
          <Text
            value={item}
            editing
            onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))}
          />
          <RemoveButton onClick={() => onChange(items.filter((_, j) => j !== i))} />
        </div>
      ))}
      <AddButton onClick={() => onChange([...items, ""])} />
    </div>
  );
}

const AddButton = ({ onClick, label = "+ เพิ่ม" }: { onClick: () => void; label?: string }) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded border border-dashed border-white/30 px-2 py-0.5 text-xs text-white/60 hover:bg-white/10"
  >
    {label}
  </button>
);

const RemoveButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="ลบ"
    className="mt-1 shrink-0 rounded px-1.5 text-white/40 hover:bg-red-500/20 hover:text-red-300"
  >
    ✕
  </button>
);

const parseSteps = (s: string) =>
  s
    .split(/[,\s]+/)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 1);

/** ?round=<key> picker: every curriculum key and every round's key, latest first. */
function RoundPicker({
  round,
  options,
  onChange,
}: {
  round: string;
  options: CurriculumOption[];
  onChange: (key: string) => void;
}) {
  if (options.length <= 1) return null;
  return (
    <select
      aria-label="เลือกรอบ"
      value={round}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-white/20 bg-black/40 px-2 py-1 text-sm text-white"
    >
      {options.map((o) => (
        <option key={o.key} value={o.key}>
          {o.hasRow ? o.label : `${o.label} (ยังไม่มี)`}
        </option>
      ))}
    </select>
  );
}

/** Shown when a round has no saved curriculum yet (v2 spec 3). */
function StartPanel({
  label,
  canEdit,
  unreadable,
  defaultDoc,
  copySources,
  onStart,
}: {
  label: string;
  canEdit: boolean;
  unreadable: boolean;
  defaultDoc: CurriculumDoc;
  copySources: CurriculumCopySource[];
  onStart: (doc: CurriculumDoc) => void;
}) {
  const [source, setSource] = useState(copySources[0]?.key ?? "");
  const picked = copySources.find((c) => c.key === source);
  return (
    <section className="mx-auto mt-10 max-w-[640px] rounded-lg border border-white/10 bg-white/5 p-6" aria-label="เริ่มหลักสูตร">
      <h2 className="text-lg font-bold">
        {unreadable ? `หลักสูตรของ ${label} ที่บันทึกไว้อ่านไม่ได้` : `ยังไม่มีหลักสูตรของ ${label}`}
      </h2>
      <p className="mt-1 text-sm text-white/60">
        จนกว่าจะบันทึก แอปจะใช้หลักสูตรแม่แบบ (default) เป็นแผนรายวันและวิธีคุยกับคน
      </p>
      {canEdit ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => onStart(defaultDoc)}
            className="rounded bg-amber-300 px-3 py-1.5 text-sm font-bold text-black hover:bg-amber-200"
          >
            เริ่มจากแม่แบบ
          </button>
          {copySources.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="curriculum-copy-from" className="text-sm text-white/60">
                หรือคัดลอกจาก
              </label>
              <select
                id="curriculum-copy-from"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="rounded border border-white/20 bg-black/40 px-2 py-1 text-sm text-white"
              >
                {copySources.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!picked}
                onClick={() => picked && onStart(picked.doc)}
                className="rounded bg-white/10 px-3 py-1.5 text-sm font-semibold hover:bg-white/20 disabled:opacity-50"
              >
                คัดลอก
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-white/50">แอดมินล็อกอินเพื่อสร้างหลักสูตรของรอบนี้</p>
      )}
      <p className="mt-4 text-xs text-white/40">วันที่และวันที่มีเซสชันจะปรับตามรอบนี้ให้ ตรวจแล้วกดบันทึก</p>
    </section>
  );
}

export function CurriculumEditor({
  round,
  label,
  options,
  initial,
  unreadable = false,
  updatedAt: initialUpdatedAt,
  canEdit,
  defaultDoc,
  copySources,
  refundSteps,
  refundHow,
}: {
  /** `shift_curriculum.round` key this page edits. */
  round: string;
  /** "SHIFT[3]" for the header and picker. */
  label: string;
  options: CurriculumOption[];
  /** Null when the round has no saved curriculum yet. */
  initial: CurriculumDoc | null;
  /** A row exists but its content does not parse. */
  unreadable?: boolean;
  updatedAt: string | null;
  canEdit: boolean;
  /** "Start from default": the default row, else the code defaults, prepared for this round. */
  defaultDoc: CurriculumDoc;
  /** "Copy from round X": other saved curricula, prepared for this round. */
  copySources: CurriculumCopySource[];
  refundSteps: string[];
  refundHow: string;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState<CurriculumDoc | null>(initial);
  const [doc, setDoc] = useState<CurriculumDoc | null>(initial);
  const [editing, setEditing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);
  const [pending, startTransition] = useTransition();
  const dirty = doc !== saved;

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const edit = (fn: (d: CurriculumDoc) => CurriculumDoc) => setDoc((d) => (d ? fn(d) : d));
  const patch = (p: Partial<CurriculumDoc>) => edit((d) => ({ ...d, ...p }));
  const patchInterview = (p: Partial<CurriculumDoc["interview"]>) =>
    edit((d) => ({ ...d, interview: { ...d.interview, ...p } }));
  const patchDay = (i: number, p: Partial<CurriculumDay>) =>
    edit((d) => ({ ...d, days: d.days.map((day, j) => (j === i ? { ...day, ...p } : day)) }));
  const patchRow = (i: number, r: number, c: number, v: string) =>
    edit((d) => ({
      ...d,
      days: d.days.map((day, j) =>
        j === i
          ? {
              ...day,
              schedule: day.schedule?.map((row, k) =>
                k === r ? (row.map((x, n) => (n === c ? v : x)) as CurriculumRow) : row,
              ),
            }
          : day,
      ),
    }));

  const save = () =>
    startTransition(async () => {
      if (!doc) return;
      const res = await saveCurriculum(round, doc);
      if (!res.ok) {
        toast.error(`บันทึกไม่ได้: ${res.error}`);
        return;
      }
      setSaved(doc);
      setUpdatedAt(res.updatedAt);
      setEditing(false);
      toast.success("บันทึกแล้ว");
      router.refresh();
    });

  const cancel = () => {
    if (dirty && !window.confirm("ทิ้งสิ่งที่แก้?")) return;
    setDoc(saved);
    setEditing(false);
  };

  const start = (source: CurriculumDoc) => {
    setDoc(source);
    setEditing(true);
  };

  const switchRound = (key: string) => {
    if (key === round) return;
    if (dirty && !window.confirm("ทิ้งสิ่งที่แก้?")) return;
    router.push(curriculumHref(key));
  };

  if (!doc) {
    return (
      <div className="min-h-screen bg-neutral-950 font-bai-jamjuree text-white">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-neutral-950/90 px-4 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg font-bold">{label} · Curriculum (internal)</h1>
            <RoundPicker round={round} options={options} onChange={switchRound} />
          </div>
        </header>
        <main className="px-4">
          <StartPanel
            label={label}
            canEdit={canEdit}
            unreadable={unreadable}
            defaultDoc={defaultDoc}
            copySources={copySources}
            onStart={start}
          />
        </main>
      </div>
    );
  }

  const iv = doc.interview;

  return (
    <div className="min-h-screen bg-neutral-950 font-bai-jamjuree text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-neutral-950/90 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-bold">{label} · Curriculum (internal)</h1>
          <RoundPicker round={round} options={options} onChange={switchRound} />
          {!saved && <span className="rounded bg-amber-300/15 px-2 py-0.5 text-xs text-amber-200">ยังไม่ได้บันทึก</span>}
          {updatedAt && (
            <span className="text-xs text-white/40">
              แก้ล่าสุด {new Date(updatedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
            </span>
          )}
          <div className="ml-auto flex gap-2">
            {canEdit && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded bg-white/10 px-3 py-1 text-sm font-semibold hover:bg-white/20"
              >
                แก้ไข
              </button>
            )}
            {editing && (
              <>
                <button
                  type="button"
                  onClick={cancel}
                  disabled={pending}
                  className="rounded bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={pending || !dirty}
                  className="rounded bg-amber-300 px-3 py-1 text-sm font-bold text-black hover:bg-amber-200 disabled:opacity-50"
                >
                  {pending ? "กำลังบันทึก…" : "บันทึก"}
                </button>
              </>
            )}
          </div>
        </div>
        <nav className="mt-2 flex flex-wrap gap-2 text-sm">
          <a href="#rules" className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">
            Rules
          </a>
          <a href="#interview" className="rounded bg-white/10 px-2 py-1 hover:bg-white/20">
            วิธีคุยกับคน
          </a>
          {doc.days.map((d) => (
            <a
              key={d.day}
              href={`#day${d.day}`}
              className="rounded bg-white/10 px-2 py-1 hover:bg-white/20"
            >
              Day {d.day} · {dateLabel(d.date)}
            </a>
          ))}
        </nav>
      </header>

      <main className="mx-auto flex max-w-[1000px] flex-col gap-10 px-4 py-8">
        <section id="rules" className="grid scroll-mt-28 gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-white/5 p-4">
            <h2 className="text-lg font-bold">กติกาที่บอกใน Day 1</h2>
            <List
              items={doc.rules}
              onChange={(rules) => patch({ rules })}
              editing={editing}
              className="mt-2 text-white/80"
            />
            <p className="mt-3 text-sm text-white/50">
              เซสชัน{" "}
              <Text
                value={doc.sessionTime}
                onChange={(sessionTime) => patch({ sessionTime })}
                editing={editing}
              />
            </p>
          </div>
          <div className="rounded-lg bg-white/5 p-4">
            <h2 className="text-lg font-bold">ขั้นตอนคืนเงิน</h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-white/80">
              {refundSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="mt-3 text-sm text-white/50">{refundHow}</p>
            {editing && (
              <p className="mt-2 text-xs text-white/40">
                ขั้นตอนคืนเงินแก้ที่นี่ไม่ได้ เพราะใช้ร่วมกับหน้าเว็บสาธารณะ (lib/content/shift-refund.ts)
              </p>
            )}
          </div>
        </section>

        <section id="interview" className="scroll-mt-28 rounded-lg bg-white/5 p-4">
          <h2 className="text-lg font-bold">วิธีคุยกับคน (สอน Day 1 ก่อน First contact)</h2>
          <Text
            value={iv.intro}
            onChange={(intro) => patchInterview({ intro })}
            editing={editing}
            className="mt-1 block text-white/70"
          />
          <div className="mt-4 rounded border border-white/10 p-3">
            <h3 className="font-semibold text-amber-300">ข้อความ DM นัดคุย</h3>
            <Text
              value={iv.dm}
              onChange={(dm) => patchInterview({ dm })}
              editing={editing}
              className="mt-1 block text-white/80"
            />
          </div>
          <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
            <div className="rounded-lg border border-white/10 p-3">
              <h3 className="font-semibold text-amber-300">คำถาม</h3>
              <List
                items={iv.questions}
                onChange={(questions) => patchInterview({ questions })}
                editing={editing}
                ordered
                className="mt-1 text-white/80"
              />
            </div>
            <div className="rounded-lg border border-white/10 p-3">
              <h3 className="font-semibold text-emerald-300">ทำ</h3>
              <List
                items={iv.dos}
                onChange={(dos) => patchInterview({ dos })}
                editing={editing}
                className="mt-1 text-white/80"
              />
            </div>
            <div className="rounded-lg border border-white/10 p-3">
              <h3 className="font-semibold text-red-300">อย่าทำ</h3>
              <List
                items={iv.donts}
                onChange={(donts) => patchInterview({ donts })}
                editing={editing}
                className="mt-1 text-white/80"
              />
            </div>
          </div>
        </section>

        {doc.days.map((d, i) => (
          <section key={d.day} id={`day${d.day}`} className="scroll-mt-28">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="flex flex-1 items-baseline gap-2 text-2xl font-bold">
                <span className="shrink-0">Day {d.day} ·</span>
                <Text value={d.name} onChange={(name) => patchDay(i, { name })} editing={editing} />
              </h2>
              {editing ? (
                <>
                  <input
                    type="date"
                    value={d.date}
                    onChange={(e) => patchDay(i, { date: e.target.value })}
                    className={`${FIELD} w-auto`}
                  />
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={d.mentorSession}
                      onChange={(e) => patchDay(i, { mentorSession: e.target.checked })}
                    />
                    เซสชันกับพี่เลี้ยง
                  </label>
                </>
              ) : (
                <>
                  <span className="text-white/50">{dateLabel(d.date)}</span>
                  <span
                    className={
                      d.mentorSession
                        ? "rounded bg-emerald-400/15 px-2 py-0.5 text-xs font-semibold text-emerald-300"
                        : "rounded bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/60"
                    }
                  >
                    {d.mentorSession ? "เซสชันกับพี่เลี้ยง" : "ไม่มีเซสชัน · ทำเองใน Discord"}
                  </span>
                </>
              )}
            </div>
            <Text
              value={d.goal}
              onChange={(goal) => patchDay(i, { goal })}
              editing={editing}
              className="mt-1 block text-white/70"
            />

            {(editing || !!d.schedule?.length) && (
              <div className="mt-4 rounded-lg bg-white/5 p-4">
                <table className="w-full text-left text-sm sm:text-base">
                  <tbody>
                    {(d.schedule ?? []).map((row, r) => (
                      <tr key={r} className="border-b border-white/10 align-top last:border-0">
                        <td className="w-24 whitespace-nowrap py-2 pr-4 font-mono text-amber-300">
                          <Text value={row[0]} onChange={(v) => patchRow(i, r, 0, v)} editing={editing} />
                        </td>
                        <td className="w-48 py-2 pr-4 font-semibold">
                          <Text value={row[1]} onChange={(v) => patchRow(i, r, 1, v)} editing={editing} />
                        </td>
                        <td className="py-2 text-white/60">
                          <Text value={row[2]} onChange={(v) => patchRow(i, r, 2, v)} editing={editing} />
                        </td>
                        {editing && (
                          <td className="py-2 pl-1">
                            <RemoveButton
                              onClick={() =>
                                patchDay(i, { schedule: d.schedule?.filter((_, k) => k !== r) })
                              }
                            />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {editing && (
                  <div className="mt-2">
                    <AddButton
                      label="+ เพิ่มแถว"
                      onClick={() => patchDay(i, { schedule: [...(d.schedule ?? []), ["", "", ""]] })}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
              <div className="rounded-lg border border-white/10 p-3">
                <h3 className="font-semibold text-amber-300">Mission</h3>
                <Text
                  value={d.mission}
                  onChange={(mission) => patchDay(i, { mission })}
                  editing={editing}
                  className="mt-1 block text-white/80"
                />
              </div>
              <div className="rounded-lg border border-white/10 p-3">
                <h3 className="font-semibold text-amber-300">ขั้นตอนคืนเงินวันนี้</h3>
                {editing ? (
                  <input
                    defaultValue={d.refundSteps.join(", ")}
                    onBlur={(e) => patchDay(i, { refundSteps: parseSteps(e.target.value) })}
                    placeholder="เช่น 1, 8, 9"
                    className={`${FIELD} mt-1`}
                  />
                ) : (
                  <ul className="mt-1 space-y-0.5 text-white/80">
                    {d.refundSteps.map((n) => (
                      <li key={n}>
                        {n}. {refundSteps[n - 1]}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-lg border border-white/10 p-3">
                <h3 className="font-semibold text-amber-300">พี่เลี้ยงเช็ก</h3>
                <List
                  items={d.mentorChecks}
                  onChange={(mentorChecks) => patchDay(i, { mentorChecks })}
                  editing={editing}
                  className="mt-1 text-white/80"
                />
              </div>
            </div>
          </section>
        ))}

        {!canEdit && (
          <p className="text-center text-xs text-white/30">
            แอดมิน <a href="/login" className="underline">ล็อกอิน</a> เพื่อแก้ไข
          </p>
        )}
      </main>
    </div>
  );
}
