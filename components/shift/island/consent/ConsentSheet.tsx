"use client";

import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { Copy, Loader2 } from "lucide-react";

import { confirmAdult, requestParentLink } from "@/app/shift/island/consent-actions";
import { ISLAND_NOTICE } from "@/lib/shift-island/consent/notice";
import type { IslandConsent } from "@/lib/supabase/shift-quests/playerTypes";

import { thaiShortDate } from "../copy";
import island from "../island.module.css";
import { IslandSheet } from "../IslandSheet";
import styles from "./consent.module.css";
import { CONSENT } from "./copy";

type Path = "parent" | "adult";

interface ParentLink {
  url: string;
  expiresAt: string;
  emailed: boolean;
  /** Whether an address was typed, so a failed send can say so. */
  triedEmail: boolean;
}

/**
 * The student's consent sheet (founder ask 8). Until consent is ok the
 * student plays privately; this sheet offers the two ways through: a parent
 * agrees from a link the student sends them (copied to LINE, or emailed
 * once), or, at the adult age (consent.adultAge, from the database), the
 * student confirms their own age. No adult-student channel: the link goes
 * only to the student's own parent, and the parent's page shows only the
 * nickname typed here.
 */
export function ConsentSheet({ open, onClose, consent }: { open: boolean; onClose: () => void; consent: IslandConsent }) {
  // A confirmed age shows at once; the next consent from the page (after its refresh) takes over.
  const [override, setOverride] = useState<{ base: IslandConsent; value: IslandConsent } | null>(null);
  const shown = override && override.base === consent ? override.value : consent;
  return (
    <IslandSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={CONSENT.title}
      description={shown.ok ? undefined : CONSENT.description}
    >
      {shown.ok ? (
        <Granted consent={shown} onGranted={(value) => setOverride({ base: consent, value })} />
      ) : (
        <Pending consent={shown} onGranted={(value) => setOverride({ base: consent, value })} />
      )}
    </IslandSheet>
  );
}

function Granted({ consent, onGranted }: { consent: IslandConsent; onGranted: (consent: IslandConsent) => void }) {
  if (!consent.required && consent.state !== "granted") {
    return (
      <div className={styles.stack}>
        <p className={styles.status} data-tone="done">
          {CONSENT.granted.notRequired}
        </p>
      </div>
    );
  }
  return (
    <div className={styles.stack}>
      <section className={styles.section} aria-label={CONSENT.granted.heading}>
        <p className={styles.status} data-tone="done">
          {consent.basis ? CONSENT.granted.basis[consent.basis] : CONSENT.granted.heading}
        </p>
        <p className={styles.meanwhile}>{CONSENT.granted.open}</p>
      </section>
      <AiNews consent={consent} onGranted={onGranted} />
    </div>
  );
}

/**
 * The AI news line, separate from consent: an adult basis includes it; a
 * parent's consent (on the island or imported from SHIFT) needs the parent's
 * own tick, asked for with an AI link; an adult's SHIFT consent needs their
 * age confirmed on the island.
 */
function AiNews({ consent, onGranted }: { consent: IslandConsent; onGranted: (consent: IslandConsent) => void }) {
  const headingId = useId();
  if (consent.state !== "granted") return null;
  if (consent.ai) {
    return <p className={styles.meanwhile}>{CONSENT.granted.aiOn}</p>;
  }
  const byParent = consent.basis === "parent" || consent.basis === "shift_parent";
  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.heading}>
        {CONSENT.granted.aiHeading}
      </h3>
      <p className={styles.meanwhile}>{byParent ? CONSENT.granted.aiAddOn : CONSENT.granted.aiAddOnAdult(consent.adultAge)}</p>
      {byParent && consent.linkExpiresAt ? (
        <p className={styles.status} role="status">
          {CONSENT.granted.aiWaiting(thaiShortDate(consent.linkExpiresAt))}
        </p>
      ) : null}
      {byParent ? <ParentLinkForm consent={consent} /> : <AdultForm consent={consent} onGranted={onGranted} />}
    </section>
  );
}

function statusLine(consent: IslandConsent): string | null {
  switch (consent.state) {
    case "waiting":
      return CONSENT.status.waiting(thaiShortDate(consent.linkExpiresAt));
    case "declined":
      return CONSENT.status.declined;
    case "withdrawn":
      return CONSENT.status.withdrawn;
    default:
      return null;
  }
}

function Pending({ consent, onGranted }: { consent: IslandConsent; onGranted: (consent: IslandConsent) => void }) {
  const legendId = useId();
  const choiceName = useId();
  const [path, setPath] = useState<Path>("parent");
  const status = statusLine(consent);
  if (consent.parentSaidNo) {
    // A parent's no stands until staff reset it: no form here would be accepted.
    return (
      <div className={styles.stack}>
        {status ? (
          <p className={styles.status} role="status">
            {status}
          </p>
        ) : null}
        <p className={styles.meanwhile}>{CONSENT.status.saidNo}</p>
        {consent.state === "declined" ? <NoticeDetails /> : null}
      </div>
    );
  }
  const paths: [Path, string][] = [
    ["parent", CONSENT.parentPath],
    ["adult", CONSENT.adultPath(consent.adultAge)],
  ];
  return (
    <div className={styles.stack}>
      {status ? (
        <p className={styles.status} role="status">
          {status}
        </p>
      ) : null}
      <section className={styles.section} aria-labelledby={legendId}>
        <h3 id={legendId} className={styles.heading}>
          {CONSENT.unlocksHeading}
        </h3>
        <ul className={styles.list}>
          {CONSENT.unlocks.map((line) => (
            <li key={line} className={styles.listItem}>
              {line}
            </li>
          ))}
        </ul>
        <p className={styles.meanwhile}>{CONSENT.meanwhile}</p>
      </section>
      <NoticeDetails />
      <fieldset className={island.choices}>
        <legend className={island.label}>{CONSENT.pathLegend}</legend>
        {paths.map(([value, label]) => (
          <label key={value} className={island.choice} data-checked={path === value ? "true" : undefined}>
            <input
              type="radio"
              name={choiceName}
              value={value}
              checked={path === value}
              onChange={() => setPath(value)}
              className={island.choiceInput}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      {path === "parent" ? <ParentLinkForm consent={consent} /> : <AdultForm consent={consent} onGranted={onGranted} />}
    </div>
  );
}

/** The island notice, folded: what shows in public, what the AI news reads, and the rights. */
function NoticeDetails() {
  return (
    <details className={styles.details}>
      <summary className={styles.summary}>{CONSENT.notice}</summary>
      <ul className={styles.noticeRows} aria-label={ISLAND_NOTICE.title}>
        {ISLAND_NOTICE.rows.map((row) => (
          <li key={row.lead} className={styles.noticeRow}>
            <span className={styles.noticeEmoji} aria-hidden="true">
              {row.emoji}
            </span>
            <div>
              <p className={styles.noticeLead}>{row.lead}</p>
              {row.text ? <p className={styles.noticeText}>{row.text}</p> : null}
              {row.items ? (
                <ul className={styles.noticeItems}>
                  {row.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </details>
  );
}

/** The server's address check (consent-actions.ts), so a typo is caught before anything is sent. */
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

function ParentLinkForm({ consent }: { consent: IslandConsent }) {
  const nicknameId = useId();
  const emailId = useId();
  const linkId = useId();
  const linkRef = useRef<HTMLInputElement>(null);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<{ field: "nickname" | "email" | "form"; text: string } | null>(null);
  const [link, setLink] = useState<ParentLink | null>(null);
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const [pending, startTransition] = useTransition();
  const again = consent.state === "waiting" || consent.linkExpiresAt !== null || link !== null;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const name = nickname.trim();
    const address = email.trim();
    if (!name) return setError({ field: "nickname", text: CONSENT.errors.nickname });
    if (address && !EMAIL.test(address)) return setError({ field: "email", text: CONSENT.errors.email });
    setError(null);
    startTransition(async () => {
      const result = await requestParentLink({ nickname: name, parentEmail: address || null });
      if (result.ok) {
        setLink({ ...result.data, triedEmail: address.length > 0 });
        setCopy("idle");
        return;
      }
      const { code } = result;
      if (code === "consent_rate_limited") setError({ field: "form", text: CONSENT.errors.rateLimited });
      else if (code === "consent_not_needed") setError({ field: "form", text: CONSENT.errors.notNeeded });
      else if (code === "invalid_input") setError({ field: "nickname", text: CONSENT.errors.nickname });
      else setError({ field: "form", text: result.error || CONSENT.errors.failed });
    });
  }

  async function copyLink() {
    if (!link) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(link.url);
      setCopy("copied");
    } catch {
      setCopy("failed");
      linkRef.current?.focus();
      linkRef.current?.select();
    }
  }

  const fieldError = (field: "nickname" | "email") =>
    error?.field === field ? (
      <p id={`${field === "nickname" ? nicknameId : emailId}-error`} role="alert" className={island.fieldError}>
        {error.text}
      </p>
    ) : null;

  return (
    <section className={styles.section} aria-labelledby={`${nicknameId}-heading`}>
      <h3 id={`${nicknameId}-heading`} className={styles.heading}>
        {CONSENT.parent.heading}
      </h3>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <div className={island.field}>
          <label htmlFor={nicknameId} className={island.label}>
            {CONSENT.parent.nickname}
          </label>
          <p id={`${nicknameId}-hint`} className={island.hint}>
            {CONSENT.parent.nicknameHint}
          </p>
          <input
            id={nicknameId}
            className={`ei-input ${island.input}`}
            value={nickname}
            maxLength={40}
            autoComplete="nickname"
            aria-invalid={error?.field === "nickname" ? true : undefined}
            aria-describedby={`${nicknameId}-hint${error?.field === "nickname" ? ` ${nicknameId}-error` : ""}`}
            onChange={(event) => {
              setNickname(event.target.value);
              if (error?.field === "nickname") setError(null);
            }}
          />
          {fieldError("nickname")}
        </div>
        <div className={island.field}>
          <label htmlFor={emailId} className={island.label}>
            {CONSENT.parent.email}
          </label>
          <p id={`${emailId}-hint`} className={island.hint}>
            {CONSENT.parent.emailHint}
          </p>
          <input
            id={emailId}
            type="email"
            inputMode="email"
            className={`ei-input ${island.input}`}
            value={email}
            maxLength={254}
            autoComplete="off"
            aria-invalid={error?.field === "email" ? true : undefined}
            aria-describedby={`${emailId}-hint${error?.field === "email" ? ` ${emailId}-error` : ""}`}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error?.field === "email") setError(null);
            }}
          />
          {fieldError("email")}
        </div>
        {again ? <p className={styles.small}>{CONSENT.parent.againHint}</p> : null}
        <button type="submit" className={`ei-button-dawn ${island.primary}`} disabled={pending} aria-busy={pending}>
          {pending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
          <span>{pending ? CONSENT.parent.creating : again ? CONSENT.parent.createAgain : CONSENT.parent.create}</span>
        </button>
        {error?.field === "form" ? (
          <p role="alert" className={island.fieldError}>
            {error.text}
          </p>
        ) : null}
      </form>
      {link ? (
        <div className={styles.linkBox}>
          <label htmlFor={linkId} className={island.label}>
            {CONSENT.parent.linkLabel}
          </label>
          <input
            id={linkId}
            ref={linkRef}
            readOnly
            className={`ei-input ${island.input} ${styles.linkField}`}
            value={link.url}
            onFocus={(event) => event.currentTarget.select()}
          />
          <button type="button" className={island.quietButton} onClick={copyLink}>
            <Copy className="h-4 w-4" aria-hidden="true" />
            <span>{CONSENT.parent.copy}</span>
          </button>
          <div aria-live="polite">
            {copy === "copied" ? <p className={styles.copied}>{CONSENT.parent.copied}</p> : null}
            {copy === "failed" ? <p className={styles.small}>{CONSENT.parent.copyFallback}</p> : null}
          </div>
          <p className={styles.small}>{CONSENT.parent.expires(thaiShortDate(link.expiresAt))}</p>
          {link.triedEmail ? (
            <p className={styles.small}>{link.emailed ? CONSENT.parent.emailed : CONSENT.parent.emailFailed}</p>
          ) : null}
          <p className={styles.small}>{CONSENT.parent.forParent}</p>
        </div>
      ) : null}
    </section>
  );
}

/** Today in Thailand as YYYY-MM-DD, the latest birth date the picker offers. */
function bangkokToday(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function AdultForm({ consent, onGranted }: { consent: IslandConsent; onGranted: (consent: IslandConsent) => void }) {
  const birthId = useId();
  const [birthDate, setBirthDate] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return setError(CONSENT.errors.birthDate);
    if (!agreed) return setError(CONSENT.errors.agree);
    setError(null);
    startTransition(async () => {
      const result = await confirmAdult({ birthDate });
      if (result.ok) {
        onGranted(result.data);
        return;
      }
      const { code } = result;
      if (code === "consent_too_young") setError(CONSENT.errors.tooYoung(consent.adultAge));
      else if (code === "invalid_input" || code === "bad_input") setError(CONSENT.errors.birthDate);
      else setError(result.error || CONSENT.errors.failed);
    });
  }

  return (
    <section className={styles.section} aria-labelledby={`${birthId}-heading`}>
      <h3 id={`${birthId}-heading`} className={styles.heading}>
        {CONSENT.adultPath(consent.adultAge)}
      </h3>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <div className={island.field}>
          <label htmlFor={birthId} className={island.label}>
            {CONSENT.adult.birthDate}
          </label>
          <p id={`${birthId}-hint`} className={island.hint}>
            {CONSENT.adult.birthHint}
          </p>
          <input
            id={birthId}
            type="date"
            className={`ei-input ${island.input}`}
            value={birthDate}
            min="1900-01-02"
            max={bangkokToday()}
            aria-describedby={`${birthId}-hint`}
            onChange={(event) => {
              setBirthDate(event.target.value);
              if (error) setError(null);
            }}
          />
        </div>
        <label className={styles.agree}>
          <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
          <span>{CONSENT.adult.agree(consent.adultAge)}</span>
        </label>
        <button type="submit" className={`ei-button-dawn ${island.primary}`} disabled={pending} aria-busy={pending}>
          {pending ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" /> : null}
          <span>{pending ? CONSENT.adult.confirming : CONSENT.adult.confirm}</span>
        </button>
        {error ? (
          <p role="alert" className={island.fieldError}>
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
