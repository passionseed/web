"use client";

import { useId, useState, useTransition, type ReactNode } from "react";
import { CircleCheck, Loader2 } from "lucide-react";

import { answerIslandParent, withdrawIslandParent } from "@/app/shift/island/parent/actions";
import { FLOW_TEXT, flowButtonClass, flowFieldClass, flowPanelClass } from "@/components/shift/join/shiftFlowInk";
import { INK } from "@/components/shift/poster/riso";
import { PARENT_RELATIONSHIPS } from "@/lib/shift/parentConsent";

import { ISLAND_PARENT } from "./copy";

const linkButtonClass = "min-h-12 text-sm font-semibold underline underline-offset-4";

/** "kept": an AI-line link answered no; the consent given earlier stays as it was. */
export type IslandParentDecision = "agreed" | "declined" | "withdrawn" | "kept";
type Relationship = (typeof PARENT_RELATIONSHIPS)[number];

/**
 * The parent's answer for SHIFT High Island, same pattern as the SHIFT
 * parent form: the typed full name, relationship and tick are the
 * electronic signature (Electronic Transactions Act s.9), stored with the
 * time, IP and browser. The AI island news is a separate, optional tick.
 * Shows only the nickname the student typed. With `aiOnly` the student
 * already has consent (a parent agreed earlier, on the island or in SHIFT)
 * and the link asks for the AI news line: "not now" keeps everything else
 * as it was.
 */
export function IslandParentForm({
  token,
  decision: initialDecision,
  nickname,
  aiOnly = false,
  children,
}: {
  token: string;
  decision: IslandParentDecision | null;
  nickname: string;
  aiOnly?: boolean;
  /** The notice, shown above the form and folded away once answered. */
  children?: ReactNode;
}) {
  const nameId = useId();
  const [decision, setDecision] = useState<IslandParentDecision | null>(initialDecision);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<Relationship | "">("");
  const [confirmed, setConfirmed] = useState(false);
  const [ai, setAi] = useState(false);
  const [agreedAi, setAgreedAi] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(agree: boolean) {
    if (pending) return;
    if (name.trim().length < 2) return setError(ISLAND_PARENT.errors.name);
    if (!relationship) return setError(ISLAND_PARENT.errors.relationship);
    if (agree && !confirmed) return setError(ISLAND_PARENT.errors.confirm);
    setError(null);
    startTransition(async () => {
      const result = await answerIslandParent({ token, agree, ai: agree && ai, parentName: name, relationship, confirmed });
      if (result.ok) {
        setAgreedAi(agree && ai);
        setDecision(agree ? "agreed" : aiOnly ? "kept" : "declined");
      } else {
        setError(result.error);
      }
    });
  }

  function withdraw() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await withdrawIslandParent(token);
      if (result.ok) setDecision("withdrawn");
      else setError(result.error);
    });
  }

  const errorText = error && (
    <p className="text-sm font-semibold" style={{ color: FLOW_TEXT.warn }} role="alert">
      {error}
    </p>
  );

  if (decision) {
    const done: Record<IslandParentDecision, string> = {
      agreed: agreedAi ? ISLAND_PARENT.done.agreedAi : ISLAND_PARENT.done.agreed,
      declined: ISLAND_PARENT.done.declined(nickname),
      withdrawn: ISLAND_PARENT.done.withdrawn,
      kept: ISLAND_PARENT.done.kept(nickname),
    };
    return (
      <div className="space-y-6">
        <p
          className="flex items-center gap-3 text-[17px] font-semibold leading-relaxed"
          style={{ color: FLOW_TEXT.body }}
          role="status"
        >
          {decision === "agreed" && <CircleCheck className="h-6 w-6 shrink-0" style={{ color: INK.yellow }} aria-hidden="true" />}
          {done[decision]}
        </p>
        {children && (
          <details className="text-sm leading-relaxed" style={{ color: FLOW_TEXT.muted }}>
            <summary className="min-h-12 cursor-pointer py-3 font-semibold">{ISLAND_PARENT.readAgain}</summary>
            <div className="space-y-6 pt-3">{children}</div>
          </details>
        )}
        {decision === "agreed" && (
          <div>
            <p className="text-sm leading-relaxed" style={{ color: FLOW_TEXT.muted }}>
              {ISLAND_PARENT.withdrawHint}
            </p>
            <button
              type="button"
              onClick={withdraw}
              disabled={pending}
              aria-busy={pending}
              className={linkButtonClass}
              style={{ color: FLOW_TEXT.muted }}
            >
              {ISLAND_PARENT.withdraw}
            </button>
          </div>
        )}
        {decision === "declined" && (
          <button
            type="button"
            onClick={() => setDecision(null)}
            className={linkButtonClass}
            style={{ color: FLOW_TEXT.muted }}
          >
            {ISLAND_PARENT.changeMind}
          </button>
        )}
        {errorText}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {children}
      <div className="space-y-2">
        <label htmlFor={nameId} className="sr-only">
          {ISLAND_PARENT.name}
        </label>
        <input
          id={nameId}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={ISLAND_PARENT.name}
          autoComplete="name"
          maxLength={120}
          className={`${flowFieldClass} min-h-12 px-4 py-3 text-base`}
        />
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={ISLAND_PARENT.relationship(nickname)}>
        {PARENT_RELATIONSHIPS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRelationship(r)}
            aria-pressed={relationship === r}
            className="min-h-12 rounded-full px-5 text-[15px] font-semibold"
            style={
              relationship === r
                ? { backgroundColor: INK.paper, color: INK.black, boxShadow: `2px 2px 0 0 ${INK.pink}` }
                : { color: FLOW_TEXT.strong, boxShadow: "inset 0 0 0 1.5px rgba(242,234,217,0.5)" }
            }
          >
            {r}
          </button>
        ))}
      </div>
      <label
        className={`${flowPanelClass} flex min-h-12 cursor-pointer items-start gap-3 p-4 text-[15px] leading-relaxed`}
        style={{ color: FLOW_TEXT.body }}
      >
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#ffe800]"
        />
        <span>{ISLAND_PARENT.confirm(nickname)}</span>
      </label>
      <label
        className={`${flowPanelClass} flex min-h-12 cursor-pointer items-start gap-3 p-4 text-[15px] leading-relaxed`}
        style={{ color: FLOW_TEXT.body }}
      >
        <input
          type="checkbox"
          checked={ai}
          onChange={(event) => setAi(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[#ffe800]"
        />
        <span>{ISLAND_PARENT.ai(nickname)}</span>
      </label>
      <button
        type="button"
        onClick={() => decide(true)}
        disabled={pending || !confirmed}
        aria-busy={pending}
        className={flowButtonClass}
      >
        {pending && <Loader2 className="h-5 w-5 motion-safe:animate-spin" aria-hidden="true" />}
        {ISLAND_PARENT.agree}
      </button>
      <button
        type="button"
        onClick={() => decide(false)}
        disabled={pending}
        className={flowButtonClass}
        data-variant="quiet"
      >
        {aiOnly ? ISLAND_PARENT.aiOnly.decline : ISLAND_PARENT.decline}
      </button>
      {errorText}
    </div>
  );
}
