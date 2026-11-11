"use client";

/**
 * EvidenceMaker (tonight): one practice-room card, a checklist, and a
 * write-up builder that outputs Markdown on the device. Drafts stay in
 * GuideState.local (never uploaded).
 * demo parts: `room`, `check-<i>`, `field-<id>`, `copy`.
 * Milestones: `checklist` (value = items ticked), `copied`.
 * Done (on copy) value: items ticked. Room link fires cta_click `first-step`.
 */
import { useEffect, useRef, useState } from "react";
import type { EngineProps, Json } from "@/lib/radar-guide/guide-types";
import { buildWriteupMarkdown, copyText, localIsoDate } from "@/lib/radar-guide/games/evidence";
import { proofLabels } from "@/lib/radar-guide/games/recap";
import { useEngineStore } from "./engine-context";
import { EngineFrame, Feedback, ScoreHud, demoId, useGameOutcome } from "./engine-shell";

type Drafts = Record<string, Record<string, string>>;

function readDrafts(local: Record<string, Json | undefined> | undefined): Drafts {
  const d = local?.drafts;
  return d && typeof d === "object" && !Array.isArray(d) ? (d as unknown as Drafts) : {};
}

export default function EvidenceMaker(props: EngineProps<"EvidenceMaker">) {
  const { data, blockId, pageKey, tracker, reducedMotion, skipped } = props;
  const outcome = useGameOutcome(props);
  const store = useEngineStore();
  const { state } = store;
  const checklistKey = `${pageKey}:${blockId}`;
  const checks = data.checklistTh.map((_, i) => Boolean(state.checklist?.[checklistKey]?.[i]));
  const drafts = readDrafts(state.local);
  const values = drafts[blockId] ?? {};
  const [copyState, setCopyState] = useState<"idle" | "copied" | "fallback">("idle");
  const fallbackRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (copyState !== "fallback") return;
    const el = fallbackRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [copyState]);

  const toggleCheck = (i: number) => {
    const next = checks.map((c, j) => (j === i ? !c : c));
    store.dispatch({ type: "checklist", key: checklistKey, values: next });
    if (next[i]) outcome.milestone("checklist", next.filter(Boolean).length);
  };

  const setField = (id: string, value: string) => {
    store.dispatch({
      type: "local",
      patch: { drafts: { ...drafts, [blockId]: { ...values, [id]: value } } as unknown as Json },
    });
  };

  const proof = data.includeProofFrom ? proofLabels(state) : [];
  const markdown = buildWriteupMarkdown({
    roomTitle: data.room.titleTh,
    date: localIsoDate(),
    fields: data.fields.map((f) => ({ label: f.placeholderTh, value: values[f.id] ?? "" })),
    fixedLines: data.fixedLinesTh,
    proof,
  });

  const onCopy = async () => {
    const result = await copyText(markdown);
    setCopyState(result);
    outcome.milestone("copied");
    store.dispatch({ type: "choice", key: `${pageKey}:copied`, value: "1" });
    const ticked = checks.filter(Boolean).length;
    outcome.finish({ done: true, score: ticked, total: data.checklistTh.length, ms: outcome.elapsed() }, ticked);
  };

  const ticked = checks.filter(Boolean).length;

  return (
    <EngineFrame
      engine="EvidenceMaker"
      blockId={blockId}
      tagTh="ภารกิจคืนนี้"
      status={copyState !== "idle" ? "clear" : skipped ? "solved" : "play"}
      reducedMotion={reducedMotion}
      hud={<ScoreHud label="QUEST" value={ticked} total={data.checklistTh.length} />}
    >
      <div className="rg-room">
        <p className="rg-room__title">{data.room.titleTh}</p>
        <p className="rg-game__badge">{data.room.badgeTh}</p>
        <p className="rg-room__sub">{data.room.subTh}</p>
        <a
          className="rg-px-btn rg-px-btn--accent rg-px-btn--wide"
          href={data.room.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => tracker.track({ type: "cta_click", pageKey, target: "first-step" })}
          data-demo={demoId(blockId, "room")}
        >
          เริ่มเลย
        </a>
      </div>

      <ul className="rg-quest" aria-label="เช็กลิสต์">
        {data.checklistTh.map((line, i) => (
          <li key={i}>
            <label className="rg-quest__item" data-done={checks[i] ? "" : undefined}>
              <input
                type="checkbox"
                checked={checks[i]}
                onChange={() => toggleCheck(i)}
                data-demo={demoId(blockId, `check-${i}`)}
              />
              <span className="rg-quest__box" aria-hidden>
                {checks[i] ? "✓" : ""}
              </span>
              <span>{line}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="rg-writeup">
        {data.fields.map((f) => (
          <label key={f.id} className="rg-writeup__field">
            <span className="rg-writeup__label">{f.placeholderTh}</span>
            <textarea
              rows={2}
              value={values[f.id] ?? ""}
              placeholder={f.placeholderTh}
              onChange={(e) => setField(f.id, e.target.value)}
              data-demo={demoId(blockId, `field-${f.id}`)}
            />
          </label>
        ))}
        {proof.length ? (
          <div className="rg-writeup__plan">
            <p className="rg-game__prompt">แผนของฉัน</p>
            <ul>
              {proof.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {data.fixedLinesTh.map((line) => (
          <p key={line} className="rg-writeup__fixed">
            {line}
          </p>
        ))}
        <button type="button" className="rg-px-btn rg-px-btn--accent rg-px-btn--wide" onClick={onCopy} data-demo={demoId(blockId, "copy")}>
          คัดลอก write-up
        </button>
        {copyState === "copied" ? (
          <Feedback tone="good" reducedMotion={reducedMotion}>
            คัดลอกแล้ว วางใน Notion, Google Docs หรือ README ได้เลย
          </Feedback>
        ) : null}
        {copyState === "fallback" ? (
          <>
            <Feedback tone="info" reducedMotion={reducedMotion}>
              กดค้างที่ข้อความด้านล่างเพื่อคัดลอก
            </Feedback>
            <textarea ref={fallbackRef} className="rg-writeup__out" readOnly value={markdown} rows={10} aria-label="write-up สำหรับคัดลอก" />
          </>
        ) : null}
        <p className="rg-game__fine">{data.privacyTh}</p>
      </div>
    </EngineFrame>
  );
}
