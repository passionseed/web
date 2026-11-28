"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { teamLabel } from "@/lib/hackathon/elemental/team-name";
import type { PublicTeam } from "@/lib/supabase/hackathon-event-registrations";

import { RecoveringPlace } from "../RecoveringPlace";
import { Page, PixelIcon, PrimaryButton, SecondaryButton, StickyBar, Tag, v } from "../share/ui";
import { trackElemental } from "../track";
import {
  emptyDraft,
  firstInvalidStep,
  registrationBody,
  stepForServerPath,
  stepsFor,
  validateStep,
  type BuddyPassOffer,
  type Draft,
  type Errors,
  type Mode,
  type StepKey,
} from "./draft";
import { LegalLine, STEP_VIEWS } from "./steps";
import styles from "./join.module.css";

/**
 * Elemental sign-up, one question per screen. Answers stay in this tab
 * (sessionStorage) until they're sent, so a refresh or a detour to LINE
 * loses nothing. The phone's back button steps back. Each step sends one
 * funnel event (track.ts), so the admin page shows where people stop.
 *
 * Looks like the rest of Elemental: the cream "paper" page (share/ui.tsx Page) that the pay
 * page continues, the ink top bar with "← Elemental", a hairline progress meter with [2/6],
 * and each step's one primary action in a sticky bar at the bottom, with "back" beside it.
 */

type Props = {
  source?: string;
  utm?: Record<string, string>;
  team?: PublicTeam;
  buddyPass?: BuddyPassOffer;
  /** Shown above the first step, e.g. "this team is full". */
  notice?: string;
  backHref: string;
  /** Development and PR previews only: fake the submit, send no funnel events, and open the demo pay page instead. */
  demo?: boolean;
};

type Saved = { draft: Draft; step: StepKey };

const storageKey = (team?: PublicTeam, buddyPass?: BuddyPassOffer) =>
  `elemental-join:${team?.inviteCode ?? (buddyPass ? `pass:${buddyPass.code}` : "new")}`;

function load(team?: PublicTeam, buddyPass?: BuddyPassOffer): Saved | null {
  try {
    const raw = sessionStorage.getItem(storageKey(team, buddyPass));
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

const SERVER_ERRORS: Record<string, string> = {
  closed: "ปิดรับสมัครแล้ว",
  team_full: `ทีมนี้ครบ ${ELEMENTAL.maxGroupSize} คนแล้ว สมัครคนเดียวหรือสร้างทีมใหม่ได้`,
  team_not_found: "ไม่เจอทีมนี้ ขอลิงก์ใหม่จากเพื่อน หรือสมัครคนเดียวก่อน",
  pass_used: "บัตรเพื่อนใบนี้มีคนใช้ไปแล้ว ใบนึงใช้ได้คนเดียว ย้อนกลับไปเลือกสมัครแบบปกติได้เลย",
  pass_locked: "บัตรเพื่อนใบนี้ยังไม่ปลดล็อก เพื่อนยังจ่ายไม่เสร็จ รอสลิปผ่านแล้วค่อยลองใหม่",
  pass_invalid: "บัตรเพื่อนจากลิงก์นี้ใช้ไม่ได้ ย้อนกลับไปเลือกสมัครแบบปกติได้เลย",
  pass_self: "บัตรนี้ให้เพื่อนใช้ ใช้เองไม่ได้นะ ส่งต่อให้เพื่อนเลย",
};

function buttonLabel(step: StepKey, mode: Mode, saving: boolean, teamName = ""): string {
  if (step !== "review") return saving ? "บันทึก" : "ต่อไป";
  if (mode === "create") return "สร้างทีมและสมัคร";
  if (mode === "join") return `เข้า${teamLabel(teamName)}`;
  if (mode === "buddy") return `สมัครด้วยบัตรเพื่อน ฿${ELEMENTAL.buddyPriceBaht}`;
  return "สมัคร";
}

export function JoinFlow({ source, utm, team, buddyPass, notice, backHref, demo }: Props) {
  const router = useRouter();
  // The demo runs on PR previews too: keep its clicks out of the funnel.
  const track: typeof trackElemental = demo ? () => {} : trackElemental;
  const initialMode: Mode | null = team ? "join" : buddyPass ? "buddy" : null;
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(initialMode));
  const [step, setStep] = useState<StepKey>("mode");
  const [dir, setDir] = useState<"forward" | "back">("forward");
  const [errors, setErrors] = useState<Errors>({});
  /** Set while fixing one answer from the review: "save" goes straight back there. */
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const shaker = useRef<HTMLDivElement>(null);
  /** Steps this tab pushed onto history; when 0 (e.g. after a refresh), "back" steps back in place. */
  const pushed = useRef(0);

  const steps = useMemo(() => stepsFor(draft), [draft]);
  const index = Math.max(0, steps.indexOf(step));

  // Restore this tab's answers once, after hydration.
  useEffect(() => {
    const saved = load(team, buddyPass);
    // A step saved before it was removed from the flow (e.g. "team") restarts at the first gap.
    const restoredDraft = saved ? { ...emptyDraft(initialMode), ...saved.draft } : null;
    const restoredStep = saved && restoredDraft && stepsFor(restoredDraft).includes(saved.step)
      ? saved.step
      : restoredDraft
        ? (firstInvalidStep(restoredDraft) ?? "review")
        : "mode";
    if (restoredDraft) {
      setDraft(restoredDraft);
      setStep(restoredStep);
    }
    window.history.replaceState({ ...window.history.state, elStep: restoredStep }, "");
    setRestored(true);
    track({ step: "join", source, mode: initialMode ?? undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(storageKey(team, buddyPass), JSON.stringify({ draft, step } satisfies Saved));
    } catch {
      // Private mode: the flow still works, it just won't survive a refresh.
    }
  }, [draft, step, restored, team, buddyPass]);

  // Count each step once, and put the cursor in its first box.
  useEffect(() => {
    if (!restored) return;
    track({ step: `step:${step}`, mode: draft.mode ?? undefined, source });
    if (step === "review") setEditing(false);
    const el = body.current?.querySelector<HTMLElement>("[data-autofocus]");
    if (el && window.matchMedia("(hover: hover)").matches) el.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, restored]);

  // The phone's back button walks back through the steps.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const target = (e.state?.elStep as StepKey | undefined) ?? "mode";
      pushed.current = Math.max(0, pushed.current - 1);
      setDir("back");
      setErrors({});
      setStep(target);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const set = useCallback((patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k as keyof Errors];
      return next;
    });
    setServerError(null);
  }, []);

  const goTo = useCallback(
    (target: StepKey, direction: "forward" | "back" = "forward") => {
      setDir(direction);
      setErrors({});
      setStep(target);
      window.history.pushState({ ...window.history.state, elStep: target }, "");
      pushed.current += 1;
    },
    [],
  );

  const fail = (found: Errors) => {
    setErrors(found);
    // Restart the shake without remounting the fields, so the cursor stays put.
    const el = shaker.current;
    if (el) {
      el.classList.remove(styles.nudge);
      void el.offsetWidth;
      el.classList.add(styles.nudge);
    }
    // After the errors render: bring the first one into view and, if it's a box, open the keyboard on it.
    requestAnimationFrame(() => {
      const bad = body.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]');
      if (!bad) return;
      bad.scrollIntoView({ block: "center", behavior: "smooth" });
      if (bad instanceof HTMLInputElement) bad.focus({ preventScroll: true });
    });
    track({ step: "invalid", detail: Object.keys(found).join(","), mode: draft.mode ?? undefined }, { once: false });
  };

  const submit = async () => {
    const bad = firstInvalidStep(draft);
    if (bad && bad !== "review") {
      goTo(bad, "back");
      setErrors(validateStep(bad, draft));
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 700));
        sessionStorage.removeItem(storageKey(team, buddyPass));
        router.push(`/hackathon/join/demo?state=pending&mode=${draft.mode ?? "solo"}`);
        return;
      }
      const res = await fetch("/api/hackathon/elemental/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationBody(draft, team?.inviteCode, source, utm, buddyPass)),
      });
      const data = (await res.json().catch(() => ({}))) as {
        payToken?: string;
        error?: string;
        issues?: { path: (string | number)[] }[];
      };
      if (res.ok && data.payToken) {
        track({ step: "submitted", mode: draft.mode ?? undefined, source });
        sessionStorage.removeItem(storageKey(team, buddyPass));
        router.push(`/hackathon/join/${data.payToken}`);
        return; // keep the spinner until the pay page opens
      }
      track({ step: "submit_failed", detail: data.error ?? String(res.status) }, { once: false });
      if (data.error === "invalid" && data.issues?.length) {
        const target = stepForServerPath(data.issues[0].path);
        goTo(target, "back");
        setServerError("ตรวจข้อมูลในหน้านี้อีกครั้ง");
      } else {
        setServerError(SERVER_ERRORS[data.error ?? ""] ?? "บันทึกไม่สำเร็จ ลองอีกครั้ง หรือทักไลน์ @passionseed");
      }
      setSubmitting(false);
    } catch {
      setServerError("เชื่อมต่อไม่ได้ เช็กอินเทอร์เน็ตแล้วกดอีกครั้ง");
      setSubmitting(false);
    }
  };

  const next = () => {
    const found = validateStep(step, draft);
    if (Object.keys(found).length) return fail(found);
    if (step === "review") return void submit();
    if (editing) return goTo(firstInvalidStep(draft) ?? "review");
    goTo(steps[index + 1]);
  };

  const choose = (mode: Mode) => {
    set({ mode });
    const after = { ...draft, mode };
    const target: StepKey = editing ? (firstInvalidStep(after) ?? "review") : "name";
    // Let the tap register visually, then move on.
    window.setTimeout(() => goTo(target), 160);
  };

  const edit = (target: StepKey) => {
    setEditing(true);
    goTo(target, "back");
  };

  const back = () => {
    if (pushed.current > 0) return window.history.back();
    const previous = steps[index - 1];
    if (!previous) return;
    setDir("back");
    setErrors({});
    setStep(previous);
    window.history.replaceState({ ...window.history.state, elStep: previous }, "");
  };

  const onSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    next();
  };

  // While fixing an answer from the review, the button says "save" only if it goes straight back there.
  const detour = editing && steps.slice(index + 1).some((s) => s !== "review" && Object.keys(validateStep(s, draft)).length > 0);
  const View = STEP_VIEWS[step];
  const isFirst = index === 0;
  // An invite (team link or buddy pass) opens on one offer; taking it is the step's primary action.
  const invite: Mode | null =
    step === "mode" && team && draft.mode === "join" ? "join" : step === "mode" && buddyPass && draft.mode === "buddy" ? "buddy" : null;
  const showContinue = step !== "mode" || (draft.mode !== null && invite === null);
  const cta = buttonLabel(step, draft.mode ?? "solo", editing && !detour, team?.name);

  // Solid cream here: the 96% bar let the big footer wordmark show through behind the buttons.
  const bar =
    invite || showContinue ? (
      <div style={{ "--el-bar": EL.cream } as CSSProperties}>
        <StickyBar>
          <div className="min-w-0 flex-1">
            {step === "review" && <LegalLine />}
            <div className="flex items-stretch gap-2">
              {!isFirst && (
                <SecondaryButton onClick={back} className="w-[52px] shrink-0 !px-0" aria-label="ย้อนกลับ">
                  <PixelIcon name="back" />
                </SecondaryButton>
              )}
              {invite ? (
                <PrimaryButton full arrow onClick={() => choose(invite)}>
                  {invite === "join" ? `เข้า${teamLabel(team?.name ?? "")}` : `ใช้บัตรเพื่อน ฿${ELEMENTAL.buddyPriceBaht}`}
                </PrimaryButton>
              ) : (
                <PrimaryButton
                  type="submit"
                  full
                  disabled={submitting}
                  aria-busy={submitting || undefined}
                  arrow={!submitting && step !== "review" && (!editing || detour)}
                  className={`min-w-0 flex-1 ${styles.busy}`}
                >
                  {submitting ? (
                    <>
                      กำลังสมัคร{" "}
                      <span className={styles.dots} aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                    </>
                  ) : (
                    cta
                  )}
                </PrimaryButton>
              )}
            </div>
          </div>
        </StickyBar>
      </div>
    ) : undefined;

  return (
    <form onSubmit={onSubmit} noValidate>
      <Page surface="paper" back={{ href: backHref, label: ELEMENTAL.edition }} bar={bar}>
        {/* The total depends on the first answer, so the meter shows from step 2 on. */}
        {!isFirst && <ProgressMeter index={index} total={steps.length} />}
        {notice && step === "mode" && (
          <p className="mb-8 border-l-2 py-1 pl-4 text-pretty" style={{ borderColor: EL.flame, fontFamily: EL_FONT.body, fontSize: 16, lineHeight: "26px" }}>
            {notice}
          </p>
        )}
        {/* At least a screen tall, so on a short step the wordmark footer starts under the sticky bar, not cut by it. */}
        <div key={step} ref={body} className={`${dir === "forward" ? styles.flowIn : styles.flowBack} min-h-[calc(100dvh-15rem)]`}>
          <div ref={shaker}>
            <View draft={draft} set={set} errors={errors} team={team} buddyPass={buddyPass} choose={choose} goTo={edit} />
          </div>
          {/* Before and after: washed out here, in full colour on the paid seat. After the choice, so both options fit on the first screen. */}
          {step === "mode" && !invite && <RecoveringPlace restored={0.25} className="mt-10" />}
        </div>
        {serverError && (
          <p
            role="alert"
            className="mt-8 border-l-2 py-1 pl-4 text-pretty"
            style={{ borderColor: v.error, color: v.error, fontFamily: EL_FONT.body, fontSize: 16, lineHeight: "26px" }}
          >
            {serverError}
          </p>
        )}
      </Page>
    </form>
  );
}

/** Where you are: a hairline that fills in flame, and the count as a Space Mono [2/6]. */
function ProgressMeter({ index, total }: { index: number; total: number }) {
  return (
    <div className="-mt-4 mb-8 flex items-center gap-3">
      <div
        className="relative h-[2px] flex-1 overflow-hidden"
        style={{ backgroundColor: v.rule }}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={index + 1}
        aria-label="ความคืบหน้าการสมัคร"
      >
        <div className={styles.meterFill} style={{ transform: `scaleX(${(index + 1) / total})`, backgroundColor: EL.flame }} />
      </div>
      <span aria-live="polite">
        <Tag>
          {index + 1}/{total}
        </Tag>
      </span>
    </div>
  );
}
