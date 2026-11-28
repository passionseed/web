"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { EL, EL_FONT } from "@/components/hackathon/poster/elemental/brand";
import { ELEMENTAL } from "@/components/hackathon/poster/elemental/facts";
import { SIGNUP_SCREENS } from "@/lib/hackathon/elemental/funnel";
import { teamLabel } from "@/lib/hackathon/elemental/team-name";
import type { PublicTeam } from "@/lib/supabase/hackathon-event-registrations";

import { Arrow, Page, PrimaryButton, SecondaryButton, Tag, v } from "../share/ui";
import shell from "../share/shell.module.css";
import { trackElemental } from "../track";
import {
  STEPS,
  blurError,
  defaultMode,
  emptyDraft,
  firstInvalidStep,
  modeOf,
  registrationBody,
  restoredStep,
  stepForServerPath,
  validateStep,
  type BuddyPassOffer,
  type Draft,
  type Errors,
  type Mode,
  type StepKey,
} from "./draft";
import { EventSummary } from "./EventSummary";
import { LegalLine, STEP_VIEWS } from "./steps";
import styles from "./join.module.css";

/**
 * Elemental sign-up in three screens (28 Nov 2026): about you, contact (with
 * the parent for under-20s), review and agree. It starts on a team at the
 * group price; alone is one small link. Answers stay in this tab
 * (sessionStorage) until they're sent, so a refresh or a detour to LINE loses
 * nothing. The phone's back button steps back. Each screen sends one funnel
 * event (SIGNUP_SCREENS), so the admin page shows where people stop.
 *
 * Looks like the rest of Elemental: the cream "paper" page (share/ui.tsx Page) that the pay
 * page continues, the ink top bar with "← Elemental", a hairline progress meter with [1/3],
 * and each screen's one primary action in a bar pinned to the bottom of a phone, with "back"
 * beside it. From 1024px the form sits beside a summary of the event (EventSummary) and the
 * bar sits under the form.
 */

type Props = {
  source?: string;
  utm?: Record<string, string>;
  team?: PublicTeam;
  buddyPass?: BuddyPassOffer;
  /** Shown above the first screen, e.g. "this team is full". */
  notice?: string;
  backHref: string;
  /** Development and PR previews only: fake the submit, send no funnel events, and open the demo pay page instead. */
  demo?: boolean;
};

/** step is a string: drafts saved by the one-question-a-screen form hold its old screen names. */
type Saved = { draft: Draft; step: string };

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
  const initialMode = defaultMode({ team: Boolean(team), buddyPass: Boolean(buddyPass) });
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(initialMode));
  const [step, setStep] = useState<StepKey>("about");
  const [dir, setDir] = useState<"forward" | "back">("forward");
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof Draft, boolean>>>({});
  /** Set while fixing one answer from the review: "save" goes straight back there. */
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const shaker = useRef<HTMLDivElement>(null);
  /** Screens this tab pushed onto history; when 0 (e.g. after a refresh), "back" steps back in place. */
  const pushed = useRef(0);

  const index = STEPS.indexOf(step);
  const mode = modeOf(draft);

  // Restore this tab's answers once, after hydration.
  useEffect(() => {
    const saved = load(team, buddyPass);
    // A draft from the old form may have no mode (it was picked on its first screen): start on the default.
    const restoredDraft = saved ? { ...emptyDraft(initialMode), ...saved.draft, mode: saved.draft.mode ?? initialMode } : null;
    const first = restoredDraft ? restoredStep(saved?.step, restoredDraft) : "about";
    if (restoredDraft) {
      setDraft(restoredDraft);
      setStep(first);
    }
    window.history.replaceState({ ...window.history.state, elStep: first }, "");
    setRestored(true);
    track({ step: "join", source, mode: restoredDraft?.mode ?? initialMode });
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

  // Count each screen once, and put the cursor in its first box.
  useEffect(() => {
    if (!restored) return;
    track({ step: SIGNUP_SCREENS[step], mode, source });
    if (step === "review") setEditing(false);
    const el = body.current?.querySelector<HTMLElement>("[data-autofocus]");
    // On a phone the keyboard would cover the screen, so only a friend's link (its first box is the
    // first thing to do) focuses there; with a mouse every screen does.
    const invited = step === "about" && (mode === "join" || mode === "buddy");
    if (el && (invited || window.matchMedia("(hover: hover)").matches)) el.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, restored]);

  // The phone's back button walks back through the screens.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const saved = e.state?.elStep as string | undefined;
      const target = saved && (STEPS as readonly string[]).includes(saved) ? (saved as StepKey) : "about";
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

  /** A box lost focus: check what was typed in it now, not only at "next". */
  const blur = useCallback(
    (field: keyof Draft) => {
      setTouched((t) => (t[field] ? t : { ...t, [field]: true }));
      const error = blurError(field, draft);
      setErrors((e) => {
        if (error === e[field]) return e;
        const next = { ...e };
        if (error) next[field] = error;
        else delete next[field];
        return next;
      });
    },
    [draft],
  );

  const setMode = useCallback((m: Mode) => set({ mode: m }), [set]);

  const goTo = useCallback((target: StepKey, direction: "forward" | "back" = "forward") => {
    setDir(direction);
    setErrors({});
    setStep(target);
    window.history.pushState({ ...window.history.state, elStep: target }, "");
    pushed.current += 1;
  }, []);

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
    // Sent on "next" only (not on a box losing focus), so "got stuck on" counts what it always counted.
    track({ step: "invalid", detail: Object.keys(found).join(","), mode }, { once: false });
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
        router.push(`/hackathon/join/demo?state=pending&mode=${mode}`);
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
        track({ step: "submitted", mode, source });
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
    goTo(STEPS[index + 1]);
  };

  const edit = (target: StepKey) => {
    setEditing(true);
    goTo(target, "back");
  };

  const back = () => {
    if (pushed.current > 0) return window.history.back();
    const previous = STEPS[index - 1];
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
  const detour = editing && STEPS.slice(index + 1).some((s) => s !== "review" && Object.keys(validateStep(s, draft)).length > 0);
  const View = STEP_VIEWS[step];
  const cta = buttonLabel(step, mode, editing && !detour, team?.name);

  return (
    <form onSubmit={onSubmit} noValidate>
      <Page surface="paper" back={{ href: backHref, label: ELEMENTAL.edition }} wide="split" mobileBar>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-12 xl:grid-cols-[minmax(0,36rem)_24rem] xl:justify-between">
          <div className="min-w-0">
            <ProgressMeter index={index} total={STEPS.length} />
            {notice && step === "about" && (
              <p className="mb-8 border-l-2 py-1 pl-4 text-pretty" style={{ borderColor: EL.flame, fontFamily: EL_FONT.body, fontSize: 16, lineHeight: "26px" }}>
                {notice}
              </p>
            )}
            {/* At least a screen tall on a phone, so the wordmark footer starts under the pinned bar, not cut by it. */}
            <div key={step} ref={body} className={`${dir === "forward" ? styles.flowIn : styles.flowBack} min-h-[calc(100dvh-15rem)] lg:min-h-0`}>
              <div ref={shaker}>
                <View
                  draft={draft}
                  set={set}
                  blur={blur}
                  errors={errors}
                  touched={touched}
                  team={team}
                  buddyPass={buddyPass}
                  setMode={setMode}
                  goTo={edit}
                  demo={demo}
                />
              </div>
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
            <ActionBar>
              {step === "review" && <LegalLine />}
              <div className="flex items-stretch gap-2">
                {index > 0 && (
                  <SecondaryButton onClick={back} className="w-[52px] shrink-0 !px-0" aria-label="ย้อนกลับ">
                    <Arrow dir="left" weight="bold" />
                  </SecondaryButton>
                )}
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
              </div>
            </ActionBar>
          </div>
          {/* Stays in view while the form scrolls, when the screen is tall enough to show all of it. */}
          <EventSummary mode={mode} className="hidden lg:block [@media(min-height:820px)]:sticky [@media(min-height:820px)]:top-24" />
        </div>
      </Page>
    </form>
  );
}

/**
 * The screen's one primary action: pinned to the bottom of a phone (clear of the home bar,
 * solid cream so the footer wordmark doesn't show through), and under the form from lg.
 */
function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${shell.stickyBar} fixed inset-x-0 bottom-0 z-40 border-t px-5 pt-3 sm:px-8 lg:static lg:z-auto lg:mt-10 lg:border-t-0 lg:!p-0`}
      style={{ backgroundColor: EL.cream, borderColor: v.rule }}
    >
      <div className="mx-auto max-w-xl lg:mx-0 lg:max-w-none">{children}</div>
    </div>
  );
}

/** Where you are: a hairline that fills in flame, and the count as a Space Mono [1/3]. */
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
