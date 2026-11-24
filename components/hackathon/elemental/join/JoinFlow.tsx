"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { teamLabel } from "@/lib/hackathon/elemental/team-name";
import type { PublicTeam } from "@/lib/supabase/hackathon-event-registrations";

import { RecoveringPlace } from "../RecoveringPlace";
import { trackElemental } from "../track";
import {
  emptyDraft,
  firstInvalidStep,
  registrationBody,
  stepForServerPath,
  stepsFor,
  validateStep,
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
 */

type Props = {
  source?: string;
  utm?: Record<string, string>;
  team?: PublicTeam;
  /** Shown above the first step, e.g. "this team is full". */
  notice?: string;
  backHref: string;
  /** Dev only: fake the submit and open the demo pay page instead. */
  demo?: boolean;
};

type Saved = { draft: Draft; step: StepKey };

const storageKey = (team?: PublicTeam) => `elemental-join:${team?.inviteCode ?? "new"}`;

function load(team?: PublicTeam): Saved | null {
  try {
    const raw = sessionStorage.getItem(storageKey(team));
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

const SERVER_ERRORS: Record<string, string> = {
  closed: "ปิดรับสมัครแล้ว",
  team_full: `ทีมนี้ครบ ${ELEMENTAL.maxGroupSize} คนแล้ว สมัครคนเดียวหรือสร้างทีมใหม่ได้`,
  team_not_found: "ไม่เจอทีมนี้ ขอลิงก์ใหม่จากเพื่อน หรือสมัครคนเดียวก่อน",
};

function buttonLabel(step: StepKey, mode: Mode, saving: boolean, teamName = ""): string {
  if (step !== "review") return saving ? "บันทึก" : "ต่อไป";
  if (mode === "create") return "สร้างทีมและสมัคร";
  if (mode === "join") return `เข้า${teamLabel(teamName)}`;
  return "สมัคร";
}

export function JoinFlow({ source, utm, team, notice, backHref, demo }: Props) {
  const router = useRouter();
  const initialMode: Mode | null = team ? "join" : null;
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
  const progress = (index + 1) / steps.length;

  // Restore this tab's answers once, after hydration.
  useEffect(() => {
    const saved = load(team);
    if (saved) {
      setDraft({ ...emptyDraft(initialMode), ...saved.draft });
      setStep(saved.step);
    }
    window.history.replaceState({ ...window.history.state, elStep: saved?.step ?? "mode" }, "");
    setRestored(true);
    trackElemental({ step: "join", source, mode: initialMode ?? undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(storageKey(team), JSON.stringify({ draft, step } satisfies Saved));
    } catch {
      // Private mode: the flow still works, it just won't survive a refresh.
    }
  }, [draft, step, restored, team]);

  // Count each step once, and put the cursor in its first box.
  useEffect(() => {
    if (!restored) return;
    trackElemental({ step: `step:${step}`, mode: draft.mode ?? undefined, source });
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
      el.classList.remove(styles.shake);
      void el.offsetWidth;
      el.classList.add(styles.shake);
    }
    // After the errors render: bring the first one into view and, if it's a box, open the keyboard on it.
    requestAnimationFrame(() => {
      const bad = body.current?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]');
      if (!bad) return;
      bad.scrollIntoView({ block: "center", behavior: "smooth" });
      if (bad instanceof HTMLInputElement) bad.focus({ preventScroll: true });
    });
    trackElemental({ step: "invalid", detail: Object.keys(found).join(","), mode: draft.mode ?? undefined }, { once: false });
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
        sessionStorage.removeItem(storageKey(team));
        router.push(`/hackathon/join/demo?state=pending&mode=${draft.mode ?? "solo"}`);
        return;
      }
      const res = await fetch("/api/hackathon/elemental/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationBody(draft, team?.inviteCode, source, utm)),
      });
      const data = (await res.json().catch(() => ({}))) as {
        payToken?: string;
        error?: string;
        issues?: { path: (string | number)[] }[];
      };
      if (res.ok && data.payToken) {
        trackElemental({ step: "submitted", mode: draft.mode ?? undefined, source });
        sessionStorage.removeItem(storageKey(team));
        router.push(`/hackathon/join/${data.payToken}`);
        return; // keep the spinner until the pay page opens
      }
      trackElemental({ step: "submit_failed", detail: data.error ?? String(res.status) }, { once: false });
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
    const target: StepKey = mode === "create" ? "team" : editing ? (firstInvalidStep(after) ?? "review") : "name";
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
  const showContinue = step !== "mode" || (draft.mode !== null && !(team && draft.mode === "join"));
  const cta = buttonLabel(step, draft.mode ?? "solo", editing && !detour, team?.name);

  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-[100dvh] flex-col">
      <div className="sticky top-0 z-10" style={{ backgroundColor: EL.cream }}>
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-5 py-4">
          {isFirst ? (
            <Link href={backHref} className="inline-flex items-center gap-2 text-sm" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}>
              <ArrowLeft className="h-4 w-4" /> {ELEMENTAL.edition}
            </Link>
          ) : (
            <button
              type="button"
              onClick={back}
              className="inline-flex items-center gap-2 text-sm"
              style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }}
            >
              <ArrowLeft className="h-4 w-4" /> ย้อนกลับ
            </button>
          )}
          {/* The total depends on the first answer, so it shows from step 2 on. */}
          {!isFirst && (
            <span className="text-xs" style={{ fontFamily: EL_FONT.mono, color: EL.inkSoft }} aria-live="polite">
              {index + 1}/{steps.length}
            </span>
          )}
        </div>
        <div className="h-[3px] w-full" style={{ backgroundColor: "rgba(29,33,31,0.08)" }}>
          <div
            className={`${styles.progress} h-full`}
            style={{ width: `${progress * 100}%`, backgroundColor: EL.flame }}
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={index + 1}
            aria-label="ความคืบหน้าการสมัคร"
          />
        </div>
      </div>

      <div className="mx-auto w-full max-w-xl flex-1 px-5 pb-36 pt-6 sm:pt-10">
        {/* Before and after: washed out here, in full colour on the paid seat. */}
        {step === "mode" && <RecoveringPlace restored={0.25} className="mb-8 sm:mb-10" />}
        {notice && step === "mode" && (
          <p className="mb-6 rounded-xl p-4 text-sm" style={{ backgroundColor: "rgba(236,100,36,0.08)" }}>
            {notice}
          </p>
        )}
        <div key={step} ref={body} className={dir === "forward" ? styles.stepForward : styles.stepBack}>
          <div ref={shaker}>
            <View draft={draft} set={set} errors={errors} team={team} choose={choose} goTo={edit} />
          </div>
        </div>
        {serverError && (
          <p role="alert" className="mt-6 rounded-xl p-4 text-sm" style={{ backgroundColor: "rgba(184,48,26,0.08)", color: EL.ember }}>
            {serverError}
          </p>
        )}
      </div>

      {showContinue && (
        <div
          className="fixed inset-x-0 bottom-0 z-10 border-t px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4"
          style={{ backgroundColor: "rgba(243,239,230,0.94)", borderColor: "rgba(29,33,31,0.08)", backdropFilter: "blur(8px)" }}
        >
          <div className="mx-auto max-w-xl">
            {step === "review" && <LegalLine />}
            <button
              type="submit"
              disabled={submitting}
              className={`${styles.choice} inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-4 text-lg font-semibold disabled:opacity-70`}
              style={{ backgroundColor: EL.flame, color: EL.flameWhite }}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" /> กำลังสมัคร
                </>
              ) : (
                <>
                  {cta} {step !== "review" && (!editing || detour) && <ArrowRight className="h-5 w-5" />}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
